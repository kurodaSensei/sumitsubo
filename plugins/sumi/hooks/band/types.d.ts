// What scripts/band.mjs prints and the band draws; null outside a Sumitsubo project.
export type BandState = {
  feature: { slug: string; status: 'active' | 'blocked'; done: number; total: number } | null
  lines: number | null
  budget: number
  receipt: { id: string; state: 'open' | 'current' | 'behind' } | null
  evidence: { id: string; routes: number; failed: number } | null
} | null

declare module 'claude-code' {
  interface PluginState {
    sumi: { band: Shaped<BandState>; hidden: boolean }
  }
}
