// Same storage key as native OrientationPreference (UserDefaults landnam.orientation).
export const ORIENTATION_STORAGE_KEY = 'landnam.orientation'

export type OrientationPreference = 'auto' | 'portrait' | 'landscape'

const ORIENTATIONS: readonly OrientationPreference[] = ['auto', 'portrait', 'landscape']

export function readOrientation(stored: string | null | undefined): OrientationPreference {
  return ORIENTATIONS.find(mode => mode === stored) ?? 'auto'
}

export type LockableOrientation = {
  lock?: (orientation: string) => Promise<void>
  unlock?: () => void
}

/** Portrait and landscape lock; Auto unlocks. Fullscreen on Android still locks landscape when Auto. */
export function orientationLockTarget(pref: OrientationPreference): 'portrait' | 'landscape' | null {
  if (pref === 'portrait' || pref === 'landscape') return pref
  return null
}

export function applyOrientation(pref: OrientationPreference, orientation: LockableOrientation): void {
  try {
    if (pref === 'auto') {
      orientation.unlock?.()
      return
    }
    const pending = orientation.lock?.(pref)
    void pending?.catch(() => {})
  } catch {
    // lock throws synchronously on browsers that refuse it (desktop, iOS Safari).
  }
}

export function readStoredOrientation(): OrientationPreference {
  try {
    return readOrientation(localStorage.getItem(ORIENTATION_STORAGE_KEY))
  } catch {
    return 'auto'
  }
}

function currentOrientation(): LockableOrientation | null {
  if (typeof screen === 'undefined' || !screen.orientation) return null
  return screen.orientation
}

export function storeOrientation(pref: OrientationPreference): void {
  try {
    localStorage.setItem(ORIENTATION_STORAGE_KEY, pref)
  } catch {
    // Private mode can reject storage; the choice still applies for this page.
  }
  const orientation = currentOrientation()
  if (orientation) applyOrientation(pref, orientation)
}

export function applyStoredOrientation(): void {
  const orientation = currentOrientation()
  if (!orientation) return
  applyOrientation(readStoredOrientation(), orientation)
}
