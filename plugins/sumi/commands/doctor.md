---
description: Read-only diagnosis of the Sumitsubo install and this project's setup — marketplace source, plugin versions against their source, companions, and the project's own config. Reports and points at the command that fixes each row; changes nothing.
argument-hint: ""
allowed-tools: Read, Glob, Grep, Bash
---

**This command never writes.** Every other `/sumi:*` command changes something;
this one only looks. If a row needs fixing, name the command that fixes it and
stop. That is the whole contract — a diagnosis you cannot trust to be
read-only is one you hesitate to run.

1. **Install.** `claude plugin list --json` and `claude plugin marketplace list --json`.
   Both return arrays. For every entry whose `id` ends `@sumitsubo`, read
   `version`, `enabled`, `scope` and — when present — `folderVersion` and
   `readFromFolder`.

2. **Marketplace source.** From the marketplace list, report the `sumitsubo`
   entry's `source`. `directory` means it is wired to a local checkout, so
   edits there are live and `claude plugin marketplace update sumitsubo` is
   what republishes them; `github` means it tracks the published repo. Neither
   is wrong — but which one it is governs every other row, and nothing in the
   normal flow ever shows it.

3. **Version drift.** A plugin whose `version` is behind its `folderVersion` is
   running from a cached copy older than the source it reads. The skills and
   commands added since are simply absent from the session, with no error and
   no sign. List every one as `behind`, with both numbers, and give the single
   command that fixes them all: `claude plugin marketplace update sumitsubo`
   followed by a restart.

4. **Enablement.** Report any `@sumitsubo` plugin installed but `enabled:
   false`, with `claude plugin enable <name>@sumitsubo`. Note the expected
   shape rather than a fixed count — the two core plugins, the stack packs the
   project needs, and the companions they pull as dependencies.

5. **Companions.** Do not re-derive what `/sumi-design:deps` already does. Say
   how many `@sumitsubo` companions are installed and enabled, and if any look
   wrong, point at `/sumi-design:deps`.

   `check-companions.mjs` resolves them against their upstream repos, but it
   lives in the framework repository and is NOT packaged into the plugin — on
   a normal install there is no `scripts/` directory to run it from. So:
   suggest it only when step 2 found the marketplace is a local checkout, and
   build the path from that entry's `installLocation`, never from
   `${CLAUDE_PLUGIN_ROOT}`. Otherwise say the upstream check is not available
   from an installed copy and move on. It is also the one check that needs the
   network, so never run it unasked.

6. **This project.** Only if the working directory is a project, not the
   framework repo:
   - `.sumi/config.json` — present? `stack`, `modelProfile` and the line budget;
     any key missing against `${CLAUDE_PLUGIN_ROOT}/templates/config.json`.
   - `CLAUDE.md` — is there a `sumi:begin`/`sumi:end` block, and does its
     version match the current template? If absent, `/sumi:init`; if behind,
     `/sumi:sync`.
   - `.sumi/tasks/` — active feature files, and `.sumi/reviews/` — whether the
     most recent receipt is burned.
   State plainly when the directory is the framework repo itself and these rows
   do not apply, rather than reporting them as missing.

7. **Report** per `sumi:output`. Subject: the marketplace source and the plugin
   count. Result: the number of rows needing attention, or that everything is
   current. Body: one table of area · state · fix, with `ok` rows kept — the
   value of a diagnosis is partly in what it rules out. Next step: the single
   command that clears the most rows, usually the marketplace update.

Report a row as `ok` only when you have the output that shows it. Anything you
could not read is `unknown`, never `ok`.
