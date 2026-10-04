// In Sumitsubo projects: keeps code edits off protected branches and blocks obvious secrets in written content.
import { resolve, relative, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readInput, projectRoot, loadConfig, currentBranch, decide } from './lib.mjs';

const input = readInput();
const root = projectRoot(input);
const config = loadConfig(root);
if (!config) process.exit(0);

const ti = input.tool_input ?? {};
const filePath = String(ti.file_path ?? ti.notebook_path ?? '');
if (!filePath) process.exit(0);
const abs = resolve(root, filePath);
const rel = relative(root, abs);
const insideProject = rel && !rel.startsWith('..') && !isAbsolute(rel);

const content = [ti.content, ti.new_string, ti.new_source, ...(Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string) : [])]
  .filter(Boolean)
  .join('\n');

// 1. Branch guard: only for files inside this project, and not for framework/design bookkeeping.
const bookkeeping = /^(\.sumi\/|\.git\/|design\/|CLAUDE\.md$|DESIGN\.md$|PRODUCT\.md$)/.test(rel ?? '');
const protectedBranches = config.protectedBranches ?? ['main', 'master'];
const branch = currentBranch(root);
if (insideProject && !bookkeeping && config.requireFeatureBranch !== false && branch && protectedBranches.includes(branch)) {
  decide('deny', `sumi guard: you are on protected branch "${branch}". Create a feature branch before editing code: git switch -c feat/<slug>`);
}

// 2. Secret guard. Local env files that git ignores are the right place for secrets, so they are allowed.
function gitIgnored(path) {
  try {
    execFileSync('git', ['check-ignore', '-q', path], { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
const isEnvFile = /(^|\/)\.env(\.[\w-]+)?$/.test(filePath);
if (isEnvFile && (/\.env\.(example|sample|template)$/.test(filePath) === false) && gitIgnored(abs)) process.exit(0);

const secretPatterns = [
  [/-----BEGIN (RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\b[sr]k_live_[0-9a-zA-Z]{20,}\b/, 'Stripe live secret key'],
  [/\bsk-(proj-|ant-)?[A-Za-z0-9_-]{32,}\b/, 'API secret key'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, 'GitHub token'],
  [/\bshpat_[a-fA-F0-9]{32}\b/, 'Shopify admin token'],
  [/"private_key"\s*:\s*"-----BEGIN/, 'service account key'],
];
for (const [re, label] of secretPatterns) {
  const match = content.match(re)?.[0];
  if (!match) continue;
  if (/(x{6,}|\*{6,}|0{12,}|your[_-]?key|example|placeholder)/i.test(match)) continue; // documentation placeholders
  decide('deny', `sumi guard: the content looks like it contains a ${label}. Put secrets in a git-ignored .env file or a secret manager and reference them by name.`);
}

process.exit(0);
