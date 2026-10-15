# Changelog

## Unreleased

- **Evidence in one command**: `scripts/evidence.mjs <url> --routes /,/x` — screenshots (390 px and 1440 px), axe (WCAG 2.2 A/AA) and Lighthouse mobile per route, checked against `performanceBudget` (LCP, CLS, TBT as the INP lab proxy, initial JS). Writes `.sumi/evidence/<timestamp>/`, prints the table for the feature file, exits 2 when a gate fails. Its dependencies install once into `~/.sumi/evidence-runtime`, never into the project. `/sumi:ship` runs it for UI work. (#7)
- **One status line** for the whole framework: `墨 balanced · Opus · checkout 2/3 · ponytail lite · ⎇ feat/checkout` — model profile, session model, active feature and progress, Ponytail mode, branch (protected branches highlighted). No network, no git spawn (~80 ms). The SessionStart hook keeps it at `~/.sumi/statusline.mjs`, a path that survives plugin updates; `/sumi:init` offers to enable it in `.claude/settings.local.json`. (#11)
- **Skill evals** (`npm run evals`): trigger cases for every plugin (does the right skill fire; does none fire on trivia) and a slop-rate case for `sumi-design` (a generated landing hero judged against the anti-slop catalog, with and without the plugin). `scripts/run-evals.mjs` stages each plugin with its real dependencies, because `claude plugin eval` loads only the plugin under test and a plugin with unmet dependencies does not load at all. On-demand CI workflow (`evals.yml`, needs `ANTHROPIC_API_KEY`). First baseline, one run per case: 4/9 trigger cases pass (advisory questions answered without loading the skill); slop case passes with `sumi-design` (3/3 judges) and fails without it (2/3 judges flag it). `sumi:workflow` description now asks to be loaded before exploring. (#12)
- `sumi-react:react-spa`: Vite single-page apps — React Router v7 data mode, lazy routes, auth in one loader, Zustand with granular selectors, TanStack Query for server state, `VITE_` env safety, SPA rewrites, PWA, Tauri/Capacitor shells. The installer and `/sumi:init` now detect Vite + React projects. (#10)
- `sumi-nuxt:tailwind-craft`: guidance for projects still on Tailwind v3. (#10)
- Installer: `--json` for `install`, `doctor` and `update` — human output goes to stderr and stdout carries one JSON line (`ok`, `plugins`, `problems`, `marketplace`). (#16)

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
