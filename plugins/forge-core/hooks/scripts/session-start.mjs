// Injects a short status of active forge feature files at session start.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readInput, projectRoot, loadConfig, currentBranch } from './lib.mjs';

const input = readInput();
const root = projectRoot(input);
const config = loadConfig(root);
if (!config) process.exit(0);

const lines = [];
const branch = currentBranch(root);
const stack = Array.isArray(config.stack) ? config.stack.join(', ') : String(config.stack ?? '');
const protectedBranches = config.protectedBranches ?? ['main', 'master'];
lines.push(`forge project. Branch: ${branch ?? 'unknown'}. Stack: ${stack || 'not set'}. Line budget per slice: ${config.lineBudget ?? 400}.`);
if (branch && protectedBranches.includes(branch) && config.requireFeatureBranch !== false) {
  lines.push(`You are on protected branch "${branch}": create a feature branch before editing code.`);
}

const tasksDir = join(root, '.forge', 'tasks');
if (existsSync(tasksDir)) {
  for (const file of readdirSync(tasksDir).filter((f) => f.endsWith('.md')).sort()) {
    const text = readFileSync(join(tasksDir, file), 'utf8');
    const status = text.match(/^status:\s*(\w+)/m)?.[1];
    if (status !== 'active' && status !== 'blocked') continue;
    const title = text.match(/^title:\s*(.+)$/m)?.[1] ?? file;
    const open = (text.match(/^\s*- \[ \]/gm) ?? []).length;
    const done = (text.match(/^\s*- \[x\]/gim) ?? []).length;
    const log = text.split('## Process log')[1]?.split('\n## ')[0] ?? '';
    const lastLog = log.trim().split('\n').filter((l) => l.startsWith('- ')).pop() ?? '';
    lines.push(`Active feature (${status}): ${title} — ${done} done, ${open} open — .forge/tasks/${file}. Last log: ${lastLog.slice(0, 200)}`);
  }
}
if (lines.length > 1 || existsSync(tasksDir)) {
  lines.push('Resume with /forge-core:feature resume <slug>, or follow forge-core:workflow for new requests.');
}

process.stdout.write(
  JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lines.join('\n') } }),
);
