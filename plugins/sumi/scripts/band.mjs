#!/usr/bin/env node
// What the Sumitsubo band above the prompt shows, as one JSON line on stdout:
// the active feature, the slice's changed lines against the line budget, the
// latest review receipt and the latest evidence run. `null` outside a project
// set up with /sumi:init.
//
// The band module (hooks/band/register.tsx) runs this after every turn. The
// logic lives here, in plain Node, because a mod has no Node of its own and
// this file can be tested like every other script.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };

function findUp(from, name) {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    if (existsSync(join(dir, name))) return dir;
    if (dirname(dir) === dir) return null;
  }
}

// Same reading as the status line: the first active or blocked feature file.
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

// Receipts are `.sumi/reviews/<yyyy-mm-dd>-<shortsha>.md`, so the name sorts by
// date. /sumi:review writes them as prose, so read loosely: `burned: true` and
// the commit it was burned at, else the sha in the id.
function latestReceipt(root) {
  const dir = join(root, '.sumi', 'reviews');
  if (!existsSync(dir)) return null;
  const id = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f)).sort().pop()?.replace(/\.md$/, '');
  if (!id) return null;
  const text = read(join(dir, `${id}.md`)) ?? '';
  const burned = /^\W*burned\W*:\W*true\b/im.test(text);
  const sha = text.match(/^\W*(?:sha|commit)\W*:\W*([0-9a-f]{7,40})\b/im)?.[1] ?? id.match(/-([0-9a-f]{7,40})$/)?.[1] ?? null;
  return { id, burned, sha };
}

// Evidence runs are `.sumi/evidence/<timestamp>/evidence.json`; the newest wins.
function latestEvidence(root) {
  const dir = join(root, '.sumi', 'evidence');
  if (!existsSync(dir)) return null;
  for (const id of readdirSync(dir).sort().reverse()) {
    let ev;
    try { ev = JSON.parse(read(join(dir, id, 'evidence.json')) ?? ''); } catch { continue; }
    const results = ev.results ?? [];
    return { id, routes: results.length, failed: results.filter((r) => r.problems?.length).length };
  }
  return null;
}

export function bandState(cwd = process.cwd()) {
  const root = findUp(cwd, join('.sumi', 'config.json'));
  if (!root) return null;
  let cfg = {};
  try { cfg = JSON.parse(read(join(root, '.sumi', 'config.json')) ?? '{}'); } catch { /* defaults */ }
  const git = (args) => {
    try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
  };

  const receipt = latestReceipt(root);
  // The slice is what /sumi:review would count: since the last burned receipt
  // when HEAD descends from it, else since the merge-base with the main branch.
  // Diffing against the working tree counts uncommitted edits too.
  let base = null;
  if (receipt?.burned && receipt.sha && git(['merge-base', '--is-ancestor', receipt.sha, 'HEAD']) !== null) base = git(['rev-parse', receipt.sha]);
  for (const b of cfg.protectedBranches ?? ['main', 'master']) {
    if (base) break;
    base = git(['merge-base', 'HEAD', b]) || null;
  }
  let lines = null;
  if (base) {
    // ponytail: untracked files are not counted until they are added; `git add -N` them if that matters.
    const exclude = (cfg.review?.exclude ?? []).map((g) => `:(exclude,glob)${g}`);
    const numstat = git(['diff', '--numstat', base, '--', '.', ...exclude]);
    if (numstat !== null) {
      lines = numstat.split('\n').filter(Boolean).reduce((n, row) => {
        const [add, del] = row.split('\t');
        return n + (Number(add) || 0) + (Number(del) || 0); // binary files show "-"
      }, 0);
    }
  }

  // A burned receipt covers the work only while nothing changed since its commit.
  const covers = receipt?.burned && base && lines === 0 && git(['rev-parse', receipt.sha]) === base;
  return {
    feature: activeFeature(root),
    lines,
    budget: cfg.lineBudget ?? 400,
    receipt: receipt && { id: receipt.id, state: !receipt.burned ? 'open' : covers ? 'current' : 'behind' },
    evidence: latestEvidence(root),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(bandState()) + '\n');
}
