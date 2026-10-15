#!/usr/bin/env node
// sumi evidence — screenshots, axe and Lighthouse for a running site, in one command.
//
//   node ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.mjs <base-url> [--routes /,/about] [options]
//
// Writes .sumi/evidence/<timestamp>/ (screenshots, Lighthouse JSON, evidence.md)
// and prints a markdown block ready for the feature file's Evidence section.
// Exit 0 when everything is within budget, 2 when a budget or axe gate fails,
// 1 when it could not run.
//
// Its dependencies (Playwright, axe-core, Lighthouse) are installed once into
// ~/.sumi/evidence-runtime, never into the project. No global installs.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = { routes: ['/'], out: null, screens: true, axe: true, lighthouse: true, json: false, install: true };
let base = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const val = () => args[++i] ?? fail(`${a} needs a value`);
  if (a === '--routes') opt.routes = val().split(',').map((r) => r.trim()).filter(Boolean);
  else if (a === '--out') opt.out = val();
  else if (a === '--no-screens') opt.screens = false;
  else if (a === '--no-axe') opt.axe = false;
  else if (a === '--no-lighthouse') opt.lighthouse = false;
  else if (a === '--json') opt.json = true;
  else if (a === '--no-install') opt.install = false;
  else if (a === '-h' || a === '--help') { help(); process.exit(0); }
  else if (!a.startsWith('-') && !base) base = a;
  else fail(`unknown option ${a}`);
}
if (!base) { help(); process.exit(1); }
if (!/^https?:\/\//.test(base)) fail('the base URL must start with http:// or https:// (start the dev or preview server first)');

function help() {
  console.log(`sumi evidence <base-url> [--routes /,/about] [--out dir] [--no-screens] [--no-axe] [--no-lighthouse] [--json]

Screenshots (mobile 390px + desktop 1440px), axe (WCAG 2.2 A/AA) and Lighthouse
(mobile) for each route, checked against performanceBudget in .sumi/config.json.
Run it against a production build (preview server or a deployed URL), not a dev server.`);
}
function fail(m) { console.error(`sumi evidence: ${m}`); process.exit(1); }
const log = (m) => (opt.json ? console.error(m) : console.log(m));

// ---------- budgets ----------
const cfgPath = join(process.cwd(), '.sumi/config.json');
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};
const pb = cfg.performanceBudget ?? {};
const budget = {
  lcpMs: pb.lcpMs ?? 2500,
  cls: pb.cls ?? 0.1,
  // INP needs a real interaction; in a navigation run Total Blocking Time is its lab proxy.
  tbtMs: pb.tbtMs ?? 200,
  jsKb: pb.jsKbGzipInitial ?? 170,
};

// ---------- runtime (installed once, outside the project) ----------
const runtime = process.env.SUMI_EVIDENCE_HOME ?? join(homedir(), '.sumi', 'evidence-runtime');
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const lhMajor = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 19) ? 13 : 12;
function ensureRuntime() {
  const need = ['playwright', '@axe-core/playwright', 'lighthouse'].filter((p) => !existsSync(join(runtime, 'node_modules', p, 'package.json')));
  if (!need.length) return;
  if (!opt.install) fail(`missing ${need.join(', ')} in ${runtime} (run without --no-install once)`);
  log(`Installing the evidence runtime into ${runtime} (one time)…`);
  mkdirSync(runtime, { recursive: true });
  if (!existsSync(join(runtime, 'package.json'))) writeFileSync(join(runtime, 'package.json'), '{ "private": true }\n');
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error', 'playwright@^1', '@axe-core/playwright@^4', `lighthouse@^${lhMajor}`],
    { cwd: runtime, stdio: ['ignore', 'inherit', 'inherit'], shell: process.platform === 'win32' });
  if (r.status !== 0) fail('npm install of the evidence runtime failed');
}
ensureRuntime();
const req = createRequire(join(runtime, 'package.json'));
const imp = (name) => import(pathToFileURL(req.resolve(name)).href);
// Both packages are CommonJS: through import() their exports may sit under `default`.
const pw = await imp('playwright');
const chromium = pw.chromium ?? pw.default?.chromium;
const axeMod = await imp('@axe-core/playwright');
const AxeBuilder = [axeMod.default?.default, axeMod.default, axeMod.AxeBuilder].find((x) => typeof x === 'function');

async function launch() {
  // SUMI_CHROMIUM points at an existing Chromium (CI images, preinstalled browsers).
  const flags = { args: ['--no-sandbox'], ...(process.env.SUMI_CHROMIUM ? { executablePath: process.env.SUMI_CHROMIUM } : {}) };
  try { return await chromium.launch(flags); }
  catch (e) {
    if (!/Executable doesn't exist|playwright install/i.test(String(e.message)) || !opt.install) throw e;
    log('Downloading Chromium for Playwright (one time)…');
    const cli = join(runtime, 'node_modules', 'playwright', 'cli.js');
    const r = spawnSync(process.execPath, [cli, 'install', 'chromium'], { stdio: ['ignore', 'inherit', 'inherit'] });
    if (r.status !== 0) fail('could not install Chromium');
    return chromium.launch(flags);
  }
}

// ---------- run ----------
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = resolve(opt.out ?? join('.sumi', 'evidence', stamp));
const slug = (r) => (r === '/' ? 'home' : r.replace(/^\/|\/$/g, '').replace(/[^\w-]+/g, '-')) || 'home';
const urlOf = (r) => new URL(r, base.endsWith('/') ? base : `${base}/`).href;

const results = [];
const browser = await launch();
mkdirSync(outDir, { recursive: true });
try {
  for (const route of opt.routes) {
    const url = urlOf(route);
    const res = { route, url, screens: [], axe: null, lh: null, problems: [] };
    log(`→ ${url}`);
    for (const vp of [{ name: 'mobile', width: 390, height: 844, mobile: true }, { name: 'desktop', width: 1440, height: 900, mobile: false }]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, isMobile: vp.mobile, hasTouch: vp.mobile, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 }).catch((e) => { res.problems.push(`load failed (${vp.name}): ${e.message.split('\n')[0]}`); return null; });
      if (resp && resp.status() >= 400) res.problems.push(`HTTP ${resp.status()} (${vp.name})`);
      if (resp && opt.screens) {
        const file = join(outDir, `${slug(route)}-${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        res.screens.push(file);
      }
      if (resp && opt.axe && vp.name === 'desktop') {
        const a = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const by = { critical: 0, serious: 0, moderate: 0, minor: 0 };
        for (const v of a.violations) by[v.impact ?? 'minor'] += v.nodes.length;
        res.axe = { ...by, rules: a.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`) };
        if (by.critical + by.serious > 0) res.problems.push(`axe: ${by.critical} critical, ${by.serious} serious`);
      }
      await ctx.close();
    }
    if (opt.lighthouse && !res.problems.some((p) => p.startsWith('load failed'))) res.lh = lighthouse(url, route, res);
    results.push(res);
  }
} finally {
  await browser.close();
}

function lighthouse(url, route, res) {
  const file = join(outDir, `${slug(route)}-lighthouse.json`);
  const cli = req.resolve('lighthouse/cli/index.js');
  const r = spawnSync(process.execPath, [cli, url, '--quiet', '--output=json', `--output-path=${file}`,
    '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox'],
    { env: { ...process.env, CHROME_PATH: process.env.SUMI_CHROMIUM ?? chromium.executablePath() }, encoding: 'utf8', timeout: 180_000 });
  if (r.status !== 0 || !existsSync(file)) { res.problems.push(`lighthouse failed: ${(r.stderr || '').trim().split('\n').pop()}`); return null; }
  const lhr = JSON.parse(readFileSync(file, 'utf8'));
  const score = (k) => Math.round((lhr.categories[k]?.score ?? 0) * 100);
  const num = (k) => lhr.audits[k]?.numericValue ?? null;
  // Initial JS: script bytes transferred on load (compressed, as delivered).
  const items = lhr.audits['network-requests']?.details?.items ?? [];
  const jsKb = Math.round(items.filter((i) => i.resourceType === 'Script').reduce((s, i) => s + (i.transferSize ?? 0), 0) / 1024);
  const out = {
    performance: score('performance'), accessibility: score('accessibility'), bestPractices: score('best-practices'), seo: score('seo'),
    lcpMs: Math.round(num('largest-contentful-paint')), cls: Number((num('cumulative-layout-shift') ?? 0).toFixed(3)),
    tbtMs: Math.round(num('total-blocking-time')), jsKb, report: file,
  };
  if (out.lcpMs > budget.lcpMs) res.problems.push(`LCP ${out.lcpMs} ms > ${budget.lcpMs}`);
  if (out.cls > budget.cls) res.problems.push(`CLS ${out.cls} > ${budget.cls}`);
  if (out.tbtMs > budget.tbtMs) res.problems.push(`TBT ${out.tbtMs} ms > ${budget.tbtMs}`);
  if (out.jsKb > budget.jsKb) res.problems.push(`initial JS ${out.jsKb} KB > ${budget.jsKb}`);
  return out;
}

// ---------- report ----------
const rel = (p) => p.replace(process.cwd() + '/', '');
const lines = [
  `### Evidence — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
  '',
  `Base: ${base} · Budgets: LCP ≤ ${budget.lcpMs} ms, CLS ≤ ${budget.cls}, TBT ≤ ${budget.tbtMs} ms (INP lab proxy), initial JS ≤ ${budget.jsKb} KB`,
  '',
  '| Route | Perf | A11y | BP | SEO | LCP | CLS | TBT | JS KB | axe (crit/ser/mod) | Result |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const r of results) {
  const l = r.lh;
  const ax = r.axe ? `${r.axe.critical}/${r.axe.serious}/${r.axe.moderate}` : '—';
  lines.push(`| \`${r.route}\` | ${l?.performance ?? '—'} | ${l?.accessibility ?? '—'} | ${l?.bestPractices ?? '—'} | ${l?.seo ?? '—'} | ${l ? l.lcpMs + ' ms' : '—'} | ${l?.cls ?? '—'} | ${l ? l.tbtMs + ' ms' : '—'} | ${l?.jsKb ?? '—'} | ${ax} | ${r.problems.length ? 'fail' : 'pass'} |`);
}
const problems = results.flatMap((r) => r.problems.map((p) => `\`${r.route}\`: ${p}`));
const axeRules = results.flatMap((r) => (r.axe?.rules ?? []).map((x) => `\`${r.route}\`: ${x}`));
lines.push('');
if (problems.length) lines.push('**Gates failed**', '', ...problems.map((p) => `- ${p}`), '');
if (axeRules.length) lines.push('axe violations: ' + axeRules.join('; '), '');
lines.push(`Screenshots and reports: \`${rel(outDir)}/\` (lab data on this machine; field data comes from CrUX/RUM).`);
const md = lines.join('\n');
writeFileSync(join(outDir, 'evidence.md'), md + '\n');
writeFileSync(join(outDir, 'evidence.json'), JSON.stringify({ base, budget, results }, null, 2));
if (opt.json) console.log(JSON.stringify({ ok: !problems.length, outDir, budget, results }));
else console.log('\n' + md);
process.exit(problems.length ? 2 : 0);
