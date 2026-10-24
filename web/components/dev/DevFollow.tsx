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
    type Act = { key?: string; hold?: number; click?: string; wait?: number; see?: string; gone?: string; within?: number }
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
    const clickables = () => [...document.querySelectorAll<HTMLElement>('button,[role=button],a,[aria-label]')]
    const findClickable = (want: string) => clickables().find((e) =>
      (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().toLowerCase().includes(want.toLowerCase()))
    // A `see`/`gone` target is a CSS selector when it looks like one, otherwise visible text.
    const present = (target: string) => {
      if (/^[.#\[]/.test(target) || /^[a-z]+\[/.test(target)) {
        try { return !!document.querySelector(target) } catch { /* not a selector */ }
      }
      return (document.body.innerText ?? '').toLowerCase().includes(target.toLowerCase())
    }
    const until = async (ok: () => boolean, ms: number) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (ok()) return true; await sleep(100) }
      return ok()
    }
    // Returns the first failed step, or null. Banner shows PASS/FAIL so the check is visible in the tab.
    const run = async (acts: Act[], id: string | null) => {
      const started = Date.now()
      let failed: { step: number; detail: string } | null = null
      for (const [at, a] of acts.entries()) {
        if (a.key) {
          const k = a.key === 'Space' ? ' ' : a.key
          window.dispatchEvent(new KeyboardEvent('keydown', keyInit(k)))
          await sleep(a.hold ?? 120)
          window.dispatchEvent(new KeyboardEvent('keyup', keyInit(k)))
        } else if (a.click) {
          let el: HTMLElement | undefined
          await until(() => !!(el = findClickable(a.click!)), a.within ?? 4000)
          if (el) { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.click(); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })) }
          else if (id) { failed = { step: at, detail: `nothing to click matching "${a.click}"` }; break }
        } else if (a.see) {
          if (!(await until(() => present(a.see!), a.within ?? 4000))) { failed = { step: at, detail: `never saw "${a.see}"` }; break }
        } else if (a.gone) {
          if (!(await until(() => !present(a.gone!), a.within ?? 4000))) { failed = { step: at, detail: `"${a.gone}" is still there` }; break }
        } else await sleep(a.wait ?? 300)
        await sleep(80)
      }
      if (id) {
        const result = {
          id, ok: !failed, step: failed?.step ?? null, detail: failed?.detail ?? 'all steps passed', ms: Date.now() - started,
          route: window.location.pathname + window.location.search, viewport: `${window.innerWidth}x${window.innerHeight}`,
          text: (document.body.innerText ?? '').replace(/\s+/g, ' ').slice(0, 400),
        }
        showBanner(result.ok, `${id}: ${result.ok ? 'PASS' : `FAIL (${result.detail})`} in ${(result.ms / 1000).toFixed(1)}s`)
        await fetch('/api/dev/follow', { method: 'POST', body: JSON.stringify({ result }) }).catch(() => {})
      }
    }
    const showBanner = (ok: boolean, text: string) => {
      let el = document.getElementById('dev-check-banner')
      if (!el) {
        el = document.createElement('div')
        el.id = 'dev-check-banner'
        el.setAttribute('role', 'status')
        el.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:2147483647;padding:12px 16px;border-radius:8px;font:700 14px/1.3 ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:#fff;pointer-events:none'
        document.body.appendChild(el)
      }
      el.style.background = ok ? '#1d6fb8' : '#b3261e'
      el.textContent = text
      window.setTimeout(() => el?.remove(), ok ? 6000 : 20000)
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
        const { route, ts, actions, actionsTs, id } = (await res.json()) as { route: string | null; ts: number; actions?: Act[]; actionsTs?: number; id?: string | null }
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
          void run(actions ?? [], id ?? null)
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
