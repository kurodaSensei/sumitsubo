#!/usr/bin/env node
// Run the plugins' eval suites with their real dependencies loaded.
//
//   node scripts/run-evals.mjs [plugin ...] [-- extra claude plugin eval flags]
//   npm run evals -- sumi-design -- --tag slop --ablation with-without
//
// `claude plugin eval` loads only the plugin under test, and a plugin whose
// dependencies are missing does not load at all (its skills come back as
// "Unknown skill"). So each run stages a copy in .eval-stage/: the plugin without
// its `dependencies` field, and every case carrying its dependency closure in
// deps/<name>, listed in the case's `plugins:`. Companions come from a sandbox
// install of this checkout, so they are the real upstream plugins.
//
// Costs real tokens on your account (each case runs several times). Defaults:
// --runs 1 --ablation none --no-publish. Trigger cases (tag "trigger") need
// --ablation none: under with-without, Skill-use graders are not scored.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const names = (sep === -1 ? argv : argv.slice(0, sep)).filter((a) => !a.startsWith('-'));
const extra = sep === -1 ? [] : argv.slice(sep + 1);

const mk = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
const local = mk.plugins.filter((p) => typeof p.source === 'string');
const targets = (names.length ? names : local.map((p) => p.name)).filter((n) => existsSync(join(root, 'plugins', n, 'evals')));
if (!targets.length) { console.error('no plugin with an evals/ folder matched'); process.exit(1); }

const pluginJson = (n) => JSON.parse(readFileSync(join(root, 'plugins', n, '.claude-plugin/plugin.json'), 'utf8'));
function closure(name, seen = new Set()) {
  const p = mk.plugins.find((x) => x.name === name);
  if (!p || typeof p.source !== 'string') return seen;
  for (const d of pluginJson(name).dependencies ?? []) if (!seen.has(d)) { seen.add(d); closure(d, seen); }
  return seen;
}

// One sandbox install provides every companion exactly as users get it.
const stage = join(root, '.eval-stage');
const sandbox = join(stage, '.profile');
const cache = join(sandbox, 'plugins', 'cache', 'sumitsubo');
if (!existsSync(cache)) {
  console.error('Installing companions into a sandbox profile (once)…');
  const r = spawnSync(process.execPath, [join(root, 'bin/sumitsubo.mjs'), '--sandbox', sandbox, '--from', root, '--stack', 'nuxt,react,shopify,wordpress'], { stdio: ['ignore', 2, 2] });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
function dirOf(name) {
  if (local.some((p) => p.name === name)) return join(root, 'plugins', name);
  const d = join(cache, name);
  const ver = existsSync(d) ? readdirSync(d).find((v) => !v.startsWith('.')) : null;
  if (!ver) throw new Error(`companion ${name} is not in the sandbox profile`);
  return join(d, ver);
}
function stripDeps(dir) {
  const f = join(dir, '.claude-plugin', 'plugin.json');
  if (!existsSync(f)) return;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  delete j.dependencies;
  writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
}
const copy = (from, to) => cpSync(from, to, { recursive: true, filter: (p) => !/[\\/](results|\.in_use|\.orphaned_at|\.git)(?:[\\/]|$)/.test(p) });

let failed = false;
for (const name of targets) {
  const deps = [...closure(name)];
  const dest = join(stage, name);
  rmSync(dest, { recursive: true, force: true });
  copy(join(root, 'plugins', name), dest);
  stripDeps(dest);
  for (const c of readdirSync(join(dest, 'evals'), { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== 'results')) {
    const caseDir = join(dest, 'evals', c.name);
    // A case that lists `plugins:` loads exactly that list, so the plugin under
    // test goes in it too, next to its dependencies.
    const load = [name, ...deps];
    for (const d of load) {
      copy(d === name ? join(root, 'plugins', name) : dirOf(d), join(caseDir, 'deps', d));
      rmSync(join(caseDir, 'deps', d, 'evals'), { recursive: true, force: true });
      stripDeps(join(caseDir, 'deps', d));
    }
    const prompt = join(caseDir, 'prompt.md');
    const list = load.map((d) => `"deps/${d}"`).join(', ');
    const text = readFileSync(prompt, 'utf8');
    writeFileSync(prompt, text.replace(/^---\n/, `---\nplugins: [${list}]\n`));
  }
  console.error(`\n▸ ${name}  (${deps.length} dependencies loaded per case)`);
  const flags = ['--trust-plugin', ...(extra.some((a) => a === '--runs') ? [] : ['--runs', '1']),
    ...(extra.some((a) => a === '--ablation') ? [] : ['--ablation', 'none']),
    ...(extra.some((a) => a.startsWith('--publish')) ? [] : ['--no-publish']), ...extra];
  const r = spawnSync('claude', ['plugin', 'eval', dest, ...flags], { stdio: 'inherit' });
  if (r.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
