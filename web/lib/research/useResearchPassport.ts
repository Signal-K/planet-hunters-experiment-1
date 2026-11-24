'use client'
import { useEffect, useState } from 'react'
import { fetchResearchPassport } from '@/lib/community/client'
import { pbLandnam } from '@/lib/pb-landnam'
import { weekKey } from './paths'
import type { ResearchStamps } from './stamps'
import type { PassportResponse } from './passport'

export function passportFixture(preset: string, now: number, stamps: ResearchStamps | undefined): PassportResponse | null {
  if (['ui-probe-receipt', 'ui-tess-receipt'].includes(preset)) {
    const view = passportFixture('ui-research-passport', now, stamps)!
    return { ...view, confirmedStamps: stamps ?? {} }
  }
  if (!['ui-research-passport', 'ui-research-passport-unconfirmed', 'ui-research-passport-missed', 'ui-research-passport-empty'].includes(preset)) return null
  const week = weekKey(now)
  const prior = weekKey(now - 7 * 86_400_000)
  const mine = Object.entries(stamps ?? {}).filter(([day, kinds]) => day >= week && day <= new Date(now).toISOString().slice(0, 10) && kinds.length).length
  const reached = preset === 'ui-research-passport' || preset === 'ui-research-passport-missed'
  const confirmed = preset === 'ui-research-passport' ? mine : 0
  return { weeks: [
    { week, total: reached ? 100 : preset.endsWith('empty') ? 24 : 99, mine: confirmed, goal: 100, reachedAt: reached ? now : null, earned: reached && confirmed > 0 },
    { week: prior, total: 112, mine: preset === 'ui-research-passport' ? 1 : 0, goal: 100, reachedAt: Date.parse(`${week}T00:00:00Z`) - 1, earned: preset === 'ui-research-passport' },
  ] }
}
export function useResearchPassport(active: boolean, stamps: ResearchStamps | undefined, userId: string | null = null) {
  const scope = userId ?? 'guest'
  const [owner, setOwner] = useState(scope)
  const [data, setData] = useState<PassportResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'live' | 'offline' | 'signed-out'>('loading')
  const signature = JSON.stringify(stamps ?? {})
  useEffect(() => {
    if (!active) return
    let live = true
    const load = async () => {
      const preset = typeof window !== 'undefined' && process.env.NODE_ENV !== 'production' && window.location.pathname === '/game/stage' ? new URLSearchParams(window.location.search).get('preset') : null
      const demo = preset ? passportFixture(preset, Date.now(), stamps) : null
      if (!live) return
      if (demo) { setOwner(scope); setData(demo); setStatus('live'); return }
      if (!pbLandnam.authStore.token) { setOwner(scope); setData(null); setStatus('signed-out'); return }
      try { const response = await fetchResearchPassport(); if (live) { setOwner(scope); setData(response); setStatus('live') } }
      catch { if (live) setStatus('offline') }
    }
    void load()
    const timer = window.setInterval(load, 30_000)
    window.addEventListener('online', load)
    return () => { live = false; window.clearInterval(timer); window.removeEventListener('online', load) }
    // Local stamps can precede the outbox; polling confirms them after the save arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, signature, scope])
  return { data: owner === scope ? data : null, status }
}
