// Dev stage only: `?at=2026-11-17T12:00:00Z` shifts the page's clock so a dated event (a shower window)
// can be played on any day. Imported first by StageClient so it runs before anything reads the time.
// The clock keeps ticking from the chosen instant.
if (typeof window !== 'undefined') {
  const at = Date.parse(new URLSearchParams(window.location.search).get('at') ?? '')
  const flag = '__landnamDevClock'
  if (Number.isFinite(at) && !(window as unknown as Record<string, unknown>)[flag]) {
    const realNow = Date.now.bind(Date)
    const offset = at - realNow()
    Date.now = () => realNow() + offset
    ;(window as unknown as Record<string, unknown>)[flag] = true
  }
}
export {}
