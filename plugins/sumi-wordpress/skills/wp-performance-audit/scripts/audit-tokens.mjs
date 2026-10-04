#!/usr/bin/env node
// Sumitsubo token audit for WordPress block themes.
// Fails (exit 2) when CSS uses colors, font sizes or spacing that are not theme.json tokens.
// Colors, font sizes and radii are strict; spacing is a warning unless --strict.
// Usage: audit-tokens.mjs <theme-dir> [--css "assets/css"] [--strict]
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith('--')) ?? '.';
const cssDir = join(root, args.includes('--css') ? args[args.indexOf('--css') + 1] : 'assets/css');
const themeFile = join(root, 'theme.json');
if (!existsSync(themeFile)) { console.error(`No theme.json in ${root}`); process.exit(1); }
const theme = JSON.parse(readFileSync(themeFile, 'utf8'));
const s = theme.settings ?? {};

const norm = (v) => String(v).trim().toLowerCase().replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, '#$1$1$2$2$3$3');
const palette = new Set((s.color?.palette ?? []).map((c) => norm(c.color)));
const fontSizes = new Set((s.typography?.fontSizes ?? []).flatMap((f) => [f.size, f.fluid?.min, f.fluid?.max]).filter(Boolean).map(norm));
const radii = new Set(Object.values(s.custom?.radius ?? {}).map(norm));
const strict = args.includes('--strict');
const spacing = new Set((s.spacing?.spacingSizes ?? []).map((x) => norm(x.size)));

function walk(d) { return existsSync(d) ? readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.css') ? [p] : []; }) : []; }
const files = walk(cssDir);
if (!files.length) { console.log(`No CSS files under ${cssDir}`); process.exit(0); }

const issues = { color: [], fontSize: [], radius: [], spacing: [] };
const allowedSpacing = new Set(['0', 'auto', 'inherit', '1px', '2px', '-1px', '100%', '50%']);
for (const f of files) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (/token-ok/.test(line) || /^\s*(\/\*|\*)/.test(line) || /^\s*--/.test(line)) return; // comments and custom property definitions
    const where = `${relative(root, f)}:${i + 1}`;
    for (const hex of line.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
      const h = norm(hex);
      if (h === '#ffffff' || h === '#000000') continue;
      issues.color.push(`${where}  ${hex}${palette.has(h) ? '  (is a palette color: use its var())' : ''}`);
    }
    const fs = line.match(/font-size\s*:\s*([^;]+)/);
    if (fs && !/var\(|inherit|em\b(?!.)|%/.test(fs[1]) && /\d(px|rem)/.test(fs[1])) {
      issues.fontSize.push(`${where}  ${fs[1].trim()}${fontSizes.has(norm(fs[1])) ? '  (matches a preset: use its var())' : ''}`);
    }
    const br = line.match(/border(-[a-z]+)*-radius\s*:\s*([^;]+)/);
    if (br && !/var\(/.test(br[2])) {
      const bad = br[2].trim().split(/\s+/).filter((v) => /\d/.test(v) && !['0', '50%', '100%'].includes(v));
      if (bad.length) issues.radius.push(`${where}  ${br[2].trim()}${bad.every((v) => radii.has(norm(v))) ? '  (matches a radius token: use var(--wp--custom--radius--*))' : ''}`);
    }
    const sp = line.match(/\b(margin|padding|gap|row-gap|column-gap)(-[a-z-]+)?\s*:\s*([^;]+)/);
    if (sp && !/var\(|calc\(|clamp\(/.test(sp[3])) {
      const bad = sp[3].trim().split(/\s+/).filter((v) => /\d/.test(v) && !allowedSpacing.has(v));
      if (bad.length) issues.spacing.push(`${where}  ${sp[1]}${sp[2] ?? ''}: ${sp[3].trim()}${bad.every((v) => spacing.has(norm(v))) ? '  (on the scale: use var(--wp--preset--spacing--*))' : ''}`);
    }
  });
}
let total = 0;
for (const [k, list] of Object.entries(issues)) {
  const warnOnly = k === 'spacing' && !strict;
  if (!warnOnly) total += list.length;
  console.log(`${k}: ${list.length} ${warnOnly ? 'warning(s) (use --strict to fail on spacing)' : 'issue(s)'}`);
  list.slice(0, 40).forEach((x) => console.log('  ' + x));
  if (list.length > 40) console.log(`  … ${list.length - 40} more`);
}
console.log(total ? `FAIL: ${total} value(s) outside theme.json. Add a token or mark with /* token-ok: reason */.` : 'OK: CSS uses theme.json tokens only.');
process.exit(total ? 2 : 0);
