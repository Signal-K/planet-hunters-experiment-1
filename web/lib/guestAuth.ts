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

/**
 * Re-authenticates `pbShared` using device-stored credentials (from either a
 * legacy `@landnam.guest` account or a `createAccountWithEmail` account —
 * both are stored under the same key and re-authenticated the same way).
 *
 * Retries with staged backoff to survive Fly.io cold starts (typically
 * 2–5 s). The game runs fully from localStorage while this resolves in the
 * background — it does not block rendering.
 *
 * As of KES-97, this never manufactures a new anonymous account on failure —
 * guest accounts with no reachable contact email are retired. If reauth
 * exhausts its retries, the caller falls back to local-only play; a brand
 * new account (with a real email) only comes from `createAccountWithEmail`.
 */
export async function ensureGuestAuth(): Promise<void> {
  if (pbShared.authStore.isValid) return

  const stored = readStoredCredentials()
  if (!stored) return

  let lastError: unknown
  for (let i = 0; i <= RETRY_DELAYS.length; i++) {
    if (i > 0) await sleep(RETRY_DELAYS[i - 1])
    try {
      await pbShared.collection('users').authWithPassword(stored.email, stored.password)
      return
    } catch (err) {
      lastError = err
    }
  }

  throw lastError
}

function generatePassword(): string {
  // Per-account random password — these accounts now carry real, guessable
  // emails, so (unlike the old fixed 'GuestPassword123!' shared across every
  // anonymous guest) reusing one password across accounts would let anyone
  // who knows a player's email sign in as them.
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}-Aa1!`
}

/**
 * Creates a real PocketBase account for a player who only wants to give an
 * email (no password) to continue — the replacement for the old anonymous
 * `@landnam.guest` skip path (KES-97). A random password is generated and
 * persisted to this device the same way guest credentials were, so the
 * account restores automatically on return visits via `ensureGuestAuth`.
 */
export async function createAccountWithEmail(email: string): Promise<void> {
  const password = generatePassword()
  await pbShared.collection('users').create({
    email, password, passwordConfirm: password, name: '',
  })
  await pbShared.collection('users').authWithPassword(email, password)
  localStorage.setItem(GUEST_CREDENTIALS_KEY, JSON.stringify({ email, password }))
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
