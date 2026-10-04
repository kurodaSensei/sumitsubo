#!/usr/bin/env bash
# Rename the framework from its working name to the final one.
# Usage: scripts/rename.sh <new-name>      e.g. scripts/rename.sh kata
#
# Renamed: plugin names and folders (forge-core → kata-core), the marketplace name,
# command/skill/agent namespaces (/forge-core:… → /kata-core:…) and prose mentions.
# Kept on purpose (stable identifiers so existing projects keep working without migration):
# the per-project state folder `.forge/`, the CLAUDE.md markers `forge:begin` / `forge:end`,
# the ledger at `~/.forge/design-ledger.json` and the FORGE_LEDGER env var.
set -euo pipefail
NEW="${1:?usage: scripts/rename.sh <new-name>}"
OLD="forge"
[[ "$NEW" =~ ^[a-z][a-z0-9-]*$ ]] || { echo "Name must be lowercase kebab-case"; exit 1; }
cd "$(dirname "$0")/.."
CAP="$(tr '[:lower:]' '[:upper:]' <<< "${NEW:0:1}")${NEW:1}"

for d in plugins/${OLD}-*; do
  target="plugins/${NEW}-${d#plugins/${OLD}-}"
  git mv "$d" "$target" 2>/dev/null || mv "$d" "$target"
done

grep -rIl --exclude-dir=.git -i -e "$OLD" . | grep -v '^./scripts/rename.sh$' | while read -r f; do
  NEW="$NEW" CAP="$CAP" perl -pi -e '
    s/(?<![\w.])forge-(?=[a-z])/$ENV{NEW}-/g;          # plugin names and namespaces
    s/\@forge\b/\@$ENV{NEW}/g;                            # marketplace in install commands
    s/(?<![\w.\/~-])forge(?![\w:\/.-])/$ENV{NEW}/g;       # bare word in prose and JSON values
    s/\bForge\b/$ENV{CAP}/g;
  ' "$f"
done
echo "Renamed ${OLD} → ${NEW}. Review: git diff --stat && node scripts/validate.mjs && claude plugin validate ."
