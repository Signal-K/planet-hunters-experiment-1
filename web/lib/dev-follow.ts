/**
 * A real player navigation takes precedence over the editor preview follower.
 * Without this, the next follow poll can immediately undo Back and race the
 * scene transition, leaving the game covered by its void veil.
 */
export function releaseEditorFollow(): boolean {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return false

  let storedFollow = false
  try {
    storedFollow = window.localStorage.getItem('dev-follow') === '1'
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
  const active = storedFollow || new URLSearchParams(window.location.search).get('follow') === '1'
  if (!active) return false

  try { window.localStorage.setItem('dev-follow', '0') } catch { /* query state is still enough */ }
  try { window.sessionStorage.setItem('dev-follow', '0') } catch { /* query state is still enough */ }
  const current = new URL(window.location.href)
  current.searchParams.set('follow', '0')
  window.history.replaceState(
    window.history.state,
    '',
    `${current.pathname}${current.search}${current.hash}`,
  )
  return true
}
