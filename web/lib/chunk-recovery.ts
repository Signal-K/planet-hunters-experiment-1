// A deploy (or an old service worker cache) can leave an open page pointing at
// chunk files that no longer exist. Next then throws "No link element found for
// chunk ...css" or a ChunkLoadError and the screen half-renders. One reload
// fetches the new build; the session guard stops a reload loop.
const RELOAD_KEY = 'landnam-chunk-reload-at'
const RELOAD_COOLDOWN_MS = 60_000
const STALE_CHUNK = /No link element found for chunk|ChunkLoadError|Loading (CSS )?chunk [^\s]+ failed/i

export function isStaleChunkError(reason: unknown): boolean {
  const text = reason instanceof Error ? `${reason.name} ${reason.message}` : String(reason ?? '')
  return STALE_CHUNK.test(text)
}

export function installChunkRecovery(
  onReload?: (message: string) => void,
  reload: () => void = () => window.location.reload(),
): () => void {
  if (typeof window === 'undefined') return () => {}

  const recover = (reason: unknown) => {
    if (!isStaleChunkError(reason)) return
    try {
      const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? 0)
      if (Date.now() - last < RELOAD_COOLDOWN_MS) return
      window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    } catch {
      return // no storage means no loop guard, so do not reload
    }
    onReload?.(reason instanceof Error ? reason.message : String(reason))
    reload()
  }

  const onError = (event: ErrorEvent) => recover(event.error ?? event.message)
  const onRejection = (event: PromiseRejectionEvent) => recover(event.reason)
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}
