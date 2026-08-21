import { pbShared } from './pb'

const ACCOUNT_CREDENTIALS_KEY = 'landnam-account-credentials'

interface AccountCredentials {
  email: string
  password: string
}

const RETRY_DELAYS = [1000, 3000, 5000]

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

/** Restore an email account from credentials kept on this device. */
export async function ensureAccountAuth(): Promise<void> {
  if (pbShared.authStore.isValid) return
  const stored = readStoredCredentials()
  if (!stored) return

  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
    if (attempt > 0) await sleep(RETRY_DELAYS[attempt - 1])
    try {
      await pbShared.collection('users').authWithPassword(stored.email, stored.password)
      return
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

export function hasStoredCredentials(): boolean {
  try {
    return !!localStorage.getItem(ACCOUNT_CREDENTIALS_KEY)
  } catch {
    return false
  }
}

export function storeAccountCredentials(email: string, password: string): void {
  localStorage.setItem(ACCOUNT_CREDENTIALS_KEY, JSON.stringify({ email, password }))
}

export function clearAccountCredentials(): void {
  localStorage.removeItem(ACCOUNT_CREDENTIALS_KEY)
}

function readStoredCredentials(): AccountCredentials | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_CREDENTIALS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AccountCredentials>
    if (typeof parsed.email === 'string' && typeof parsed.password === 'string') {
      return { email: parsed.email, password: parsed.password }
    }
    return null
  } catch {
    return null
  }
}
