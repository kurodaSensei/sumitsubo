# Changelog

## 0.6.1 — 2026-10-08

- Releases go through npm trusted publishing: `release.yml` runs `npm stage publish` (the permission the trusted publisher grants), and the version goes live when it is approved under **npmjs.com → sumitsubo → Staged Packages**.
- README and GUIA document that approval as the last step of every release.

## 0.6.0 — 2026-10-07

### Install
- **`npx sumitsubo`**: one-command installer published to npm. Installs the core, the design layer, the companions and the detected stack pack; verifies the installed files on disk; `doctor`, `update` (repairs damaged installs of the current version), `uninstall`, `--dry-run`. A thin wrapper over `claude plugin …`; never writes Claude Code's settings files.
- **Install without SSH keys**: Ponytail is now declared as `{"source":"url"}` over https instead of `{"source":"github"}`, which `claude plugin install` cloned over SSH with no fallback — on a machine without keys it failed and took `sumi`, `sumi-design` and every stack pack with it. Verified in a clean profile with SSH blocked: 21 plugins complete through `/plugin`, a manual clone and `npx`.
- **Test an install as a stranger**: `--sandbox` (throwaway profile via `CLAUDE_CONFIG_DIR`), `--no-ssh` (simulated machine without keys), `npm run test:install`.

### Release
- `npm run release <version>` bumps the installer, the marketplace, every plugin and the managed `CLAUDE.md` marker together.
- Merging a version bump to `main` tags it, publishes to npm, creates the GitHub release and asks the docs site to re-sync (`release.yml`).
- CI installs the checkout from scratch on every push, without SSH and without the installer's HTTPS rewrite.

### Validation
- `validate.mjs` fails on `github` companion sources, non-https companion URLs, version drift between the installer, the marketplace, the plugins and the managed block, and `${CLAUDE_PLUGIN_ROOT}` paths that escape the plugin folder.
- The managed `CLAUDE.md` marker had stayed at v0.5.0 through 0.5.1; it now moves with every release.

## 0.5.1
- `sumi:output` (one report contract for every command), `/sumi:doctor`, companion resolution in CI, author name.
