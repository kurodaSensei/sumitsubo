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
// This is the only check here that talks to the network, so it is a separate
// script rather than part of validate.mjs: that one must stay runnable offline.
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('..', import.meta.url));
const mk = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
const companions = mk.plugins.filter((p) => typeof p.source !== 'string');

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const urlOf = (s) => s.url ?? (s.repo ? `https://github.com/${s.repo}.git` : null);

// One clone per distinct repo, keyed by the WHOLE url. An earlier version of
// this keyed the temp directory on the first six characters of the url, which
// are `https:` for every one of them — so all fifteen companions read the tree
// of whichever repo cloned first, and thirteen came back "broken". The result
// was wrong in the alarming direction, which is the kind that gets believed.
const work = mkdtempSync(join(tmpdir(), 'sumi-companions-'));
const trees = new Map();
let bad = 0;

try {
  for (const p of companions) {
    const url = urlOf(p.source);
    if (!url) { console.log(`FAIL ${p.name}: source has no url or repo`); bad++; continue; }

    if (!trees.has(url)) {
      const dir = join(work, encodeURIComponent(url));
      try {
        git(['clone', '-q', '--depth', '1', '--filter=blob:none', '--no-checkout', url, dir]);
        trees.set(url, git(['ls-tree', '-r', '--name-only', 'HEAD'], dir).split('\n'));
      } catch {
        trees.set(url, null);
      }
    }

    const files = trees.get(url);
    if (!files) { console.log(`FAIL ${p.name}: cannot reach ${url}`); bad++; continue; }

    const path = p.source.path;
    if (!path) { console.log(`ok   ${p.name} — ${url} (whole repo)`); continue; }

    // A plugin subdir is valid if it carries either a plugin manifest or a
    // skill. Checking only that the directory exists would pass a folder the
    // author emptied.
    const manifest = files.includes(`${path}/.claude-plugin/plugin.json`);
    const skill = files.includes(`${path}/SKILL.md`);
    if (manifest || skill) {
      console.log(`ok   ${p.name} — ${path}/${manifest ? '.claude-plugin/plugin.json' : 'SKILL.md'}`);
    } else if (files.some((f) => f.startsWith(`${path}/`))) {
      console.log(`FAIL ${p.name}: ${path} exists in ${url} but has no plugin.json or SKILL.md`);
      bad++;
    } else {
      console.log(`FAIL ${p.name}: ${path} is gone from ${url}`);
      bad++;
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`\n${companions.length} companions, ${trees.size} upstream repos, ${bad} broken`);
process.exit(bad ? 1 : 0);
