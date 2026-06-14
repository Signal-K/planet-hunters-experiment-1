import { pbShared } from './pb'

const GUEST_CREDENTIALS_KEY = 'landnam-guest-credentials'
const GUEST_EMAIL_SUFFIX = '@landnam.guest'

interface GuestCredentials {
  email: string
  password: string
}

/**
 * Ensures `pbShared` has a valid auth session, creating a throwaway guest
 * PocketBase account on first visit so the game can sync state to the
 * backend without requiring the user to register.
 *
 * - If a valid session already exists (guest or full account), does nothing.
 * - If guest credentials were saved from a previous visit, re-authenticates
 *   with them (covers expired tokens).
 * - Otherwise registers a new `guest_<random>` account and persists its
 *   credentials so this device can re-authenticate later.
 */
export async function ensureGuestAuth(): Promise<void> {
  if (pbShared.authStore.isValid) return

  const stored = readStoredCredentials()
  if (stored) {
    try {
      await pbShared.collection('users').authWithPassword(stored.email, stored.password)
      return
    } catch {
      localStorage.removeItem(GUEST_CREDENTIALS_KEY)
    }
  }

  const guestId = `guest_${Math.random().toString(36).slice(2, 10)}`
  const credentials: GuestCredentials = {
    email: `${guestId}@landnam.guest`,
    password: 'GuestPassword123!',
  }

  await pbShared.collection('users').create({
    email: credentials.email,
    password: credentials.password,
    passwordConfirm: credentials.password,
    name: 'Anonymous Explorer',
  })
  await pbShared.collection('users').authWithPassword(credentials.email, credentials.password)
  localStorage.setItem(GUEST_CREDENTIALS_KEY, JSON.stringify(credentials))
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
 *
 * PocketBase requires email changes to go through `requestEmailChange` /
 * `confirmEmailChange` (a confirmation link sent to the new address) — it
 * rejects a direct `email` field update for non-superusers. So this sets
 * the new password immediately (the account is now usable with email +
 * password) and kicks off the email-change confirmation in parallel.
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

  // Changing the password invalidates the previous auth token — re-auth
  // with the new password (email is still the guest placeholder until the
  // confirmation link below is clicked) before requesting the email change.
  await pbShared.collection('users').authWithPassword(stored.email, password)
  localStorage.removeItem(GUEST_CREDENTIALS_KEY)

  // The email-change confirmation link requires a working mailer. The
  // password is already updated and the account is fully usable even if
  // this fails (e.g. SMTP not configured in this environment).
  let emailChangeRequested = true
  try {
    await pbShared.collection('users').requestEmailChange(email)
  } catch {
    emailChangeRequested = false
  }
  return { emailChangeRequested }
}
