// Blocks risky git operations on protected branches in forge projects.
import { resolve } from 'node:path';
import { readInput, projectRoot, loadConfig, currentBranch, decide } from './lib.mjs';

const input = readInput();
const command = String(input.tool_input?.command ?? '');
if (!/\bgit\b/.test(command)) process.exit(0);

const baseRoot = projectRoot(input);
const segments = command.split(/&&|\|\||;|\|/).map((s) => s.trim()).filter(Boolean);
const gitSegments = segments.filter((s) => /\bgit\b/.test(s));

// Resolve `git -C <dir>` so the right repository's config and branch are checked.
function repoFor(segment) {
  const m = segment.match(/\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/);
  return m ? resolve(baseRoot, m[1].replace(/^["']|["']$/g, '')) : baseRoot;
}
function sub(segment) {
  return segment.replace(/^.*?\bgit\s+(-C\s+("[^"]+"|'[^']+'|\S+)\s+)?/, '');
}

let createdBranch = false;
for (const segment of gitSegments) {
  const root = repoFor(segment);
  const config = loadConfig(root);
  if (!config) continue;
  const protectedBranches = config.protectedBranches ?? ['main', 'master'];
  const branch = currentBranch(root);
  const s = sub(segment);

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
    if (hit && deleting) decide('deny', `forge guard: deleting protected branch "${hit}" on the remote is blocked.`);
    if (hit) decide('deny', `forge guard: pushing to protected branch "${hit}" is blocked. Push a feature branch and open a PR instead.`);
    if (flags.includes('--mirror')) decide('ask', 'forge guard: git push --mirror overwrites every ref on the remote. Confirm to continue.');
    const forced = flags.some((f) => f === '--force' || /^-[a-z]*f/.test(f)) || refspecs.some((r) => r.startsWith('+'));
    if (forced && !flags.some((f) => f.startsWith('--force-with-lease'))) {
      decide('ask', 'forge guard: force push detected. Prefer --force-with-lease. Confirm to continue.');
    }
  }

  if (/^commit\b/.test(s) && !createdBranch && config.requireFeatureBranch !== false && branch && protectedBranches.includes(branch)) {
    decide('deny', `forge guard: committing directly on "${branch}" is blocked. Create a branch first: git switch -c feat/<slug>`);
  }

  if (
    /^(reset\s+--hard|clean\b(?=.*\s-[a-z]*f)|checkout\s+(--\s+)?\.(\s|$)|restore\s+(?!--staged\b)\S|stash\s+(clear|drop)|branch\s+-D\b)/.test(s)
  ) {
    decide('ask', 'forge guard: this git command discards local work irreversibly. Confirm to continue.');
  }
}

process.exit(0);
