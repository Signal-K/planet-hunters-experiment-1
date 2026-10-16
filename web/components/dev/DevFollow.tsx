'use client'

import { useEffect } from 'react'

/**
 * Dev only. Open `/game/hub?follow=1` once in the editor's Simple Browser; the tab then
 * navigates to whatever page an agent last edited (scripts/preview-target.mjs).
 * The flag is kept in sessionStorage so it survives navigation.
 */
export function DevFollow() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const params = new URLSearchParams(window.location.search)
    if (params.has('follow')) sessionStorage.setItem('dev-follow', params.get('follow') === '0' ? '' : '1')
    if (!sessionStorage.getItem('dev-follow')) return
    let last = Number(sessionStorage.getItem('dev-follow-ts') ?? 0)
    let lastActs = Number(sessionStorage.getItem('dev-acts-ts') ?? 0)
    type Act = { key?: string; hold?: number; click?: string; wait?: number }
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const keyInit = (key: string) => ({ key, code: key === ' ' || key === 'Space' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key, bubbles: true })
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
      try {
        const res = await fetch('/api/dev/follow', { cache: 'no-store' })
        if (!res.ok) return
        const { route, ts, actions, actionsTs } = (await res.json()) as { route: string | null; ts: number; actions?: Act[]; actionsTs?: number }
        if (route && ts > last) {
          last = ts
          sessionStorage.setItem('dev-follow-ts', String(ts))
          if (window.location.pathname + window.location.search !== route) { window.location.assign(route); return }
        }
        if (actionsTs && actionsTs > lastActs) {
          lastActs = actionsTs
          sessionStorage.setItem('dev-acts-ts', String(actionsTs))
          void run(actions ?? [])
        }
      } catch { /* server restarting */ }
    }
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])
  return null
}
