/** Stable per-browser id for this device's ledger entry (SSL-559). */
const KEY = 'landnam-device-id'
let cached: string | null = null
export function deviceId(): string {
  if (cached) return cached
  try {
    const existing = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null
    if (existing) return (cached = existing)
    const id = `web-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
    localStorage.setItem(KEY, id)
    return (cached = id)
  } catch {
    return (cached = `web-${Math.random().toString(36).slice(2, 10)}`)
  }
}
