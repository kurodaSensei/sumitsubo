// Band state: one throwaway repo walked through a slice — edits, a burned
// receipt, more edits, an evidence run — checking what the band would show.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../plugins/sumi/scripts/band.mjs', import.meta.url));
const env = {
  ...process.env,
  GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t',
  GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
};
const git = (cwd, ...a) => spawnSync('git', a, { cwd, env, encoding: 'utf8' }).stdout.trim();
const band = (cwd) => {
  const r = spawnSync('node', [script], { cwd, env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

test('outside a Sumitsubo project the band has nothing to show', () => {
  assert.equal(band(mkdtempSync(join(tmpdir(), 'sumi-band-'))), null);
});

test('feature, slice lines, receipt and evidence follow the work', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sumi-band-'));
  git(dir, 'init', '-q', '-b', 'main');
  mkdirSync(join(dir, '.sumi', 'tasks'), { recursive: true });
  writeFileSync(join(dir, '.sumi', 'config.json'), JSON.stringify({ lineBudget: 10, review: { exclude: ['package-lock.json'] } }));
  writeFileSync(join(dir, '.sumi', 'tasks', '2026-11-10-checkout.md'), 'status: active\n- [x] 1.1 a\n- [ ] 1.2 b\n- [ ] 1.3 c\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', 'init');
  git(dir, 'switch', '-q', '-c', 'feat/checkout');

  let s = band(dir);
  assert.deepEqual(s.feature, { slug: '2026-11-10-checkout', status: 'active', done: 1, total: 3 });
  assert.equal(s.lines, 0);
  assert.equal(s.budget, 10);
  assert.equal(s.receipt, null);
  assert.equal(s.evidence, null);

  // Three lines of code count; the excluded lockfile does not.
  writeFileSync(join(dir, 'a.js'), '1\n2\n3\n');
  writeFileSync(join(dir, 'package-lock.json'), 'x\n'.repeat(50));
  git(dir, 'add', '.');
  assert.equal(band(dir).lines, 3, 'staged and uncommitted edits count');
  git(dir, 'commit', '-q', '-m', 'a');
  assert.equal(band(dir).lines, 3);

  // A burned receipt at HEAD covers the work and restarts the slice.
  const sha = git(dir, 'rev-parse', '--short', 'HEAD');
  mkdirSync(join(dir, '.sumi', 'reviews'));
  writeFileSync(join(dir, '.sumi', 'reviews', `2026-11-10-${sha}.md`), 'verdict: approved\nburned: true\n');
  s = band(dir);
  assert.deepEqual(s.receipt, { id: `2026-11-10-${sha}`, state: 'current' });
  assert.equal(s.lines, 0);

  // An edit after it puts the receipt behind; the slice counts from the receipt.
  writeFileSync(join(dir, 'b.js'), '1\n2\n');
  assert.equal(band(dir).lines, 0, 'untracked files are not counted');
  git(dir, 'add', 'b.js');
  s = band(dir);
  assert.equal(s.receipt.state, 'behind');
  assert.equal(s.lines, 2);

  // An unburned receipt is open, whatever it says.
  writeFileSync(join(dir, '.sumi', 'reviews', '2026-11-11-abc1234.md'), 'verdict: changes requested\n');
  assert.equal(band(dir).receipt.state, 'open');

  // The newest evidence run wins; a route with problems fails it.
  for (const [id, problems] of [['2026-11-10T10-00', []], ['2026-11-10T11-00', ['LCP 3100 ms > 2500']]]) {
    mkdirSync(join(dir, '.sumi', 'evidence', id), { recursive: true });
    writeFileSync(join(dir, '.sumi', 'evidence', id, 'evidence.json'), JSON.stringify({ results: [{ route: '/', problems: [] }, { route: '/x', problems }] }));
  }
  assert.deepEqual(band(dir).evidence, { id: '2026-11-10T11-00', routes: 2, failed: 1 });
});
