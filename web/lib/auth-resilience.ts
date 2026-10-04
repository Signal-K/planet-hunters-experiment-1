// Cold Fly machines answer /api/health with 503 (or never complete the
// socket) for several seconds after idle. Account creation used to call
// create/auth/exchange once and leave the button on "Creating…" until the
// browser gave up, which players read as a failed password.

export const WARMING_STATUS = 'The account server is warming up. Trying again…'
export const WARMING_GAVE_UP = 'The account server is still warming up. Try again in a moment.'

const TRANSIENT_STATUSES = new Set([0, 502, 503, 504])

export class AuthTimeoutError extends Error {
  readonly status = 503
  constructor(message = WARMING_GAVE_UP) {
    super(message)
    this.name = 'AuthTimeoutError'
  }
}

export function authFailureStatus(err: unknown): number | null {
  if (typeof err === 'object' && err && 'status' in err && typeof err.status === 'number') return err.status
  if (err instanceof Error) {
    const match = /failed: (\d{3})\b/.exec(err.message)
    if (match) return Number(match[1])
  }
  return null
}

export function isTransientAuthFailure(err: unknown): boolean {
  const status = authFailureStatus(err)
  if (status !== null && TRANSIENT_STATUSES.has(status)) return true
  if (err instanceof TypeError) return true
  if (err instanceof Error && /failed to fetch|networkerror|network request failed/i.test(err.message)) return true
  return false
}

/** Wrong-password copy only for a real auth rejection. A cold 503 is not one. */
export function signInGateMessage(raw: string, err: unknown): string {
  if (isTransientAuthFailure(err)) return WARMING_GAVE_UP
  if (/^failed to authenticate\.?$/i.test(raw)) return 'Sign in failed. Check your email and password.'
  return raw
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => { setTimeout(resolve, ms) })
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AuthTimeoutError()), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function waitForBackendHealth(
  check: () => Promise<unknown>,
  options?: {
    timeoutMs?: number
    sleep?: (ms: number) => Promise<void>
    onWait?: () => void
    now?: () => number
  },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 45_000
  const sleep = options?.sleep ?? defaultSleep
  const now = options?.now ?? Date.now
  const started = now()
  let delay = 400
  for (;;) {
    try {
      await withTimeout(Promise.resolve().then(check), Math.min(8_000, Math.max(1, timeoutMs - (now() - started))))
      return
    } catch (err) {
      if (now() - started >= timeoutMs) {
        if (err instanceof AuthTimeoutError) throw err
        if (isTransientAuthFailure(err)) throw new AuthTimeoutError()
        throw err
      }
      options?.onWait?.()
      const remaining = timeoutMs - (now() - started)
      await sleep(Math.min(delay, Math.max(0, remaining)))
      delay = Math.min(delay * 2, 4_000)
    }
  }
}

export async function retryTransient<T>(
  op: () => Promise<T>,
  options?: {
    attempts?: number
    delaysMs?: number[]
    timeoutMs?: number
    sleep?: (ms: number) => Promise<void>
    onWait?: () => void
  },
): Promise<T> {
  const attempts = options?.attempts ?? 5
  const delaysMs = options?.delaysMs ?? [0, 800, 1_600, 3_200, 6_400]
  const sleep = options?.sleep ?? defaultSleep
  const timeoutMs = options?.timeoutMs ?? 20_000
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      options?.onWait?.()
      await sleep(delaysMs[Math.min(i, delaysMs.length - 1)] ?? 1_000)
    }
    try {
      return await withTimeout(Promise.resolve().then(op), timeoutMs)
    } catch (err) {
      last = err
      if (!isTransientAuthFailure(err) || i === attempts - 1) throw err
    }
  }
  throw last
}
