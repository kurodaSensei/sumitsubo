#!/usr/bin/env node
// Sumitsubo status line for Claude Code: one line with the model profile,
// session model, active feature and its progress, Ponytail mode and branch.
//
// Claude Code runs it on every status refresh, so it never touches the network
// and never spawns git: it reads .sumi/ and .git/HEAD directly.
//
// The SessionStart hook keeps a copy at ~/.sumi/statusline.mjs (a path that
// survives plugin updates). Settings:
//   { "statusLine": { "type": "command", "command": "node \"$HOME/.sumi/statusline.mjs\"" } }
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

let input = {};
try {
  const raw = process.stdin.isTTY ? '' : readFileSync(0, 'utf8');
  if (raw.trim()) input = JSON.parse(raw);
} catch { /* no stdin or not JSON: render from the current directory */ }

const start = resolve(input.workspace?.current_dir ?? input.cwd ?? process.cwd());
const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };

function findUp(from, name) {
  let dir = from;
  for (;;) {
    if (existsSync(join(dir, name))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function branch(from) {
  const root = findUp(from, '.git');
  if (!root) return null;
  let gitDir = join(root, '.git');
  try {
    if (statSync(gitDir).isFile()) {
      // worktree or submodule: ".git" is a file pointing at the real git dir
      const target = read(gitDir)?.match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
      if (target) gitDir = resolve(root, target);
    }
  } catch { return null; }
  const head = read(join(gitDir, 'HEAD'))?.trim();
  if (!head) return null;
  return head.startsWith('ref:') ? head.replace(/^ref:\s*refs\/heads\//, '') : head.slice(0, 7);
}

function activeFeature(root) {
  const dir = join(root, '.sumi', 'tasks');
  if (!existsSync(dir)) return null;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const t = read(join(dir, f)) ?? '';
    const status = t.match(/^status:\s*(\w+)/m)?.[1];
    if (status !== 'active' && status !== 'blocked') continue;
    const done = (t.match(/^\s*- \[x\]/gim) ?? []).length;
    const open = (t.match(/^\s*- \[ \]/gm) ?? []).length;
    return { slug: f.replace(/\.md$/, ''), status, done, total: done + open };
  }
  return null;
}

function ponytail() {
  const flag = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'), '.ponytail-active');
  const mode = read(flag)?.split('\n')[0]?.trim();
  if (mode === undefined || mode === null) return null;
  return mode || 'full';
}

const tty = !process.env.NO_COLOR;
const dim = (s) => (tty ? `\x1b[2m${s}\x1b[0m` : s);
const accent = (s) => (tty ? `\x1b[38;5;108m${s}\x1b[0m` : s);
const warn = (s) => (tty ? `\x1b[38;5;173m${s}\x1b[0m` : s);

const parts = [];
const root = findUp(start, join('.sumi', 'config.json'));
const model = input.model?.display_name ?? input.model?.id ?? null;

let cfg = {};
if (root) {
  try { cfg = JSON.parse(read(join(root, '.sumi', 'config.json')) ?? '{}'); } catch { /* keep defaults */ }
}
if (root) {
  const profile = cfg.modelProfile ?? 'balanced';
  parts.push(accent('墨') + ' ' + (profile === 'performance' ? warn(profile) : profile));
} else {
  parts.push(dim('墨'));
}
if (model) parts.push(model);
if (root) {
  const f = activeFeature(root);
  if (f) parts.push(`${f.status === 'blocked' ? warn('blocked') + ' ' : ''}${f.slug} ${dim(`${f.done}/${f.total}`)}`);
}
const pt = ponytail();
if (pt && pt !== 'off') parts.push(`ponytail${pt === 'full' ? '' : ' ' + pt}`);
const b = branch(start);
if (b) {
  const protectedBranches = root ? (cfg.protectedBranches ?? ['main', 'master', 'production']) : [];
  parts.push(protectedBranches.includes(b) ? warn(`⎇ ${b}`) : `⎇ ${b}`);
}

process.stdout.write(parts.join(dim(' · ')));
