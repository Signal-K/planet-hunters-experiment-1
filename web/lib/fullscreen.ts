// SSL-66: Android Chrome / mobile browsers lose height to tab and menu bars in
// landscape. The Fullscreen API hides them; iPhone Safari has none, so the
// control is feature-detected and never offered there.

type FullscreenEnv = {
  userAgent: string
  fullscreenEnabled: boolean
  landscape: boolean
  active: boolean
}

export function canOfferFullscreen(env: FullscreenEnv): boolean {
  return /Android/i.test(env.userAgent) && env.fullscreenEnabled && env.landscape && !env.active
}

export function readFullscreenEnv(): FullscreenEnv {
  return {
    userAgent: navigator.userAgent,
    fullscreenEnabled: document.fullscreenEnabled === true && typeof document.documentElement.requestFullscreen === 'function',
    landscape: window.matchMedia('(orientation: landscape)').matches,
    active: document.fullscreenElement != null,
  }
}

export async function enterFullscreen(): Promise<void> {
  await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
  // Best effort: lock() rejects or is missing on many browsers.
  try {
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape')
  } catch {
    // ignored
  }
}
