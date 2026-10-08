# Contributing

Thanks for helping. Sumitsubo is small on purpose, so the bar for a change is: does it make the work better without adding process nobody asked for?

## Before you start

- **Bugs and install problems:** open an issue with the output of `npx sumitsubo doctor`.
- **Ideas and new skills:** open an issue first, so we agree on the shape before you write it.
- **Small fixes** (typos, broken links, clearer wording): a PR is enough.

## Setup

```bash
git clone https://github.com/kurodaSensei/sumitsubo.git && cd sumitsubo
node scripts/validate.mjs      # structure, versions, sources, references
npm run test:install           # installs your checkout in a throwaway Claude profile, without SSH
```

To use your checkout in Claude Code: `claude plugin marketplace add ./sumitsubo`. Plugins from a local marketplace load in place, so edits apply at the next session.

## Rules of the house

- **Skills:** `skills/<name>/SKILL.md`; the frontmatter `name` equals the folder name, and the `description` says *when* to use it. Keep it under ~260 lines and move depth to `references/`.
- **Commands** end with a report per `sumi:output`. Don't restate that contract inside the command.
- **Scripts and hooks:** Node, no dependencies, reference files with `${CLAUDE_PLUGIN_ROOT}` and never outside the plugin folder.
- **Companions** stay upstream: reference them in `marketplace.json` with an https `url` or `git-subdir` source. Never copy their files.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org) — `feat:`, `fix:`, `docs:`…
- **Deliberate simplifications** get a `ponytail:` comment that says when to extend them.

A new skill or command also needs its page in the [documentation site](https://github.com/kurodaSensei/sumitsubo-docs). Its sync fails on purpose until the page exists.

## Releases (maintainers)

`npm run release x.y.z`, add the CHANGELOG entry, merge. `release.yml` tests a clean install, tags, stages the npm package and creates the GitHub release; the version goes live when a maintainer approves it under npmjs.com → Staged Packages.
