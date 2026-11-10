// Blocks risky git operations on protected branches in Sumitsubo projects.
import { resolve } from 'node:path';
import { readInput, projectRoot, loadConfig, currentBranch, decide } from './lib.mjs';

const input = readInput();
const command = String(input.tool_input?.command ?? '');
if (!/\bgit\b/.test(command)) process.exit(0);

const baseRoot = projectRoot(input);
// ponytail: a tokenizer, not a shell parser. It drops heredoc bodies, splits on separators outside quotes,
// descends into $(...), backticks, `bash|sh|zsh -c` and `eval`, and matches git by basename. It does not
// expand variables, aliases or git hidden in a script file; extend when a real bypass shows up.
function stripHeredocs(text) {
  const out = [];
  let end = null;
  for (const line of text.split('\n')) {
    if (end !== null) {
      if (line.trim() === end) end = null;
      continue;
    }
    out.push(line);
    end = line.match(/(?<!<)<<(?!<)-?\s*["']?(\w+)/)?.[1] ?? null;
  }
  return out.join('\n');
}

// Appends each simple command (as unquoted tokens) to `out`; returns the index where it stopped.
function scan(s, out, i = 0, close = null) {
  let toks = [], cur = null, q = null;
  const word = () => { if (cur !== null) toks.push(cur); cur = null; };
  const end = () => { word(); if (toks.length) out.push(toks); toks = []; };
  for (; i < s.length; i++) {
    const c = s[i];
    if (q !== "'" && (c === '`' || (c === '$' && s[i + 1] === '('))) {
      i = scan(s, out, i + (c === '`' ? 1 : 2), c === '`' ? '`' : ')');
      cur ??= '';
    } else if (c === '\\' && q !== "'") cur = (cur ?? '') + (s[++i] ?? '');
    else if (q) { if (c === q) q = null; else cur += c; }
    else if (c === '"' || c === "'") { q = c; cur ??= ''; }
    else if (c === close) { end(); return i; }
    else if (/[;&|\n()]/.test(c)) end();
    else if (/\s/.test(c)) word();
    else cur = (cur ?? '') + c;
  }
  end();
  return i;
}

const base = (t) => t.split('/').pop();
const cmds = [];
scan(stripHeredocs(command), cmds);
// Commands handed to a shell as a string are scanned too; they land at the end of the list.
for (const toks of cmds) {
  const at = toks.findIndex((t) => !/^\w+=/.test(t));
  const prog = at < 0 ? '' : base(toks[at]);
  if (prog === 'eval') scan(toks.slice(at + 1).join(' '), cmds);
  else if (['bash', 'sh', 'zsh'].includes(prog)) {
    const c = toks.findIndex((t, j) => j > at && /^-[a-z]*c$/.test(t));
    if (c > 0) scan(toks[c + 1] ?? '', cmds);
  }
}

// Per command: the repo dir (every `-C` applied) and the args from the subcommand on, git's global options skipped.
function parse(toks) {
  const at = toks.findIndex((t) => base(t) === 'git');
  if (at < 0) return null;
  let root = baseRoot;
  let i = at + 1;
  let moved = false; // --git-dir/--work-tree point git elsewhere; we do not try to follow them
  while (i < toks.length && toks[i].startsWith('-')) {
    if (toks[i] === '-C') root = resolve(root, toks[i + 1] ?? '.');
    if (/^--(git-dir|work-tree)(=|$)/.test(toks[i])) moved = true;
    // `--opt=value` is one token, so only the bare forms take the next token.
    i += ['-c', '-C', '--git-dir', '--work-tree', '--namespace', '--config-env', '--attr-source'].includes(toks[i]) ? 2 : 1;
  }
  // Options but no subcommand: cannot tell what runs, so ask (plain `git` / `echo git` is not flagged).
  return { root, s: toks.slice(i).join(' '), moved, noSub: i > at + 1 && i >= toks.length };
}

let createdBranch = false;
for (const toks of cmds) {
  const parsed = parse(toks);
  if (!parsed) continue;
  const { root, s, moved, noSub } = parsed;
  const config = loadConfig(root);
  if (!config) continue;
  if (moved) decide('ask', 'sumi guard: --git-dir/--work-tree redirect git to another repository, so the guard cannot check it. Confirm to continue.');
  if (noSub) decide('ask', 'sumi guard: git was called with options but no subcommand the guard can read. Confirm to continue.');
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
