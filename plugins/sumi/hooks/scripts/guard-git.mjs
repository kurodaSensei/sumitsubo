// Blocks risky git operations on protected branches in Sumitsubo projects.
import { resolve } from 'node:path';
import { readInput, projectRoot, loadConfig, currentBranch, decide } from './lib.mjs';

const input = readInput();
const command = String(input.tool_input?.command ?? '');
if (!/\bgit\b/.test(command)) process.exit(0);

const baseRoot = projectRoot(input);
// ponytail: a tokenizer, not a shell parser. It splits on separators outside quotes, descends into $(...),
// backticks, heredoc bodies, `<shell> -c` strings and `eval`, and matches git by basename. A heredoc body is
// dropped only when `cat`/`tee` reads it and does not pipe it on. It does not expand variables, aliases or git hidden in a script
// file; extend when a real bypass shows up. Threat model: it catches accidental pushes and commits to
// protected branches, not a model deliberately evading it.
const base = (t) => t.split('/').pop();
// One shell word: quoted runs, backslash escapes and plain characters, as bash reads a heredoc delimiter.
const WORD = String.raw`(?:'[^']*'|"[^"]*"|\\.|[^\s;&|()<>'"\\])+`;
const SHELLS = ['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish'];

// Only $(...) and backticks of an unquoted-delimiter heredoc that a reader consumes can run anything.
function substitutions(body, out) {
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '`') i = scan(body, out, i + 1, '`');
    else if (body[i] === '$' && body[i + 1] === '(') i = scan(body, out, i + 2, ')');
  }
}

// `i` is the newline that starts the body. Returns the index of the newline ending the terminator line.
function heredoc(s, i, h, out) {
  for (let p = i + 1; p <= s.length; ) {
    let e = s.indexOf('\n', p);
    if (e < 0) e = s.length;
    const line = s.slice(p, e);
    if ((h.dash ? line.replace(/^\t+/, '') : line) === h.delim) {
      const body = s.slice(i + 1, p);
      if (!h.reader || h.piped) scan(body, out);
      else if (!h.quoted) substitutions(body, out);
      return e;
    }
    p = e + 1;
  }
  scan(s.slice(i + 1), out); // never closed: fail closed and read the rest as commands
  return s.length;
}

// Appends each simple command (as unquoted tokens) to `out`; returns the index where it stopped.
function scan(s, out, i = 0, close = null) {
  let toks = [], cur = null, q = null, pending = [], hs = [];
  const word = () => { if (cur !== null) toks.push(cur); cur = null; };
  const end = () => { word(); if (toks.length) out.push(Object.assign(toks, { hs })); toks = []; hs = []; };
  for (; i < s.length; i++) {
    const c = s[i];
    if (q !== "'" && (c === '`' || (c === '$' && s[i + 1] === '('))) {
      i = scan(s, out, i + (c === '`' ? 1 : 2), c === '`' ? '`' : ')');
      cur ??= '';
    } else if (c === '\\' && q !== "'") cur = (cur ?? '') + (s[++i] ?? '');
    else if (q) { if (c === q) q = null; else cur += c; }
    else if (c === '"' || c === "'") { q = c; cur ??= ''; }
    else if (c === close) { end(); return i; }
    else if (c === '<' && s[i + 1] === '<' && s[i - 1] !== '<') {
      const here = s[i + 2] === '<'; // <<< here-string
      const m = s.slice(i + (here ? 3 : 2)).match(here ? new RegExp(`^\\s*(${WORD})`) : new RegExp(`^(-?)\\s*(${WORD})`));
      if (!m) { cur = (cur ?? '') + c; continue; }
      word();
      const w = m[m.length - 1];
      const plain = w.replace(/['"\\]/g, '');
      if (here) { hs.push(w.replace(/^(["'])(.*)\1$/s, '$2')); substitutions(w, out); }
      else {
        // bash rule: the terminator is the word with quotes and backslashes removed; any of them makes the body literal.
        const first = toks.find((t) => !/^\w+=/.test(t));
        pending.push({ dash: !!m[1], delim: plain, quoted: plain !== w, reader: ['cat', 'tee'].includes(base(first ?? '')), piped: false });
      }
      i += (here ? 2 : 1) + m[0].length;
    } else if (c === '|') { end(); pending.forEach((h) => (h.piped = true)); // a reader piped on may feed a shell
    } else if (c === '\n') {
      end();
      for (const h of pending) i = heredoc(s, i, h, out);
      pending = [];
    } else if (/[;&|()]/.test(c)) end();
    else if (/\s/.test(c)) word();
    else cur = (cur ?? '') + c;
  }
  end();
  return i;
}

const cmds = [];
scan(command, cmds);
// A shell or eval anywhere in a command (sudo bash -c, env X=1 sh -c, timeout 5 bash -c ...) hands it a string to run.
// New commands land at the end of the list, which this loop also visits.
for (const toks of cmds) {
  toks.forEach((t, j) => {
    if (t === 'eval') scan(toks.slice(j + 1).concat(toks.hs).join(' '), cmds);
    else if (SHELLS.includes(base(t))) {
      toks.hs.forEach((h) => scan(h, cmds)); // here-string fed to the shell
      const c = toks.findIndex((x, k) => k > j && /^-[a-z]*c$/.test(x));
      if (c > 0) scan(toks[c + 1] ?? '', cmds);
    }
  });
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
  return { root, s: toks.slice(i).join(' '), moved, noSub: i > at + 1 && i >= toks.length && !(i === at + 2 && /^(--version|--help|-v|-h)$/.test(toks[i - 1])) };
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
