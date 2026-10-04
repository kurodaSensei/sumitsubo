#!/usr/bin/env node
// forge design ledger: cross-project memory of design decisions to avoid repetition.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const FILE = process.env.FORGE_LEDGER || join(homedir(), '.forge', 'design-ledger.json');

function load() {
  if (!existsSync(FILE)) return { version: 1, projects: [] };
  try {
    return JSON.parse(readFileSync(FILE, 'utf8'));
  } catch (e) {
    console.error(`Ledger file is not valid JSON (${FILE}): ${e.message}. Fix or move it, then retry.`);
    process.exit(1);
  }
}
function save(data) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
}
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}
const norm = (s) => String(s ?? '').trim().toLowerCase();
const list = (s) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
function num(name) {
  if (args[name] === undefined) return null;
  const v = Number(args[name]);
  if (args[name] === true || Number.isNaN(v)) { console.error(`--${name} needs a numeric value`); process.exit(1); }
  return v;
}
const hueDistance = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

function fmt(p) {
  return `${p.date}  ${p.project}${p.brandLocked ? ' [brand-locked]' : ''}\n` +
    `   direction: ${p.direction || '-'} | fonts: ${p.fonts.join(' + ') || '-'} | accent hue: ${p.hue ?? '-'} | layout: ${p.layout || '-'} | shape: ${p.shape || '-'}\n` +
    `   signature: ${p.signature || '-'}`;
}

const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const data = load();

switch (cmd) {
  case 'add': {
    if (!args.project) { console.error('add requires --project'); process.exit(1); }
    const entry = {
      project: String(args.project),
      date: new Date().toISOString().slice(0, 10),
      direction: args.direction ? String(args.direction) : '',
      fonts: list(args.fonts),
      hue: num('hue'),
      chroma: num('chroma'),
      palette: list(args.palette),
      layout: args.layout ? String(args.layout) : '',
      shape: args.shape ? String(args.shape) : '',
      signature: args.signature ? String(args.signature) : '',
      brandLocked: Boolean(args['brand-locked']),
    };
    data.projects = data.projects.filter((p) => norm(p.project) !== norm(entry.project));
    data.projects.push(entry);
    save(data);
    console.log(`Recorded "${entry.project}" in ${FILE}`);
    break;
  }
  case 'recent': {
    const n = Number(args._[0] ?? 6);
    const items = data.projects.slice(-n).reverse();
    console.log(items.length ? items.map(fmt).join('\n') : 'Ledger is empty.');
    break;
  }
  case 'list': {
    console.log(data.projects.length ? data.projects.map(fmt).join('\n') : 'Ledger is empty.');
    break;
  }
  case 'check': {
    const window = Number(args.window ?? 6);
    const recent = data.projects.filter((p) => !p.brandLocked && norm(p.project) !== norm(args.project)).slice(-window);
    const issues = [];
    const notes = [];
    const display = norm(args.display ?? list(args.fonts ?? args.font)[0]);
    const fonts = list(args.fonts ?? args.font).map(norm);
    const hue = num('hue');
    const chroma = num('chroma');
    for (const p of recent) {
      const pf = p.fonts.map(norm);
      if (display && pf[0] === display) issues.push(`display typeface "${display}" was the display face of ${p.project} (${p.date})`);
      for (const f of fonts) if (f !== display || pf[0] !== display) if (pf.includes(f)) notes.push(`typeface "${f}" also used in ${p.project} (fine for neutral body text if justified)`);
      if (hue !== null && p.hue !== null && p.hue !== undefined && hueDistance(hue, p.hue) <= 15) {
        const similarChroma = chroma === null || p.chroma === null || p.chroma === undefined || Math.abs(chroma - p.chroma) <= 0.04;
        if (similarChroma) issues.push(`accent hue ${hue} is within 15° of ${p.project} (${p.hue})`);
      }
      if (args.layout && args.shape && norm(p.layout) === norm(args.layout) && norm(p.shape) === norm(args.shape)) issues.push(`layout "${args.layout}" + shape "${args.shape}" both match ${p.project}`);
      if (args.signature && norm(p.signature) && norm(p.signature) === norm(args.signature)) issues.push(`signature element matches ${p.project}`);
    }
    if (notes.length) console.log('NOTES:\n- ' + [...new Set(notes)].join('\n- '));
    if (issues.length) { console.log('COLLISIONS:\n- ' + issues.join('\n- ')); process.exit(2); }
    console.log(`No collisions with the last ${recent.length} project(s).`);
    break;
  }
  default:
    console.log('Usage: ledger.mjs <add|recent|list|check> [options]  (ledger file: ' + FILE + ')');
}
