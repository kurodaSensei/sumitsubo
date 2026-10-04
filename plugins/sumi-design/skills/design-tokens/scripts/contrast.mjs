#!/usr/bin/env node
// WCAG 2.x contrast checker for hex, rgb() and oklch() colors.
// Usage: contrast.mjs "<fg>" "<bg>" [more pairs...]   or   contrast.mjs --pairs pairs.json
//   pairs.json: [{ "name": "body text", "fg": "oklch(0.25 0.02 40)", "bg": "#fbf7f0", "min": 4.5 }]
import { readFileSync } from 'node:fs';

function parse(color) {
  const c = color.trim().toLowerCase();
  let m;
  if ((m = c.match(/^#([0-9a-f]{3,8})$/))) {
    let h = m[1];
    if (![3, 6].includes(h.length)) throw new Error(`Use opaque 3- or 6-digit hex (got ${color}); composite transparent colors first.`);
    if (h.length <= 4) h = [...h].map((x) => x + x).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }
  if ((m = c.match(/^rgba?\(([^)]+)\)$/))) {
    if (/\//.test(m[1]) || m[1].split(/[\s,]+/).filter(Boolean).length > 3) throw new Error(`Alpha is not supported (${color}); composite over the background first.`);
    return m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v) / 255));
  }
  if ((m = c.match(/^oklch\(([^)]+)\)$/))) {
    if (/\//.test(m[1])) throw new Error(`Alpha is not supported (${color}); composite over the background first.`);
    const [Ls, Cs, Hs] = m[1].split(/\s+/).filter(Boolean);
    if (Cs?.endsWith('%')) throw new Error(`Give OKLCH chroma as a number (e.g. 0.12), not a percentage (${color}).`);
    const L = Ls.endsWith('%') ? parseFloat(Ls) / 100 : parseFloat(Ls);
    const C = parseFloat(Cs);
    const H = ((parseFloat(Hs) || 0) * Math.PI) / 180;
    const a = C * Math.cos(H), b = C * Math.sin(H);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3, mm = m_ ** 3, s = s_ ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
    ];
    return lin.map((v) => { v = Math.min(1, Math.max(0, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; });
  }
  throw new Error(`Unsupported color: ${color}`);
}
const lum = (rgb) => { const [r, g, b] = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (fg, bg) => { const a = lum(parse(fg)), b = lum(parse(bg)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };

let pairs = [];
const argv = process.argv.slice(2);
if (argv[0] === '--pairs') pairs = JSON.parse(readFileSync(argv[1], 'utf8'));
else for (let i = 0; i + 1 < argv.length; i += 2) pairs.push({ name: `${argv[i]} on ${argv[i + 1]}`, fg: argv[i], bg: argv[i + 1], min: 4.5 });
if (!pairs.length) { console.log('Usage: contrast.mjs "<fg>" "<bg>" ... | --pairs pairs.json'); process.exit(0); }

let failed = 0;
for (const p of pairs) {
  let r;
  try { r = ratio(p.fg, p.bg); } catch (e) { console.log(`ERROR ${p.name}: ${e.message}`); failed++; continue; }
  const min = p.min ?? 4.5;
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1 (min ${min})  ${p.name}`);
}
process.exit(failed ? 2 : 0);
