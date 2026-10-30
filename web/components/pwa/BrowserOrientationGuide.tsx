'use client'

import { useEffect, useState } from 'react'
import styles from './BrowserOrientationGuide.module.css'

/**
 * A phone held sideways in a browser tab loses a third of the screen to the browser's own bars, and no
 * web API can hide them (iPhone Safari has no fullscreen for pages). So in a tab, Landnam asks for
 * portrait and offers the installed app, which has the whole screen in either orientation. Installed
 * players never see this. `?orient-guide=ios|android` forces it for previews.
 */

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
type Platform = 'ios' | 'android' | 'other'

const DISMISS_KEY = 'landnam.landscape-in-browser'
const SIDEWAYS_IN_TAB = '(orientation: landscape) and (max-height: 500px)'

function installed(): boolean {
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
}

function detectPlatform(): Platform {
  const ua = window.navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'other'
}

export default function BrowserOrientationGuide() {
  const [forced, setForced] = useState<Platform | null>(null)
  const [platform, setPlatform] = useState<Platform>('other')
  const [sideways, setSideways] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('orient-guide')
    const force = param === 'ios' || param === 'android' || param === 'other' ? param : null
    setForced(force)
    setPlatform(force ?? detectPlatform())
    let wasDismissed = false
    try { wasDismissed = !force && window.sessionStorage.getItem(DISMISS_KEY) === '1' } catch { /* storage blocked: ask again */ }
    const eligible = force !== null || (!installed() && window.matchMedia('(pointer: coarse)').matches)
    setDismissed(wasDismissed || !eligible)

    const mq = window.matchMedia(SIDEWAYS_IN_TAB)
    const update = () => setSideways(mq.matches)
    update()
    mq.addEventListener('change', update)
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => {
      mq.removeEventListener('change', update)
      window.removeEventListener('beforeinstallprompt', onPrompt)
    }
  }, [])

  if (dismissed || !sideways) return null

  const playSideways = () => {
    try { if (!forced) window.sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* this page only */ }
    setDismissed(true)
  }
  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice.catch(() => null)
    if (choice?.outcome === 'accepted') setDismissed(true)
    setPrompt(null)
  }

  return (
    <div className={styles.guide} role="dialog" aria-modal="true" aria-labelledby="orient-guide-title" data-testid="browser-orientation-guide" data-platform={platform}>
      <section className={styles.turn}>
        <svg className={styles.phone} viewBox="0 0 120 120" aria-hidden="true">
          <g className={styles.handset}>
            <rect x="38" y="16" width="44" height="88" rx="9" />
            <path d="M54 24h12" />
            <circle cx="60" cy="96" r="3" />
          </g>
          <path className={styles.arc} d="M24 72a38 38 0 0 1 14-44M96 48a38 38 0 0 1-14 44" />
          <path className={styles.arc} d="m32 24 6 4-2 7M88 96l-6-4 2-7" />
        </svg>
        <h2 id="orient-guide-title">Turn your phone upright</h2>
        <p>In a browser tab, Landnam plays best in portrait.</p>
      </section>
      <section className={styles.install}>
        <span className={styles.eyebrow}>Want to play sideways?</span>
        <p>Install Landnam. It opens full screen, without the browser bars, either way up.</p>
        {platform === 'ios' ? (
          <ol className={styles.steps} data-testid="orient-guide-ios-steps">
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M6 11v8h12v-8" /></svg>Tap <b>Share</b></li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3" /><path d="M12 9v6M9 12h6" /></svg><b>Add to Home Screen</b></li>
          </ol>
        ) : prompt ? (
          <button type="button" className={styles.primary} data-testid="orient-guide-install" onClick={install}>INSTALL LANDNAM</button>
        ) : (
          <p className={styles.hint}>Use your browser menu: <b>Install app</b> or <b>Add to Home screen</b>.</p>
        )}
        <button type="button" className={styles.secondary} data-testid="orient-guide-dismiss" onClick={playSideways}>PLAY SIDEWAYS ANYWAY</button>
      </section>
    </div>
  )
}
