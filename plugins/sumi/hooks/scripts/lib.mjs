// Shared helpers for Sumitsubo hooks. Hooks are opt-in per project: they only act
// when .sumi/config.json exists in the project root, so other repos are untouched.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

export function projectRoot(input) {
  return process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
}

export function loadConfig(root) {
  const file = join(root, '.sumi', 'config.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// symbolic-ref also works on an unborn branch (fresh repo), where rev-parse --abbrev-ref fails.
export function currentBranch(root) {
  const run = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    return run(['symbolic-ref', '--short', '-q', 'HEAD']);
  } catch {
    try {
      return run(['rev-parse', '--abbrev-ref', 'HEAD']); // detached HEAD
    } catch {
      return null;
    }
  }
}

export function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}
