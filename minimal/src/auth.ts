// Sign-in is required (Liam, 2026-11-19). Minimal is served on Landnam's origin,
// so it reads the same PocketBase session Landnam keeps in 'pocketbase_auth'.
// A player without one is sent to Landnam to sign in and comes back here.

export interface Pilot {
  id: string
  name: string
}

const AUTH_KEY = 'pocketbase_auth'

function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function currentPilot(): Pilot | null {
  // Local stage only (vite dev): ?stage=1 plays as a stand-in pilot, like Landnam's
  // account-free stage fixture. Production builds drop this branch.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('stage')) {
    return { id: 'stage', name: 'Stage pilot' }
  }
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const auth = JSON.parse(raw) as { token?: string; record?: { id?: string; name?: string; username?: string } }
    if (!auth.token || !auth.record?.id || tokenExpired(auth.token)) return null
    return { id: auth.record.id, name: auth.record.name || auth.record.username || 'Pilot' }
  } catch {
    return null
  }
}

export const SIGN_IN_URL = '/game?return=/minimal/'
