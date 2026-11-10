// Blocks risky git operations on protected branches in Sumitsubo projects.
import { resolve } from 'node:path';
import { readInput, projectRoot, loadConfig, currentBranch, decide } from './lib.mjs';

const input = readInput();
const command = String(input.tool_input?.command ?? '');
if (!/\bgit\b/.test(command)) process.exit(0);

const baseRoot = projectRoot(input);
// ponytail: a tokenizer, not a shell parser. Splitting on separators, subshell parens and backticks, then
// dropping quote characters per token, lets `bash -c "git push origin main"`, eval and $(...) reach the
// same check. It does not expand variables, aliases, heredocs or git hidden in a script file; extend when
// a real bypass shows up.
const segments = command.split(/&&|\|\||[;|&\n()`]/).map((s) => s.trim()).filter(Boolean);

// Per segment: the repo dir (every `-C` applied) and the args from the subcommand on, git's global options skipped.
function parse(segment) {
  const toks = (segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((t) => t.replace(/^["']+|["']+$/g, ''));
  const at = toks.findIndex((t) => t === 'git' || /^git\s/.test(t));
  if (at < 0) return null;
  if (toks[at] !== 'git') return parse(toks.slice(at).join(' ')); // quoted string handed to bash -c / eval
  let root = baseRoot;
  let i = at + 1;
  while (i < toks.length && toks[i].startsWith('-')) {
    if (toks[i] === '-C') root = resolve(root, toks[i + 1] ?? '.');
    i += ['-c', '-C', '--git-dir', '--work-tree', '--namespace'].includes(toks[i]) ? 2 : 1;
  }
  return { root, s: toks.slice(i).join(' ') };
}

let createdBranch = false;
for (const segment of segments) {
  const parsed = parse(segment);
  if (!parsed) continue;
  const { root, s } = parsed;
  const config = loadConfig(root);
  if (!config) continue;
  const protectedBranches = config.protectedBranches ?? ['main', 'master'];
  const branch = currentBranch(root);

  if (/^(switch\s+(-c|--create|-C)|checkout\s+-[bB])\s/.test(s)) createdBranch = true;

  if (/^push\b/.test(s)) {
    const args = s.replace(/^push\b/, '').trim().split(/\s+/).filter(Boolean);
    const flags = args.filter((a) => a.startsWith('-'));
    const positional = args.filter((a) => !a.startsWith('-'));
    const refspecs = positional.slice(1);
    const deleting = flags.some((f) => f === '--delete' || /^-[a-z]*d/.test(f)) || refspecs.some((r) => r.startsWith(':'));
    const bulk = flags.some((f) => ['--tags', '--follow-tags', '--all', '--mirror'].includes(f));
    let targets = refspecs.map((r) => r.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, '').replace(/^HEAD$/, branch));
    if (targets.length === 0 && !bulk && !deleting) targets = createdBranch ? [] : [branch];
    const hit = targets.find((t) => protectedBranches.includes(t));
    if (hit && deleting) decide('deny', `sumi guard: deleting protected branch "${hit}" on the remote is blocked.`);
    if (hit) decide('deny', `sumi guard: pushing to protected branch "${hit}" is blocked. Push a feature branch and open a PR instead.`);
    if (flags.includes('--mirror')) decide('ask', 'sumi guard: git push --mirror overwrites every ref on the remote. Confirm to continue.');
    const forced = flags.some((f) => f === '--force' || /^-[a-z]*f/.test(f)) || refspecs.some((r) => r.startsWith('+'));
    if (forced && !flags.some((f) => f.startsWith('--force-with-lease'))) {
      decide('ask', 'sumi guard: force push detected. Prefer --force-with-lease. Confirm to continue.');
    }
  }

  if (/^commit\b/.test(s) && !createdBranch && config.requireFeatureBranch !== false && branch && protectedBranches.includes(branch)) {
    decide('deny', `sumi guard: committing directly on "${branch}" is blocked. Create a branch first: git switch -c feat/<slug>`);
  }

  if (
    /^(reset\s+--hard|clean\b(?=.*\s-[a-z]*f)|checkout\s+(--\s+)?\.(\s|$)|restore\s+(?!--staged\b)\S|stash\s+(clear|drop)|branch\s+-D\b)/.test(s)
  ) {
    decide('ask', 'sumi guard: this git command discards local work irreversibly. Confirm to continue.');
  }
}

process.exit(0);
