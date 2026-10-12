'use client'

import { useEffect, useMemo, useState } from 'react'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { activeDebrisPreset, orionidsDevForced, skyEventNow } from '@/lib/data/sky-events'
import styles from './MeteorShowerWeather.module.css'

const COUNT = 4

/** True while the Orionids window is open (or the dev force flag is set). */
function useOrionidsWeather(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const check = () => {
      const dev = isDevLauncherEnabled()
      const active = activeDebrisPreset(skyEventNow(dev))?.eventId === 'orionids-2026'
      setOn(active || (dev && orionidsDevForced()))
    }
    check()
    const id = window.setInterval(check, 60_000)
    return () => window.clearInterval(id)
  }, [])
  return on
}

/**
 * Orionids meteor-shower weather for the base sky (SSL-521). Thin pixel streaks with
 * fading tails on stepped animation. Seeded layout so SSR and client agree.
 */
export function MeteorShowerWeather() {
  const on = useOrionidsWeather()
  const streaks = useMemo(() => {
    let seed = 1021
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
    return Array.from({ length: COUNT }, (_, i) => {
      const dur = 8 + rnd() * 6
      return {
        left: 30 + rnd() * 68,
        top: 2 + rnd() * 26,
        dur,
        delay: -(i / COUNT) * dur - rnd(),
      }
    })
  }, [])
  if (!on) return null
  return (
    <div className={styles.layer} data-layer="weather" data-weather="orionids" aria-hidden="true">
      {streaks.map((s, i) => (
        <span
          key={i}
          className={styles.streak}
          style={{ left: `${Math.round(s.left)}%`, top: `${Math.round(s.top)}%`, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
        />
      ))}
    </div>
  )
}
