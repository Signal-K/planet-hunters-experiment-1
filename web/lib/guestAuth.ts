import { pbShared } from './pb'

const GUEST_CREDENTIALS_KEY = 'landnam-guest-credentials'
const GUEST_EMAIL_SUFFIX = '@landnam.guest'

interface GuestCredentials {
  email: string
  password: string
}

// Retry delays (ms) between attempts — covers a Fly.io cold start of up to
// ~8 s. Sequence: immediate → +1 s → +3 s → +5 s = 9 s total window.
const RETRY_DELAYS = [1000, 3000, 5000]

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

async function tryAuth(stored: GuestCredentials | null): Promise<GuestCredentials | null> {
  if (stored) {
    try {
      await pbShared.collection('users').authWithPassword(stored.email, stored.password)
      return null // used stored creds; caller has nothing new to persist
    } catch {
      localStorage.removeItem(GUEST_CREDENTIALS_KEY)
    }
  }

  // Create a fresh throwaway account.
  const guestId = `guest_${Math.random().toString(36).slice(2, 10)}`
  const fresh: GuestCredentials = {
    email: `${guestId}@landnam.guest`,
    password: 'GuestPassword123!',
  }
  await pbShared.collection('users').create({
    email: fresh.email,
    password: fresh.password,
    passwordConfirm: fresh.password,
    name: 'Anonymous Explorer',
  })
  await pbShared.collection('users').authWithPassword(fresh.email, fresh.password)
  return fresh
}

/**
 * Ensures `pbShared` has a valid auth session, creating a throwaway guest
 * PocketBase account on first visit so the game can sync state to the
 * backend without requiring the user to register.
 *
 * Retries with staged backoff to survive Fly.io cold starts (typically
 * 2–5 s). The game runs fully from localStorage while this resolves in the
 * background — it does not block rendering.
 *
 * - Valid session already present → returns immediately.
 * - Stored guest credentials → re-authenticates (covers expired tokens).
 * - No credentials → creates new guest account and persists credentials.
 */
export async function ensureGuestAuth(): Promise<void> {
  if (pbShared.authStore.isValid) return

  const stored = readStoredCredentials()
  let lastError: unknown

  for (let i = 0; i <= RETRY_DELAYS.length; i++) {
    if (i > 0) await sleep(RETRY_DELAYS[i - 1])
    // Only try stored credentials on the first pass; if they failed, clear
    // them and register a fresh guest on subsequent attempts.
    try {
      const newCreds = await tryAuth(i === 0 ? stored : null)
      if (newCreds) localStorage.setItem(GUEST_CREDENTIALS_KEY, JSON.stringify(newCreds))
      return
    } catch (err) {
      lastError = err
    }
  }

  throw lastError
}

/** True if this device has stored guest credentials — i.e. this is a returning user. */
export function hasStoredCredentials(): boolean {
  try { return !!localStorage.getItem(GUEST_CREDENTIALS_KEY) } catch { return false }
}

function readStoredCredentials(): GuestCredentials | null {
  try {
    const raw = localStorage.getItem(GUEST_CREDENTIALS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.email === 'string' && typeof parsed?.password === 'string') return parsed
    return null
  } catch {
    return null
  }
}

/** True if the current session is one of our auto-created `guest_<random>@landnam.guest` accounts. */
export function isGuestAccount(): boolean {
  const email = pbShared.authStore.record?.email
  return typeof email === 'string' && email.endsWith(GUEST_EMAIL_SUFFIX)
}

/**
 * Upgrades the current guest account to a full email/password account,
 * retaining the user's PB record id (and therefore all linked game data).
 */
export async function upgradeGuestAccount(email: string, password: string): Promise<{ emailChangeRequested: boolean }> {
  const stored = readStoredCredentials()
  if (!stored) throw new Error('No guest session to upgrade')

  await pbShared.collection('users').update(pbShared.authStore.record!.id, {
    oldPassword: stored.password,
    password,
    passwordConfirm: password,
    name: '',
  })

  await pbShared.collection('users').authWithPassword(stored.email, password)
  localStorage.removeItem(GUEST_CREDENTIALS_KEY)

  let emailChangeRequested = true
  try {
    await pbShared.collection('users').requestEmailChange(email)
  } catch {
    emailChangeRequested = false
  }
  return { emailChangeRequested }
}
