'use client'

import { useEffect } from 'react'

/**
 * Dev only. Open `/game/hub?follow=1` once in the editor's Simple Browser; the tab then
 * navigates to whatever page an agent last edited (scripts/preview-target.mjs).
 * The flag is kept in localStorage so it survives editor refreshes, tab recreation,
 * and dev-container restarts. Use `?follow=0` to opt this browser out again.
 */
export function DevFollow() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const initialParams = new URLSearchParams(window.location.search)
    if (initialParams.has('follow')) {
      localStorage.setItem('dev-follow', initialParams.get('follow') === '0' ? '0' : '1')
    } else if (sessionStorage.getItem('dev-follow') === '1') {
      // Migrate the original tab-scoped preference without making people reopen the URL.
      localStorage.setItem('dev-follow', '1')
    }
    if (localStorage.getItem('dev-follow') !== '1') return
    let last = Number(localStorage.getItem('dev-follow-ts') ?? 0)
    let lastActs = Number(localStorage.getItem('dev-acts-ts') ?? 0)
    let stopped = false
    type Act = { key?: string; hold?: number; click?: string; wait?: number }
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const keyInit = (key: string) => ({ key, code: key === ' ' || key === 'Space' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key, bubbles: true })
    const followedRoute = (route: string) => {
      const target = new URL(route, window.location.origin)
      target.searchParams.set('follow', '1')
      return `${target.pathname}${target.search}${target.hash}`
    }
    const restoreMarker = () => {
      const current = new URL(window.location.href)
      if (current.searchParams.get('follow') === '1') return
      current.searchParams.set('follow', '1')
      window.history.replaceState(window.history.state, '', `${current.pathname}${current.search}${current.hash}`)
    }
    const run = async (acts: Act[]) => {
      for (const a of acts) {
        if (a.key) {
          const k = a.key === 'Space' ? ' ' : a.key
          window.dispatchEvent(new KeyboardEvent('keydown', keyInit(k)))
          await sleep(a.hold ?? 120)
          window.dispatchEvent(new KeyboardEvent('keyup', keyInit(k)))
        } else if (a.click) {
          const want = a.click.toLowerCase()
          const el = [...document.querySelectorAll<HTMLElement>('button,[role=button],a,[aria-label]')].find((e) =>
            (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().toLowerCase().includes(want))
          if (el) { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.click(); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })) }
        } else await sleep(a.wait ?? 300)
        await sleep(80)
      }
    }
    const tick = async () => {
      // Player navigation (especially an in-game Back button) releases the
      // editor follower. Re-check every poll because this effect deliberately
      // stays mounted across game routes.
      if (stopped || localStorage.getItem('dev-follow') !== '1') return
      restoreMarker()
      try {
        const res = await fetch('/api/dev/follow', { cache: 'no-store' })
        if (!res.ok) return
        const { route, ts, actions, actionsTs } = (await res.json()) as { route: string | null; ts: number; actions?: Act[]; actionsTs?: number }
        if (route) {
          if (ts > last) {
            last = ts
            localStorage.setItem('dev-follow-ts', String(ts))
          }
          const target = followedRoute(route)
          // Follow mode is deliberately authoritative. Any game-state, auth,
          // HMR, or editor refresh that moves this tab elsewhere is repaired
          // on the next poll even when the target timestamp has not changed.
          if (window.location.pathname + window.location.search + window.location.hash !== target) { window.location.assign(target); return }
        }
        if (actionsTs && actionsTs > lastActs) {
          lastActs = actionsTs
          localStorage.setItem('dev-acts-ts', String(actionsTs))
          void run(actions ?? [])
        }
      } catch { /* server restarting */ }
    }
    void tick()
    const id = window.setInterval(tick, 1000)
    const reconnect = () => { void tick() }
    window.addEventListener('focus', reconnect)
    window.addEventListener('online', reconnect)
    document.addEventListener('visibilitychange', reconnect)
    return () => {
      stopped = true
      window.clearInterval(id)
      window.removeEventListener('focus', reconnect)
      window.removeEventListener('online', reconnect)
      document.removeEventListener('visibilitychange', reconnect)
    }
  }, [])
  return null
}
