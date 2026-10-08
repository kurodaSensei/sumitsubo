#!/usr/bin/env node
// Structural validation for the marketplace: manifests, frontmatter, references.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// `.pathname` keeps the URL percent-encoding, so a checkout under a directory
// with a space in its name resolved to `AI%20Setup` and every path missed.
// Nothing reported it because the marketplace read failed into the error list
// and the empty plugin loop then validated nothing at all — the validator was
// a no-op here until it finally crashed in the walk below.
const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [];
const json = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { errors.push(`${p}: invalid JSON (${e.message})`); return null; } };
function frontmatter(p) {
  const t = readFileSync(p, 'utf8');
  const m = t.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { errors.push(`${p}: missing frontmatter`); return {}; }
  const fm = {};
  for (const line of m[1].split('\n')) { const k = line.match(/^([a-zA-Z-]+):\s*(.*)$/); if (k) fm[k[1]] = k[2]; }
  return fm;
}

const mk = json(join(root, '.claude-plugin/marketplace.json'));
let skills = 0, agents = 0, commands = 0;
let companions = 0;
for (const p of mk?.plugins ?? []) {
  if (typeof p.source !== 'string') {
    companions++;
    if (!p.description) errors.push(`${p.name}: companion without description`);
    // `{source: "github"}` is cloned over SSH by `claude plugin install` on a
    // normal machine, with no HTTPS fallback: without SSH keys the install fails,
    // and everything that depends on it fails with it. `{source: "url"}` with an
    // https URL installs for everyone (verified in a clean profile with SSH off).
    if (p.source.source === 'github') errors.push(`${p.name}: use {"source":"url","url":"https://github.com/<repo>.git"} instead of "github" — github sources need SSH keys to install`);
    for (const k of ['url']) if (p.source[k] && !/^https:\/\//.test(p.source[k])) errors.push(`${p.name}: ${k} must be https:// (SSH URLs fail without keys)`);
    continue;
  } // upstream reference, validated by `claude plugin validate`
  const dir = join(root, p.source);
  const pj = json(join(dir, '.claude-plugin/plugin.json'));
  if (!pj) continue;
  if (pj.version !== p.version) errors.push(`${p.name}: version ${pj.version} in plugin.json != ${p.version} in marketplace.json`);
  if (pj.version !== mk.metadata?.version) errors.push(`${p.name}: version ${pj.version} != marketplace ${mk.metadata?.version} (bump with npm run release)`);
  if (pj.name !== p.name) errors.push(`${p.name}: plugin.json name mismatch (${pj.name})`);
  for (const dep of pj.dependencies ?? []) if (!mk.plugins.some((x) => x.name === dep)) errors.push(`${p.name}: unknown dependency ${dep}`);
  const sdir = join(dir, 'skills');
  if (existsSync(sdir)) for (const s of readdirSync(sdir)) {
    const f = join(sdir, s, 'SKILL.md');
    if (!existsSync(f)) { errors.push(`${p.name}/skills/${s}: no SKILL.md`); continue; }
    const fm = frontmatter(f); skills++;
    if (fm.name !== s) errors.push(`${f}: name "${fm.name}" != folder "${s}"`);
    if (!fm.description || fm.description.length < 40) errors.push(`${f}: description missing or too short`);
    if ((fm.description ?? '').length > 1024) errors.push(`${f}: description > 1024 chars`);
    const lines = readFileSync(f, 'utf8').split('\n').length;
    if (lines > 260) errors.push(`${f}: ${lines} lines (move depth to references/)`);
  }
  for (const [kind, counter] of [['agents', 'a'], ['commands', 'c']]) {
    const d = join(dir, kind);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((x) => x.endsWith('.md'))) {
      const full = join(d, f);
      const fm = frontmatter(full);
      if (!fm.description) errors.push(`${p.name}/${kind}/${f}: missing description`);
      if (kind === 'commands') {
        // Every command has to end by telling the user what happened, in the
        // one shape `sumi:output` defines. Before that skill existed, nine
        // commands described that moment in nine different ways and
        // /sumi:ship described it not at all — which is exactly what this
        // catches on the tenth command.
        const body = readFileSync(full, 'utf8');
        if (!/`sumi:output`/.test(body)) {
          errors.push(`${p.name}/${kind}/${f}: no reporting step — the last step must be "**Report** per \`sumi:output\`" with its fields`);
        }
        // Restating the contract inside a command is how it drifts: the point
        // of one file is that changing it changes every command at once.
        const restates = /\b(no emoji|ASCII box|status is a word|lead with the result)\b/i.exec(body);
        if (restates) {
          errors.push(`${p.name}/${kind}/${f}: restates the output contract ("${restates[0]}") — reference sumi:output instead`);
        }
      }
      kind === 'agents' ? agents++ : commands++;
    }
  }
  const hooks = join(dir, 'hooks/hooks.json');
  if (existsSync(hooks)) {
    const h = json(hooks);
    for (const groups of Object.values(h?.hooks ?? {})) for (const g of groups) for (const hk of g.hooks) {
      const m = hk.command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\s]+)/);
      if (m && !existsSync(join(dir, m[1]))) errors.push(`${hooks}: missing script ${m[1]}`);
    }
  }
}
// ${CLAUDE_PLUGIN_ROOT} references in markdown must exist
function walk(d) { return readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? (f === '.git' ? [] : walk(p)) : [p]; }); }
for (const f of walk(join(root, 'plugins')).filter((x) => x.endsWith('.md'))) {
  const pluginDir = f.split('/plugins/')[1].split('/')[0];
  for (const m of readFileSync(f, 'utf8').matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+[\w])/g)) {
    const base = join(root, 'plugins', pluginDir);
    const target = resolve(base, m[1]);
    // An installed plugin only has its own folder: a path that climbs out of it
    // exists in this repo but is dead for everyone who installs the plugin.
    if (!target.startsWith(base + sep)) errors.push(`${f}: ${m[1]} escapes the plugin folder (dead once installed)`);
    else if (!existsSync(target)) errors.push(`${f}: broken reference ${m[1]}`);
  }
}
// The npm installer, the marketplace and the managed CLAUDE.md block move together.
const pkg = json(join(root, 'package.json'));
if (pkg && pkg.version !== mk?.metadata?.version) errors.push(`package.json ${pkg.version} != marketplace ${mk?.metadata?.version}`);
const managed = readFileSync(join(root, 'plugins/sumi/templates/CLAUDE.managed.md'), 'utf8').match(/sumi:begin v([\d.]+)/)?.[1];
if (managed !== mk?.metadata?.version) errors.push(`CLAUDE.managed.md marker v${managed} != marketplace ${mk?.metadata?.version}`);
console.log(`plugins: ${(mk?.plugins?.length ?? 0) - companions} local + ${companions} companions, skills: ${skills}, agents: ${agents}, commands: ${commands}`);
if (errors.length) { console.log('ERRORS:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('OK');
