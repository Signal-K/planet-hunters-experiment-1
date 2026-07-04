/**
 * Retry wrapper for PocketBase calls to Fly.io backends.
 * Fly machines stop when idle; cold starts take 5–15s. A single retry with
 * a short delay catches the common case where the first request races the wake.
 */
export async function withPbRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, delayMs = 5000 }: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      // Don't retry on 4xx — those are definitive responses, not availability errors.
      if (typeof err === 'object' && err !== null && 'status' in err) {
        const status = (err as { status: number }).status
        if (status >= 400 && status < 500) throw err
      }
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs))
    }
  }
  throw lastErr
}
