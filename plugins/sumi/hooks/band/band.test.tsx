import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { CommandRunInput, On } from 'claude-code'

const BAND = {
  plugin: 'sumi',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const STATE = {
  feature: { slug: '2026-11-10-checkout', status: 'active', done: 2, total: 5 },
  lines: 350,
  budget: 400,
  receipt: { id: '2026-11-10-abc1234', state: 'behind' },
  evidence: { id: '2026-11-10T11-00', routes: 2, failed: 1 },
}

// Stands in for the engine: scripts/band.mjs prints `stdout`, and whatever
// sits beneath the band in the slot draws "engine".
async function start($: Engine, on: On, stdout: string) {
  mock.store(on)
  on('command.register', () => ({ value: { command: 'sumi-band' } }))
  on('process.run', () => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
}

// `/sumi-band <args>` typed at the prompt.
const slash = (args: string): CommandRunInput => ({
  command: 'sumi-band',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
})

test('the band shows feature, budget, receipt and evidence on every surface', async ($, on) => {
  await start($, on, JSON.stringify(STATE))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /checkout/ }))?.text).toBe('2026-11-10-checkout 2/5')
    expect((await ui.find({ type: 'Text', text: /lines/ }))?.text).toBe('350/400 lines')
    expect(await ui.find({ type: 'Text', text: 'review behind' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '✗ evidence 1/2' })).toBeDefined()
    // Ponytail's band (here: the engine) still draws beneath ours.
    expect(await ui.find({ type: 'Text', text: 'engine' })).toBeDefined()
    await ui.unmount()
  }
})

test('Hide and /sumi-band hide the band and bring it back', async ($, on) => {
  await start($, on, JSON.stringify(STATE))
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'hide' })
  expect(await ui.find({ type: 'Text', text: /checkout/ })).toBeUndefined()
  await ui.unmount()

  await $.command.run(slash('on'))
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /checkout/ })).toBeDefined()
  await ui.unmount()

  await $.command.run(slash(''))
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /checkout/ })).toBeUndefined()
  await ui.unmount()
})

test('outside a Sumitsubo project the band leaves the slot alone', async ($, on) => {
  await start($, on, 'null')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})
