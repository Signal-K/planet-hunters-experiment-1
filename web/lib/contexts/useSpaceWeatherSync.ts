import { useEffect } from 'react'
import type { GameState } from '@/lib/game-types'
import { fetchStormDays, mergeStormDays } from '@/lib/agency/condition'

// SSL-852: real solar storms wear the agency's orbiting craft. Every few hours the storm days in NOAA SWPC's
// planetary K-index feed are merged into the save, so a storm keeps counting after it leaves NOAA's seven-day window.
// Off in previews and stage fixtures, which carry their own storm days.
const POLL_MS = 3 * 60 * 60 * 1000

export function useSpaceWeatherSync(setState: React.Dispatch<React.SetStateAction<GameState>>, hydrated: boolean, isPreview: boolean) {
  useEffect(() => {
    if (!hydrated || isPreview) return
    let cancelled = false
    const pull = async () => {
      const days = await fetchStormDays()
      if (cancelled || !days || !Object.keys(days).length) return
      setState(s => {
        const merged = mergeStormDays(s.player.spaceStorms, days)
        const same = Object.keys(merged).length === Object.keys(s.player.spaceStorms ?? {}).length
          && Object.entries(merged).every(([day, kp]) => s.player.spaceStorms?.[day] === kp)
        return same ? s : { ...s, player: { ...s.player, spaceStorms: merged } }
      })
    }
    void pull()
    const timer = window.setInterval(() => void pull(), POLL_MS)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [setState, hydrated, isPreview])
}
