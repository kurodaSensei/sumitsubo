#!/usr/bin/env node
// Structural validation for the marketplace: manifests, frontmatter, references.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
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
  if (typeof p.source !== 'string') { companions++; if (!p.description) errors.push(`${p.name}: companion without description`); continue; } // upstream reference, validated by `claude plugin validate`
  const dir = join(root, p.source);
  const pj = json(join(dir, '.claude-plugin/plugin.json'));
  if (!pj) continue;
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
      const fm = frontmatter(join(d, f));
      if (!fm.description) errors.push(`${p.name}/${kind}/${f}: missing description`);
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
    if (!existsSync(join(root, 'plugins', pluginDir, m[1]))) errors.push(`${f}: broken reference ${m[1]}`);
  }
}
console.log(`plugins: ${(mk?.plugins?.length ?? 0) - companions} local + ${companions} companions, skills: ${skills}, agents: ${agents}, commands: ${commands}`);
if (errors.length) { console.log('ERRORS:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('OK');
