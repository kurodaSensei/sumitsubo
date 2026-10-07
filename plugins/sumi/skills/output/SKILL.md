---
name: output
description: The shape of what a Sumitsubo command prints when it finishes — header, body, the single next step, and the rules about numbers, omissions and language. Use when a `/sumi:*` or `/sumi-design:*` command reaches its reporting step, when writing or editing a command's final step, and whenever deciding how to summarize work back to the user.
---

# Command output

Every command ends by telling the user what happened. Before this skill each
command described that moment in its own words, so nine commands produced nine
shapes and the heaviest one, `/sumi:ship`, described none at all. This is the
one contract they all reference.

It governs the **final report**, not the conversation on the way there.

## Shape

Three parts, in this order. Nothing else is required and nothing else is
expected.

```
**<command> · <subject>**
<one sentence: the result>

<the body: a table, a short list, or a diff summary>

→ <the single next step>
```

**Header.** The command and what it ran on, bold, one line. The subject is a
branch, a feature slug, a file count, a path — whatever identifies *this* run.

**Result sentence.** The verdict, first, in one sentence. Not a recap of the
steps. A reader who stops here should still know the answer.

**Body.** Facts only, in whichever of these fits:

- **Table** when there are rows with the same fields — files changed, criteria
  and their evidence, lenses and their findings, plugins and their status.
- **Short list** when items have no shared fields.
- **Diff summary** when the change is to a file: counts and the lines that
  matter, never the whole file.

**Next step.** One line, beginning `→`. Exactly one. A runnable command when
there is one, in backticks. If the next move is the user's decision, say what
the decision is, not a menu of everything possible.

## Rules

These are the part that matters; the shape above is just where they land.

**Lead with the result.** The process is only interesting when it explains the
result. Never open with what you did in order to find out.

**Every number comes from something that ran.** A count, a duration, a score, a
size — if it was not measured in this session, it does not appear as if it was.
An estimate is labelled as one.

**State what was not done.** Skipped steps, criteria without evidence, checks
that did not run, parts of the request left out — these go in the report, with
the reason. A report that only lists successes is not a report.

**Never claim verification that did not happen.** "Tests pass" requires having
run them and seen them pass. If something is believed but unverified, say which
it is.

**The user's language, the project's identifiers.** Prose follows the user.
Commands, paths, file names, branch names, code and error text stay exactly as
they are — never translated.

**No decoration.** No emoji, no ASCII boxes, no banners. Status is a word:
`ok`, `blocked`, `open`, `skipped`, `n/a`. Terminals vary in width and font;
type and alignment survive, drawing does not.

**Short.** If the body runs past roughly fifteen lines, the command is
reporting its process instead of its result. The exception is a list whose
length is the point — every criterion, every finding, every changed file —
which is never truncated to look tidy.

## Writing a command's report step

A command's final step names its fields and defers the rest:

```markdown
N. **Report** per `sumi:output`. Subject: the branch. Body: a table of
   criteria × evidence, plus any criterion still open. Next step: the push and
   PR commands, or `/sumi:review` if the receipt is missing.
```

Do not restate the shape, the rules or the status words in a command. They live
here so that changing them changes every command at once, which is the whole
reason this file exists.
