// Dev stage only: `?at=2026-11-17T12:00:00Z` shifts the page's clock so a dated event (a shower window)
// can be played on any day. Imported first by StageClient so it runs before anything reads the time.
// The clock keeps ticking from the chosen instant.
// SSL-775: a few fixtures are about a date (before, during, after a shower), so they pin one unless `at` is given.
export const PRESET_CLOCK: Record<string, string> = {
  'ui-community-research-event-before': '2026-09-20T12:00:00Z',
  'ui-community-research-leonids': '2026-11-16T09:00:00Z',
  'ui-community-research-event-after': '2026-12-03T12:00:00Z',
}
if (typeof window !== 'undefined') {
  const query = new URLSearchParams(window.location.search)
  const at = Date.parse(query.get('at') ?? PRESET_CLOCK[query.get('preset') ?? ''] ?? '')
  const flag = '__landnamDevClock'
  if (Number.isFinite(at) && !(window as unknown as Record<string, unknown>)[flag]) {
    const realNow = Date.now.bind(Date)
    const offset = at - realNow()
    Date.now = () => realNow() + offset
    ;(window as unknown as Record<string, unknown>)[flag] = true
  }
}
export {}
