#!/usr/bin/env node
// Does every companion still resolve where the marketplace says it does?
//
//   node scripts/check-companions.mjs
//
// Fifteen of the twenty-one entries in marketplace.json are `git-subdir`
// pointers into OTHER PEOPLE'S repositories. Nothing in this repo controls
// them. If an author renames a folder, moves a skill or retires a repo, every
// `/plugin install` of that companion breaks — for everyone — and no amount of
// validating our own manifests would notice, because our manifests are fine.
//
// Each one is pinned to a commit (`source.sha`), so users get reviewed code, not
// whatever upstream pushed last. This script checks the path AT THE PIN, reports
// when upstream HEAD has moved (never a failure), and `--bump` advances the pins.
//
//   node scripts/check-companions.mjs --bump
//
// This is the only check here that talks to the network, so it is a separate
// script rather than part of validate.mjs: that one must stay runnable offline.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const bump = process.argv.includes('--bump');
const root = fileURLToPath(new URL('..', import.meta.url));
const file = join(root, '.claude-plugin/marketplace.json');
const raw = readFileSync(file, 'utf8');
const mk = JSON.parse(raw);
const companions = mk.plugins.filter((p) => typeof p.source !== 'string');

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const urlOf = (s) => s.url ?? (s.repo ? `https://github.com/${s.repo}.git` : null);

// One fetch per distinct (repo, commit), keyed by the WHOLE url. An earlier
// version keyed the temp directory on the first six characters of the url, which
// are `https:` for every one of them — so all fifteen companions read the tree
// of whichever repo cloned first, and thirteen came back "broken". The result
// was wrong in the alarming direction, which is the kind that gets believed.
// Fetching the commit (blobs filtered out) is what an install does, so the tree
// we list is the tree users get.
const work = mkdtempSync(join(tmpdir(), 'sumi-companions-'));
const trees = new Map();
const heads = new Map();
let bad = 0;

const treeAt = (url, sha) => {
  const key = `${url}#${sha}`;
  if (!trees.has(key)) {
    const dir = join(work, encodeURIComponent(key));
    try {
      git(['init', '-q', dir]);
      git(['fetch', '-q', '--depth', '1', '--filter=blob:none', url, sha], dir);
      trees.set(key, git(['ls-tree', '-r', '--name-only', 'FETCH_HEAD'], dir).split('\n'));
    } catch {
      trees.set(key, null);
    }
  }
  return trees.get(key);
};

const headOf = (url) => {
  if (!heads.has(url)) heads.set(url, git(['ls-remote', url, 'HEAD']).split('\t')[0]);
  return heads.get(url);
};

// Returns an error string, or '' when the plugin is where the marketplace says.
const problem = (p, sha) => {
  const url = urlOf(p.source);
  const files = treeAt(url, sha);
  if (!files) return `cannot fetch ${sha.slice(0, 7)} from ${url}`;
  const path = p.source.path;
  if (!path) return '';
  // A plugin subdir is valid if it carries either a plugin manifest or a
  // skill. Checking only that the directory exists would pass a folder the
  // author emptied.
  if (files.includes(`${path}/.claude-plugin/plugin.json`) || files.includes(`${path}/SKILL.md`)) return '';
  return files.some((f) => f.startsWith(`${path}/`))
    ? `${path} exists in ${url} but has no plugin.json or SKILL.md`
    : `${path} is gone from ${url}`;
};

let out = raw;
try {
  for (const p of companions) {
    const url = urlOf(p.source);
    const sha = p.source.sha;
    if (!url || !/^[0-9a-f]{40}$/.test(sha ?? '')) { console.log(`FAIL ${p.name}: source needs a url and a 40-hex sha`); bad++; continue; }

    const err = problem(p, sha);
    if (err) { console.log(`FAIL ${p.name}: ${err}`); bad++; continue; }
    console.log(`ok   ${p.name} — ${p.source.path ?? 'whole repo'} @ ${sha.slice(0, 7)}`);

    // Drift is information, not failure: the weekly workflow turns it into a PR.
    let head;
    try { head = headOf(url); } catch { console.log(`warn ${p.name}: cannot read upstream HEAD`); continue; }
    if (head === sha) continue;
    console.log(`update available ${p.name}: ${sha.slice(0, 7)}..${head.slice(0, 7)} ${url.replace(/\.git$/, '')}/compare/${sha}...${head}`);

    // The sha is unique to one repo, so replacing it rewrites exactly that
    // repo's entries; do it only when EVERY entry on it survives the new commit,
    // else a half-bumped repo would ship a broken companion.
    if (bump && companions.filter((q) => q.source.sha === sha).every((q) => !problem(q, head))) {
      out = out.replaceAll(sha, head);
    } else if (bump) console.log(`skip ${p.name}: path check fails at ${head.slice(0, 7)}, not bumped`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (bump && out !== raw) writeFileSync(file, out);
console.log(`\n${companions.length} companions, ${new Set(companions.map((p) => p.source.url)).size} upstream repos, ${bad} broken`);
process.exit(bad ? 1 : 0);
