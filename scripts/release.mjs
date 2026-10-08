#!/usr/bin/env node
// Bump every version that has to move together, then validate.
//   npm run release 0.6.0
// Merging the result to main publishes it: .github/workflows/release.yml tags
// vX.Y.Z, publishes the npm installer and asks the docs site to re-sync.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const next = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(next ?? '')) { console.error('usage: npm run release <x.y.z>'); process.exit(1); }

const edits = [];
const rw = (rel, fn) => {
  const p = join(root, rel);
  const before = readFileSync(p, 'utf8');
  const after = fn(before);
  if (after !== before) { writeFileSync(p, after); edits.push(rel); }
};
const jsonSet = (rel, fn) => rw(rel, (t) => { const j = JSON.parse(t); fn(j); return JSON.stringify(j, null, 2) + '\n'; });

const mk = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
const prev = mk.metadata.version;

jsonSet('package.json', (j) => { j.version = next; });
jsonSet('.claude-plugin/marketplace.json', (j) => {
  j.metadata.version = next;
  for (const p of j.plugins) if (typeof p.source === 'string') p.version = next;
});
for (const name of readdirSync(join(root, 'plugins'))) {
  jsonSet(`plugins/${name}/.claude-plugin/plugin.json`, (j) => { j.version = next; });
}
rw('plugins/sumi/templates/CLAUDE.managed.md', (t) => t.replace(/sumi:begin v[\d.]+/, `sumi:begin v${next}`));
rw('README.md', (t) => t.replace(/badge\/version-[\d.]+-/, `badge/version-${next}-`));

console.log(`${prev} → ${next}\n  ${edits.join('\n  ')}`);
execFileSync('node', [join(root, 'scripts/validate.mjs')], { stdio: 'inherit' });
console.log(`\nNext: add the ${next} entry to CHANGELOG.md, commit, open a PR. Merging it publishes.`);
