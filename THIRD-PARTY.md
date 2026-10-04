# Third-party companions

Sumitsubo does not copy or redistribute these projects. Its marketplace **references them from their upstream repositories** (whole plugins, or individual skill folders via `git-subdir`), so Claude Code downloads them from the original authors and they keep their own licenses and update from upstream. They are declared as dependencies of `sumi` / `sumi-design`.

| Companion plugins | Upstream | License | What is referenced |
|---|---|---|---|
| `impeccable` | github.com/pbakaus/impeccable | Apache-2.0 | The full plugin (`plugin/`) |
| `ponytail` | github.com/DietrichGebert/ponytail | MIT | The full plugin |
| `taste`, `taste-minimalist`, `taste-brutalist`, `taste-soft`, `taste-redesign` | github.com/Leonxlnx/taste-skill | MIT | 5 skill folders |
| `emil-design-eng`, `emil-review-animations`, `emil-animation-vocabulary` | github.com/emilkowalski/skill | MIT | 3 skill folders |
| `superpowers-debugging`, `superpowers-tdd`, `superpowers-verification`, `superpowers-worktrees`, `superpowers-review-intake` | github.com/obra/superpowers | MIT | 5 skill folders (no hooks, no session bootstrap) |

Not included on purpose: Anthropic's `frontend-design` plugin (a third design voice that overlaps with the direction process, Impeccable and Taste) and the rest of superpowers (its workflow competes with Sumitsubo's).

Inspiration (concepts, not code): Gentle AI by Gentleman Programming — adaptive workflow, single feature file, line budgets, context-free review lenses, sync tags.
