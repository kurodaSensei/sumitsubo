#!/usr/bin/env node
// Sumitsubo installer: a thin wrapper over the supported `claude plugin ...` CLI.
// It never writes Claude Code's settings files itself; everything goes through
// `claude plugin` so the internal format can change without breaking this.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, chmodSync, statSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const PKG = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
const MARKETPLACE = 'sumitsubo';
const DEFAULT_SOURCE = 'kurodaSensei/sumitsubo';
const STACKS = ['nuxt', 'react', 'shopify', 'wordpress'];
const WIN = process.platform === 'win32';

// ---------- args ----------
function parseArgs(argv) {
  const o = { cmd: 'install', stack: null, scope: 'user', from: DEFAULT_SOURCE, sandbox: false, sandboxDir: null,
    noSsh: false, rewrite: true, dryRun: false, yes: false, core: false, keep: true };
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith('-')) o.cmd = rest.shift();
  while (rest.length) {
    const a = rest.shift();
    const val = () => { const v = rest.shift(); if (!v || v.startsWith('--')) die(`${a} needs a value`); return v; };
    if (a === '--stack') o.stack = val().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--scope') o.scope = val();
    else if (a === '--from') o.from = val();
    else if (a === '--sandbox') { o.sandbox = true; if (rest[0] && !rest[0].startsWith('-')) o.sandboxDir = rest.shift(); }
    else if (a === '--no-ssh') o.noSsh = true;
    else if (a === '--no-rewrite') o.rewrite = false;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--yes' || a === '-y') o.yes = true;
    else if (a === '--core') o.core = true;
    else if (a === '--help' || a === '-h') o.cmd = 'help';
    else if (a === '--version' || a === '-v') o.cmd = 'version';
    else die(`unknown option ${a} (see --help)`);
  }
  if (!['user', 'project', 'local'].includes(o.scope)) die(`--scope must be user, project or local`);
  for (const s of o.stack ?? []) if (!STACKS.includes(s)) die(`unknown stack "${s}" (${STACKS.join(', ')})`);
  return o;
}

const HELP = `sumitsubo ${PKG.version} — install and maintain the Sumitsubo framework for Claude Code

Usage
  npx sumitsubo [install] [options]   core + design + companions + detected stack pack
  npx sumitsubo doctor                 read-only check of the installation
  npx sumitsubo update                 pull the latest version of every installed plugin
  npx sumitsubo uninstall [-y]         remove every plugin from the sumitsubo marketplace

Options
  --stack nuxt,react,shopify,wordpress  stack packs to install (default: detected in this folder)
  --core                                only the core plugin (sumi), no design layer
  --scope user|project|local            where Claude Code records the install (default: user)
  --from <path|owner/repo>              marketplace source (default: ${DEFAULT_SOURCE}); a local
                                        checkout tests unpublished changes
  --sandbox [dir]                       install into a throwaway Claude profile (CLAUDE_CONFIG_DIR);
                                        your real configuration is never touched
  --no-ssh                              simulate a machine without GitHub SSH keys (testing)
  --no-rewrite                          do not route GitHub clones through HTTPS (testing)
  --dry-run                             print the commands without running them
  -y, --yes                             answer yes to confirmations

Docs: https://sumitsubo-docs.vercel.app`;

// ---------- output ----------
const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const dim = c(2), bold = c(1), green = c(32), red = c(31), yellow = c(33);
const ok = (m) => console.log(`${green('✓')} ${m}`);
const warn = (m) => console.log(`${yellow('!')} ${m}`);
const bad = (m) => console.log(`${red('✗')} ${m}`);
const step = (m) => console.log(`\n${bold(m)}`);
function die(m) { console.error(`${red('sumitsubo:')} ${m}`); process.exit(1); }

// ---------- environment ----------
// GitHub sources are cloned by Claude Code itself. Older Claude Code versions
// clone `github` sources over SSH with no HTTPS fallback, which fails on a
// machine without SSH keys. Instead of asking the user to change their global
// git config, the rewrite is passed through git's GIT_CONFIG_* environment
// variables, so it applies only to the commands this installer runs.
function childEnv(o) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  if (o.sandbox) env.CLAUDE_CONFIG_DIR = o.sandboxDir;
  if (o.rewrite) {
    let n = Number(env.GIT_CONFIG_COUNT) || 0;
    for (const from of ['git@github.com:', 'ssh://git@github.com/']) {
      env[`GIT_CONFIG_KEY_${n}`] = 'url.https://github.com/.insteadOf';
      env[`GIT_CONFIG_VALUE_${n}`] = from;
      n++;
    }
    env.GIT_CONFIG_COUNT = String(n);
  }
  if (o.noSsh) {
    if (WIN) die('--no-ssh is only available on macOS and Linux');
    const bin = mkdtempSync(join(tmpdir(), 'sumi-nossh-'));
    const f = join(bin, 'ssh');
    writeFileSync(f, '#!/bin/sh\necho "git@github.com: Permission denied (publickey)." >&2\nexit 255\n');
    chmodSync(f, 0o755);
    env.PATH = `${bin}:${env.PATH}`;
  }
  return env;
}

function claude(o, args, { quiet = false, allowFail = false } = {}) {
  const shown = `claude ${args.join(' ')}`;
  if (o.dryRun && !args.includes('--json')) { console.log(dim(`  $ ${shown}`)); return { ok: true, out: '' }; }
  if (!quiet) console.log(dim(`  $ ${shown}`));
  const r = spawnSync('claude', args, { env: o.env, encoding: 'utf8', shell: WIN, timeout: 10 * 60 * 1000 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const success = r.status === 0;
  if (!success && !allowFail) {
    console.log(out.trim().split('\n').map((l) => `    ${l}`).join('\n'));
    explainFailure(out);
    die(`command failed: ${shown}`);
  }
  return { ok: success, out, stdout: r.stdout ?? '' };
}

function lastJson(text, fallback) {
  const t = text.trim();
  try { return JSON.parse(t); } catch {}
  const lines = t.split('\n').reverse();
  for (const l of lines) { try { return JSON.parse(l); } catch {} }
  const i = t.indexOf('['); if (i >= 0) { try { return JSON.parse(t.slice(i)); } catch {} }
  return fallback;
}

function explainFailure(out) {
  if (/publickey|Host key verification|ssh:|could not read Username/i.test(out)) {
    console.log(`\n${yellow('This looks like a GitHub SSH problem.')} Update Claude Code (claude update) and retry,`);
    console.log(`or route GitHub through HTTPS for every tool with:`);
    console.log(`  git config --global url."https://github.com/".insteadOf git@github.com:`);
  }
}

// ---------- checks ----------
function prerequisites(o) {
  step('Prerequisites');
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 18) die(`Node ${process.versions.node} found; Node 18 or newer is required`);
  ok(`Node ${process.versions.node}`);
  const g = spawnSync('git', ['--version'], { encoding: 'utf8', shell: WIN });
  if (g.status !== 0) die('git not found — install git and retry');
  ok(g.stdout.trim());
  const v = spawnSync('claude', ['--version'], { env: o.env, encoding: 'utf8', shell: WIN });
  if (v.status !== 0) die('Claude Code not found — install it first: https://docs.claude.com/en/docs/claude-code');
  ok(`Claude Code ${v.stdout.trim()}`);
  if (o.sandbox) ok(`sandbox profile: ${o.sandboxDir}`);
}

function detectStack(dir) {
  const has = (p) => existsSync(join(dir, p));
  const any = (re) => { try { return readdirSync(dir).some((f) => re.test(f)); } catch { return false; } };
  const found = [];
  if (any(/^nuxt\.config\./)) found.push('nuxt');
  if (any(/^next\.config\./) || has('app/layout.tsx') || has('src/app/layout.tsx')) found.push('react');
  if (has('config/settings_schema.json') && has('sections')) found.push('shopify');
  if (has('theme.json') || has('functions.php') || (has('style.css') && /Theme Name:/i.test(safeRead(join(dir, 'style.css'))))) found.push('wordpress');
  return found;
}
const safeRead = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };

function marketplaces(o) { return lastJson(claude(o, ['plugin', 'marketplace', 'list', '--json'], { quiet: true, allowFail: true }).stdout, []); }
function installed(o) { return lastJson(claude(o, ['plugin', 'list', '--json'], { quiet: true, allowFail: true }).stdout, []); }

// Plugins the marketplace should have produced for what is installed: every
// installed @sumitsubo plugin plus the transitive closure of its dependencies.
function expectedSet(location, roots) {
  const mk = JSON.parse(readFileSync(join(location, '.claude-plugin/marketplace.json'), 'utf8'));
  const byName = new Map(mk.plugins.map((p) => [p.name, p]));
  const deps = (name) => {
    const p = byName.get(name);
    if (!p || typeof p.source !== 'string') return [];
    const pj = JSON.parse(safeRead(join(location, p.source, '.claude-plugin/plugin.json')) || '{}');
    return pj.dependencies ?? [];
  };
  const out = new Set();
  const visit = (n) => { if (out.has(n)) return; out.add(n); deps(n).forEach(visit); };
  roots.forEach(visit);
  return { set: out, byName, mk };
}

function countFiles(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.in_use' || e.name === '.git' || e.name === 'node_modules') continue;
    n += e.isDirectory() ? countFiles(join(dir, e.name)) : 1;
  }
  return n;
}

// "Successfully installed" has lied before (a partial checkout reported success),
// so verification looks at the files on disk, never at the CLI's message.
function verify(o, { quiet = false } = {}) {
  const mp = marketplaces(o).find((m) => m.name === MARKETPLACE);
  if (!mp) { bad('the sumitsubo marketplace is not registered'); return { ok: false, count: 0 }; }
  const list = installed(o).filter((p) => p.id?.endsWith(`@${MARKETPLACE}`));
  const own = list.map((p) => p.id.split('@')[0]);
  const { set, byName } = expectedSet(mp.installLocation, own);
  let good = true, count = 0; const broken = [];
  for (const name of [...set].sort()) {
    const entry = list.find((p) => p.id === `${name}@${MARKETPLACE}`);
    const def = byName.get(name);
    const problem = (() => {
      if (!entry) return 'missing (dependency was not installed)';
      if (entry.enabled === false) return 'installed but disabled';
      if (entry.errors?.length) return entry.errors[0];
      // A local-path marketplace loads its own plugins in place from the checkout.
      if (entry.readFromFolder) return existsSync(entry.readFromFolder) ? null : `source folder missing: ${entry.readFromFolder}`;
      const dir = entry.installPath;
      if (!dir || !existsSync(dir)) return 'install folder missing';
      if (typeof def?.source === 'string') {
        const src = join(mp.installLocation, def.source);
        if (existsSync(src)) {
          const want = countFiles(src), got = countFiles(dir);
          if (got < want) return `incomplete: ${got} of ${want} files`;
        }
        return null;
      }
      const hasManifest = existsSync(join(dir, '.claude-plugin/plugin.json'));
      const hasSkill = existsSync(join(dir, 'SKILL.md'));
      const hasSkills = existsSync(join(dir, 'skills')) && statSync(join(dir, 'skills')).isDirectory();
      if (!(hasSkill || (hasManifest && hasSkills) || hasSkills)) return 'incomplete: no SKILL.md or skills/ in the install folder';
      return null;
    })();
    if (problem) { good = false; const depOnly = Boolean(entry?.errorDetails?.length) && entry.errorDetails.every((e) => e.type === 'dependency-unsatisfied');
      if (!depOnly) broken.push({ name, scope: entry?.scope ?? 'user', installed: Boolean(entry) }); bad(`${name}: ${problem}`); }
    else { count++; if (!quiet) ok(`${name} ${dim(entry.version ?? '')}`); }
  }
  return { ok: good && set.size > 0, broken, count, total: set.size, source: mp.repo ?? mp.path ?? mp.url ?? mp.source };
}

// ---------- commands ----------
function install(o) {
  prerequisites(o);
  const stacks = o.stack ?? detectStack(process.cwd());
  const plugins = [o.core ? 'sumi' : 'sumi-design', ...stacks.map((s) => `sumi-${s}`)];
  step('Plan');
  console.log(`  plugins: ${plugins.join(', ')} ${dim('(+ their companions)')}`);
  console.log(`  stack:   ${stacks.length ? stacks.join(', ') + (o.stack ? '' : dim(' (detected)')) : dim('none detected — add one later with --stack')}`);
  console.log(`  scope:   ${o.scope}`);

  step('Marketplace');
  const from = /^[\w.-]+\/[\w.-]+$/.test(o.from) || /^(https?|git)[:@]/.test(o.from) ? o.from : resolve(o.from);
  const existing = marketplaces(o).find((m) => m.name === MARKETPLACE);
  if (existing) {
    const src = existing.repo ?? existing.path ?? existing.url;
    ok(`already registered from ${src}`);
    if (o.from !== DEFAULT_SOURCE && src !== from) warn(`--from ${from} ignored: remove the existing marketplace first (npx sumitsubo uninstall)`);
    claude(o, ['plugin', 'marketplace', 'update', MARKETPLACE]);
  } else {
    claude(o, ['plugin', 'marketplace', 'add', from, '--scope', o.scope]);
  }

  step('Plugins');
  for (const p of plugins) claude(o, ['plugin', 'install', `${p}@${MARKETPLACE}`, '--scope', o.scope]);
  if (o.dryRun) { console.log(dim('\n(dry run: nothing was installed)')); return; }

  step('Verify (files on disk, not the CLI message)');
  const v = verify(o);
  if (!v.ok) die('the installation is incomplete — see the lines above, then run: npx sumitsubo doctor');
  step(green(`Sumitsubo is installed: ${v.count} plugins verified.`));
  if (o.sandbox) {
    console.log(`  Try it:   CLAUDE_CONFIG_DIR=${o.sandboxDir} claude   ${dim('(asks you to log in: it is a fresh profile)')}`);
    console.log(`  Clean up: rm -rf ${o.sandboxDir}`);
  } else {
    console.log('  1. Restart Claude Code (plugins load at startup).');
    console.log('  2. In your project: /sumi:init, then /sumi:doctor.');
    if (!stacks.length) console.log(`  Stack pack later: npx sumitsubo --stack ${STACKS.join('|')}`);
  }
}

function doctor(o) {
  prerequisites(o);
  step('Installation');
  const v = verify(o);
  if (!v.ok) { console.log(`\nFix: npx sumitsubo ${v.total ? 'update' : 'install'}`); process.exit(1); }
  step(green(`${v.count} plugins verified`) + dim(` · marketplace from ${v.source}`));
  console.log('  In a project, /sumi:doctor also checks .sumi/ and the managed CLAUDE.md block.');
}

function update(o) {
  prerequisites(o);
  step('Update');
  claude(o, ['plugin', 'marketplace', 'update', MARKETPLACE]);
  for (const p of installed(o).filter((x) => x.id?.endsWith(`@${MARKETPLACE}`))) {
    const args = ['plugin', 'update', p.id];
    if (p.scope && p.scope !== 'user') args.push('--scope', p.scope);
    claude(o, args, { allowFail: true });
  }
  if (o.dryRun) return;
  step('Verify');
  let v = verify(o);
  if (!v.ok && v.broken.length) {
    // `plugin update` is a no-op when the version did not change, so a damaged
    // install of the current version is repaired by reinstalling just that plugin.
    step('Repair');
    for (const b of v.broken) {
      if (b.installed) claude(o, ['plugin', 'uninstall', `${b.name}@${MARKETPLACE}`, '--scope', b.scope], { allowFail: true });
      claude(o, ['plugin', 'install', `${b.name}@${MARKETPLACE}`, '--scope', b.scope]);
    }
    step('Verify again');
    v = verify(o, { quiet: true });
  }
  if (!v.ok) die('some plugins are still missing or incomplete — reinstall with: npx sumitsubo uninstall -y && npx sumitsubo');
  step(green(`${v.count} plugins up to date.`) + ' Restart Claude Code, then run /sumi:sync in each project.');
}

async function uninstall(o) {
  prerequisites(o);
  const list = installed(o).filter((p) => p.id?.endsWith(`@${MARKETPLACE}`));
  step('Uninstall');
  if (!list.length) ok('no sumitsubo plugins installed');
  else console.log(`  ${list.length} plugins: ${list.map((p) => p.id.split('@')[0]).join(', ')}`);
  if (!o.yes && !o.dryRun) {
    if (!process.stdin.isTTY) die('pass --yes to confirm in a non-interactive shell');
    const rl = (await import('node:readline/promises')).createInterface({ input: process.stdin, output: process.stdout });
    const a = await rl.question('Remove them and the sumitsubo marketplace? [y/N] '); rl.close();
    if (!/^y(es)?$/i.test(a.trim())) { console.log('Nothing removed.'); return; }
  }
  // Dependents first, so nothing is removed while another plugin still needs it.
  const rank = (id) => (/^sumi-(nuxt|react|shopify|wordpress)@/.test(id) ? 0 : id.startsWith('sumi-design@') ? 1 : id.startsWith('sumi@') ? 2 : 3);
  for (const p of [...list].sort((a, b) => rank(a.id) - rank(b.id))) {
    claude(o, ['plugin', 'uninstall', p.id, '--scope', p.scope ?? 'user'], { allowFail: true });
  }
  claude(o, ['plugin', 'marketplace', 'remove', MARKETPLACE], { allowFail: true });
  step(green('Sumitsubo removed.') + dim(' Project files (.sumi/, CLAUDE.md) were left as they are.'));
}

// ---------- main ----------
const o = parseArgs(process.argv.slice(2));
if (o.cmd === 'help') { console.log(HELP); process.exit(0); }
if (o.cmd === 'version') { console.log(PKG.version); process.exit(0); }
if (o.sandbox) {
  o.sandboxDir = o.sandboxDir ? (isAbsolute(o.sandboxDir) ? o.sandboxDir : resolve(o.sandboxDir)) : mkdtempSync(join(tmpdir(), 'sumi-sandbox-'));
  mkdirSync(o.sandboxDir, { recursive: true });
}
o.env = childEnv(o);
console.log(`${bold('Sumitsubo')} ${dim(`墨壺 · installer ${PKG.version}`)}`);
const commands = { install, doctor, update, uninstall };
if (!commands[o.cmd]) die(`unknown command "${o.cmd}" (see --help)`);
await commands[o.cmd](o);
