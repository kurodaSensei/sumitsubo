// Hook tests: each case builds a throwaway git repo, pipes a tool call to the hook and checks the decision.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scripts = fileURLToPath(new URL('../plugins/sumi/hooks/scripts/', import.meta.url));
const env = {
  ...process.env,
  GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t',
  GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
};
const git = (cwd, ...a) => spawnSync('git', a, { cwd, env, encoding: 'utf8' });

function repo({ commit = true, config = true, branch = 'main' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'sumi-hook-'));
  git(dir, 'init', '-q', '-b', 'main');
  if (config) {
    mkdirSync(join(dir, '.sumi'));
    writeFileSync(join(dir, '.sumi', 'config.json'), '{}');
  }
  if (commit) git(dir, 'commit', '-q', '--allow-empty', '-m', 'init');
  if (branch !== 'main') git(dir, 'switch', '-q', '-c', branch);
  return dir;
}

function run(script, dir, tool_input) {
  const r = spawnSync('node', [join(scripts, script)], {
    input: JSON.stringify({ cwd: dir, tool_input }),
    env: { ...env, CLAUDE_PROJECT_DIR: dir },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput.permissionDecision : 'allow';
}

// The way Claude Code commits; the body mentions guarded commands but only the commit itself counts.
const heredoc = `git commit -m "$(cat <<'EOF'
fix(sumi): close bypasses

git push origin main is now denied
git reset --hard
EOF
)"`;
const feat = { branch: 'feat/x' };
const gitCases = [
  ['allow', heredoc, feat],
  ['deny', heredoc],
  ['allow', 'git commit -m "docs: never git push origin main"', feat],
  ['allow', 'echo "git push origin main"'],
  ['allow', 'gh pr create --body "run git push origin main"'],
  ['deny', '/usr/bin/git push origin main'],
  ['allow', 'git log --oneline | grep gitk'],
  ['deny', '\\git commit -m x'],
  ['deny', 'git --config-env=x=Y push origin main'],
  ['deny', 'git --namespace foo push origin main'],
  ['ask', 'git --git-dir=.git push origin main'],
  ['ask', 'git --work-tree . commit -m x'],
  ['ask', 'git --version'],
  ['deny', 'git -c user.name=x commit -m x'],
  ['deny', 'git --no-pager commit -m x'],
  ['deny', 'git -c core.x=y push origin main'],
  ['deny', 'bash -c "git push origin main"'],
  ['deny', "sh -c 'git commit -m x'"],
  ['deny', 'eval "git push origin main"'],
  ['deny', 'echo $(git push origin main)'],
  ['deny', 'git push origin main'],
  ['deny', 'git push origin HEAD:main'],
  ['deny', 'git commit -m x'],
  ['deny', 'git commit -m x', { commit: false }],
  ['deny', 'git push origin :main'],
  ['deny', 'git push --delete origin main'],
  ['ask', 'git push --force origin feat/x', { branch: 'feat/x' }],
  ['ask', 'git reset --hard'],
  ['ask', 'git clean -fd'],
  ['ask', 'git push --mirror'],
  ['allow', 'git push -u origin feat/x', { branch: 'feat/x' }],
  ['allow', 'git push --force-with-lease origin feat/x', { branch: 'feat/x' }],
  ['allow', 'git switch -c feat/x && git commit -m x'],
  ['allow', 'git status'],
  ['allow', 'echo git'],
  ['allow', 'git push origin main', { config: false }],
  ['allow', 'git commit -m x', { config: false }],
];
for (const [want, command, opts] of gitCases) {
  test(`guard-git ${want}: ${command}${opts ? ' ' + JSON.stringify(opts) : ''}`, () => {
    assert.equal(run('guard-git.mjs', repo(opts), { command }), want);
  });
}

const key = 'AKIA' + 'ABCDEFGHIJKLMNOP';
test('guard-edit denies an AWS key', () => {
  const dir = repo({ branch: 'feat/x' });
  assert.equal(run('guard-edit.mjs', dir, { file_path: 'a.js', content: `k="${key}"` }), 'deny');
});
test('guard-edit allows a placeholder key', () => {
  const dir = repo({ branch: 'feat/x' });
  assert.equal(run('guard-edit.mjs', dir, { file_path: 'a.js', content: 'k="sk-' + 'x'.repeat(38) + '"' }), 'allow');
});
test('guard-edit denies code edits on main', () => {
  assert.equal(run('guard-edit.mjs', repo(), { file_path: 'a.js', content: 'ok' }), 'deny');
});
test('guard-edit allows bookkeeping edits on main', () => {
  assert.equal(run('guard-edit.mjs', repo(), { file_path: '.sumi/tasks/x.md', content: 'ok' }), 'allow');
});
test('guard-edit allows a secret in a git-ignored .env', () => {
  const dir = repo({ branch: 'feat/x' });
  writeFileSync(join(dir, '.gitignore'), '.env\n');
  assert.equal(run('guard-edit.mjs', dir, { file_path: '.env', content: `AWS=${key}` }), 'allow');
});
