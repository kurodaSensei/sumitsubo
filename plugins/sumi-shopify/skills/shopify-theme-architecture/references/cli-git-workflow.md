# Shopify CLI and Git Workflow

Flags change between CLI releases. Confirm with `shopify theme <command> --help` and verify against shopify.dev when in doubt.

## Environments

| Theme | Purpose | Who writes |
|---|---|---|
| Development theme | Created by `shopify theme dev`, tied to your CLI session | You, automatically |
| Unpublished staging / QA theme | Client review, QA, a11y and perf audits | You via `push --theme <id>` |
| Live (published) theme | Customers | Merchant via customizer; code only through an agreed release step |

Optional `shopify.theme.toml` defines named environments (store, theme id, ignore lists) so commands become `shopify theme push -e staging`. Never commit tokens or passwords; use the CLI login or environment variables.

## Command reference

```bash
shopify theme list --store my-store                 # ids, roles (live, unpublished, development)
shopify theme dev --store my-store                  # hot reload preview on 127.0.0.1:9292
shopify theme dev --theme-editor-sync               # two-way sync of JSON edited in the editor during dev
shopify theme check                                 # lint; --auto-correct for safe fixes; -o json for CI
shopify theme push --unpublished --json             # create a new unpublished theme, print its id
shopify theme push --theme 123456789 --nodelete     # update without deleting remote-only files
shopify theme push --theme 123456789 --ignore 'templates/*.json' --ignore 'config/settings_data.json'
shopify theme pull --theme 123456789 --only 'templates/*.json' --only 'sections/*.json' --only 'config/settings_data.json'
shopify theme package                               # zip for upload or handoff
shopify theme profile --url /products/handle        # Liquid render profiling (newer CLI; verify availability)
shopify theme console                               # Liquid REPL against store data (verify availability)
```

Hard rules:
- No `--allow-live`, no `shopify theme publish` unless the owner explicitly requests it in the current session.
- `--nodelete` on any push to a shared theme.
- Never `push` a JSON template or `settings_data.json` from a stale local copy to a theme the merchant edits.

## `.shopifyignore`

Same glob syntax as `.gitignore`, applied to push, pull and dev. Typical entries:

```
node_modules/
src/
*.md
package*.json
.github/
# Optional, when merchants own content on the target theme:
# config/settings_data.json
# templates/*.json
```

## Git workflow

1. `main` mirrors what is (or will be) live. Feature branches per change.
2. Customizer edits happen on the store, not in git. Before branching or pushing, pull JSON from the theme being edited and commit it as its own commit (`chore: sync customizer JSON`) so code diffs stay readable.
3. Shopify's GitHub integration (Online Store > Themes > Add theme > Connect from GitHub) binds a branch to a theme and commits customizer changes back to that branch. If used, never force-push that branch, and expect bot commits; rebase feature branches on it often.
4. Release: merge to the connected branch or push to a fresh unpublished theme, QA, then the merchant (or owner) publishes. Keep the previous live theme as rollback; do not delete it.

## Resolving JSON conflicts

- Templates and `settings_data.json` are data. On conflict, take the remote (merchant) side, then reapply only your structural change (new section entry, new key in `order`).
- Shopify may rewrite JSON on save (key order, a generated header comment). Do not fight formatting; diff semantically.
- When you add a new section to a template that merchants edit, add it to both the section map and `order`, with defaults that render cleanly.
- Removing a section type or block type that templates reference breaks those templates in the editor. Search `templates/` and `sections/*.json` for the type before deleting a file.

## Theme check

- Run locally and in CI (`shopify theme check -o json` or the Theme Check GitHub Action; verify current action name).
- Treat errors as blockers: missing templates, unknown filters/objects, invalid schema JSON, missing translation keys, `img_url` and other deprecated filters, parser-blocking scripts, images without width/height.
- Disabling a check requires a comment with the reason, scoped to a file or line (`{% # theme-check-disable CheckName %}` ... `{% # theme-check-enable CheckName %}`), not global.

## Before handing a preview to a client

- Unpublished theme pushed with current JSON from live (or explicit agreement that preview content differs).
- Theme check clean, Lighthouse/a11y spot check on home, collection, product, cart.
- Preview link via `theme share` or the admin preview URL; note it expires with the dev theme.
