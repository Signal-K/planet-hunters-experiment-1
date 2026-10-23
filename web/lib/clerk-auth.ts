import type { useClerk, useSignIn, useSignUp } from '@clerk/react'
import type { RecordModel } from 'pocketbase'
import { pbShared } from '@/lib/pb'
import { isStagingDeploy, isStagingPlaytestAccount } from '@/lib/staging-account'

/**
 * Landnam's own Clerk instance (SSL-668) fronts email sign-in, sign-up and
 * password reset; Clerk sends the emails the shared PocketBase cannot. The
 * session is then exchanged on the shared backend (`/auth/clerk-exchange`)
 * for the same `users` auth PocketBase always gave us, so everything after
 * sign-in is unchanged.
 *
 * Clerk itself only loads while the sign-in sheet is open: `ClerkGate`
 * mounts the provider there and hands its hook objects to this module, and
 * the auth hook (which lives outside that tree) calls through them. The
 * hooks are Clerk's supported custom-flow API, the one that can show its
 * suspicious-sign-up challenge.
 *
 * Staging `@landnam.test` accounts on a non-production deploy cannot receive
 * email codes, so they keep authenticating directly against PocketBase.
 */

export interface ClerkBridge {
  clerk: ReturnType<typeof useClerk>
  signIn: ReturnType<typeof useSignIn>['signIn']
  signUp: ReturnType<typeof useSignUp>['signUp']
}

let bridge: ClerkBridge | null = null
let waiters: ((b: ClerkBridge) => void)[] = []

export function setClerkBridge(next: ClerkBridge | null): void {
  bridge = next
  if (!next) return
  const ready = waiters
  waiters = []
  for (const resolve of ready) resolve(next)
}

function getBridge(timeoutMs = 30_000): Promise<ClerkBridge> {
  if (bridge) return Promise.resolve(bridge)
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      waiters = waiters.filter(w => w !== done)
      reject(new Error('Sign-in could not load. Check your connection and try again.'))
    }, timeoutMs)
    const done = (b: ClerkBridge) => { window.clearTimeout(timer); resolve(b) }
    waiters.push(done)
  })
}

export function clerkPublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || null
}

export function usesClerk(email: string): boolean {
  if (!clerkPublishableKey()) return false
  return !(isStagingPlaytestAccount(email) && isStagingDeploy())
}

/** Only one Clerk session at a time; a stale one blocks a new sign-in. */
async function freshBridge(): Promise<ClerkBridge> {
  const b = await getBridge()
  if (b.clerk.session) await b.clerk.signOut()
  return b
}

export async function signOutOfClerk(): Promise<void> {
  if (bridge?.clerk.session) await bridge.clerk.signOut().catch(() => {})
}

/**
 * Copies a pre-Clerk account into Landnam's Clerk instance with its existing
 * password hash. Always 204 server-side, so it reveals nothing.
 */
export async function ensureClerkAccount(email: string): Promise<void> {
  await pbShared.send('/auth/landnam/clerk-ensure', { method: 'POST', body: { email } })
}

export interface ClerkPocketBaseAuth {
  record: RecordModel
  created: boolean
}

function check(result: { error: unknown }): void {
  if (result.error) throw result.error
}

async function exchange(b: ClerkBridge): Promise<ClerkPocketBaseAuth> {
  const token = await b.clerk.session?.getToken()
  if (!token) throw new Error('Sign-in did not finish. Try again.')
  const res = await pbShared.send<{ token: string; record: RecordModel; meta?: { created?: boolean } }>(
    '/auth/clerk-exchange',
    { method: 'POST', body: { token } },
  )
  pbShared.authStore.save(res.token, res.record)
  return { record: res.record, created: Boolean(res.meta?.created) }
}

const UNSUPPORTED_STEP = 'This account needs another sign-in step we do not support yet.'

export async function clerkSignIn(email: string, password: string): Promise<ClerkPocketBaseAuth> {
  const b = await freshBridge()
  check(await b.signIn.password({ identifier: email, password }))
  if (b.signIn.status !== 'complete') throw new Error(UNSUPPORTED_STEP)
  check(await b.signIn.finalize())
  return exchange(b)
}

/** Emails a reset code. Unknown addresses fail silently, like PocketBase did. */
export async function clerkStartPasswordReset(email: string): Promise<void> {
  const b = await freshBridge()
  const created = await b.signIn.create({ identifier: email })
  if (created.error) {
    if (clerkErrorCode(created.error) === 'form_identifier_not_found') return
    throw created.error
  }
  check(await b.signIn.resetPasswordEmailCode.sendCode())
}

export async function clerkFinishPasswordReset(code: string, password: string): Promise<ClerkPocketBaseAuth> {
  const b = await getBridge()
  check(await b.signIn.resetPasswordEmailCode.verifyCode({ code }))
  check(await b.signIn.resetPasswordEmailCode.submitPassword({ password }))
  if (b.signIn.status !== 'complete') throw new Error(UNSUPPORTED_STEP)
  check(await b.signIn.finalize())
  return exchange(b)
}

/** Starts a sign-up and emails a verification code. */
export async function clerkStartSignUp(email: string, password: string): Promise<void> {
  const b = await freshBridge()
  check(await b.signUp.password({ emailAddress: email, password }))
  check(await b.signUp.verifications.sendEmailCode())
}

export async function clerkFinishSignUp(code: string): Promise<ClerkPocketBaseAuth> {
  const b = await getBridge()
  check(await b.signUp.verifications.verifyEmailCode({ code }))
  if (b.signUp.status !== 'complete') throw new Error('That code did not finish sign-up. Request a new one.')
  check(await b.signUp.finalize())
  return exchange(b)
}

interface ClerkApiErrorShape {
  code?: string
  errors?: { code?: string; message?: string; longMessage?: string }[]
}

export function clerkErrorCode(e: unknown): string | null {
  const err = e as ClerkApiErrorShape | null
  return err?.errors?.[0]?.code ?? err?.code ?? null
}

const CLERK_MESSAGES: Record<string, string> = {
  form_password_incorrect: 'Wrong email or password.',
  form_identifier_not_found: 'Wrong email or password.',
  form_identifier_exists: 'An account already exists for this email. Use Sign In.',
  form_code_incorrect: 'That code is not right. Check the email and try again.',
  verification_expired: 'That code has expired. Request a new one.',
  form_password_pwned: 'That password has appeared in a data breach. Choose another.',
  form_password_length_too_short: 'Use at least 8 characters.',
  too_many_requests: 'Too many attempts. Wait a minute and try again.',
}

/** A player-facing message for a Clerk API error, or null if `e` is not one. */
export function clerkErrorMessage(e: unknown): string | null {
  const err = e as ClerkApiErrorShape | null
  const first = err?.errors?.[0]
  if (!first) return null
  return (first.code && CLERK_MESSAGES[first.code]) || first.longMessage || first.message || null
}
