// The Sumitsubo band above the prompt: the active feature, the slice against
// its line budget, the review receipt and the last evidence run, with buttons
// for the commands that move them. `/sumi-band` hides or shows it.
//
// It shows what only Sumitsubo knows. Cost, tokens and tests are Ponytail's
// band; repeating them here would be two bands saying the same thing.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { BandState } from './types'

// Bump the tag when BandState changes: it drops what an older version stored.
const state = atom({ plugin: 'sumi', key: 'band' } as const, null, { shape: 'band-1' })
// Hidden survives sessions in the store; the atom is what redraws the band.
const HIDDEN = 'band.hidden'
const hidden = atom({ plugin: 'sumi', key: 'hidden' } as const, false)
const setHidden = async ($: EngineInterface, value: boolean) => {
  await $.store.set(HIDDEN, value)
  await update($, hidden, () => value)
}

// The logic is a plain Node script so it is tested with the rest; the band
// only draws what it prints. A failed run keeps the last good state.
async function refresh($: EngineInterface) {
  const r = await $.process.run(['node', `${$.plugin.root}/scripts/band.mjs`], { timeoutMs: 10_000 }).catch(() => undefined)
  if (r?.exitCode !== 0) return
  try {
    const s = JSON.parse(r.stdout) as BandState
    await update($, state, () => s)
  } catch {
    // not JSON: keep what the band shows
  }
}

const run = ($: EngineInterface, command: string) => $.command.run({ command, args: '' })

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'sumi-band',
      description: 'Hide or show the Sumitsubo band above the prompt',
      argumentHint: '[on|off]',
      immediate: true,
    })
    const wasHidden = Boolean(await $.store.get(HIDDEN))
    await update($, hidden, () => wasHidden)
    await refresh($)
    return next(e)
  })

  // After every turn: edits, commits, receipts and evidence all land in one.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  // /clear and /resume go on without a session.start.
  on('command.run', { command: ['clear', 'resume'] }, async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('command.run', { command: 'sumi-band' }, async ($, e) => {
    const arg = e.args.trim()
    const hide = arg === 'off' ? true : arg === 'on' ? false : !(await read($, hidden))
    await setHidden($, hide)
    return { text: hide ? 'Sumitsubo band hidden; /sumi-band brings it back.' : 'Sumitsubo band shown.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, hidden))) return next(e)
    const s = await read($, state)
    if (!s) return next(e)
    // Other mods share this slot (Ponytail's band): draw theirs below ours.
    // next(e) rejects only when nothing answers beneath, as in a test.
    const below = await next(e).catch(() => undefined)

    const { Box, Text, Button } = $.ui.resolve(e)
    const f = s.feature
    const ratio = s.lines === null ? 0 : s.lines / s.budget
    const linesColor = ratio > 1 ? 'error' : ratio >= 0.8 ? 'warning' : undefined
    const receipt = s.receipt?.state
    const receiptText = receipt === 'current' ? '✓ reviewed' : receipt === 'behind' ? 'review behind' : receipt === 'open' ? 'review open' : 'no review'
    const receiptColor = receipt === 'current' ? 'success' : receipt === 'open' ? 'warning' : 'inactive'
    const ev = s.evidence

    const mine = (
      <Box flexDirection="row" alignItems="center" gap={2}>
        <Text color="suggestion">墨</Text>
        {f ? (
          <Text>
            {f.status === 'blocked' && <Text color="warning">blocked </Text>}
            {f.slug} <Text dimColor>{f.done}/{f.total}</Text>
          </Text>
        ) : (
          <Text dimColor>no active feature</Text>
        )}
        {s.lines !== null && (
          <Text color={linesColor} dimColor={!linesColor}>
            {s.lines}/{s.budget} lines
          </Text>
        )}
        <Text color={receiptColor}>{receiptText}</Text>
        {ev && ev.routes > 0 && (
          <Text color={ev.failed ? 'error' : 'success'}>{ev.failed ? `✗ evidence ${ev.failed}/${ev.routes}` : '✓ evidence'}</Text>
        )}
        <Box flexGrow={1} />
        <Button key="feature" plain label="Feature" onPress={() => run($, 'sumi:feature')} />
        <Button key="review" plain label="Review" onPress={() => run($, 'sumi:review')} />
        <Button key="ship" plain label="Ship" onPress={() => run($, 'sumi:ship')} />
        <Button key="hide" plain label="Hide" onPress={() => setHidden($, true)} />
      </Box>
    )
    return below ? (
      <Box flexDirection="column">
        {mine}
        {below}
      </Box>
    ) : (
      mine
    )
  })
}
