'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { listNotifications, type PlayerNotification } from '@/lib/notifications/client'
import { respondToFriendRequest } from '@/lib/friends/client'

function BellIcon() {
  // Drawn on a centred 24px grid: dome, rim and clapper share one vertical axis.
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <path d="M12 3a6 6 0 0 0-6 6v4.5L4 17h16l-2-3.5V9a6 6 0 0 0-6-6z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </svg>
}

function BellButton({ count, onClick }: { count: number; onClick: () => void }) {
  // SSL-740: same chip as the clock and stash (scene-chip), icon centred in a 44px square, no fixed offset.
  return <button type="button" className="scene-chip notification-bell" data-testid="hub-notification-bell" onClick={onClick} aria-label={`Notifications${count ? `, ${count} unread` : ''}`} style={{
    position: 'relative', display: 'grid', placeItems: 'center', width: 44, height: 44, minHeight: 44, padding: 0, lineHeight: 0, cursor: 'pointer', pointerEvents: 'auto',
  }}>
    <BellIcon />
    {count > 0 && <span style={{ position: 'absolute', top: -7, right: -7, minWidth: 20, height: 20, borderRadius: 10, padding: '0 5px', boxSizing: 'border-box', display: 'grid', placeItems: 'center', background: 'var(--ln-crimson-press)', color: 'var(--ln-world-hull-lit)', border: '1px solid var(--ln-world-outline)', fontFamily: 'var(--ln-font-mono)', fontSize: 14, lineHeight: 1, fontWeight: 800 }}>{count > 9 ? '9+' : count}</span>}
  </button>
}

/** The hub's top row exposes #hub-top-right; wait for it so the bell sits in that row, not at a guessed offset. */
function useHubSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const find = () => setSlot(document.getElementById('hub-top-right'))
    find()
    const observer = new MutationObserver(find)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return slot
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<PlayerNotification[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const slot = useHubSlot()
  const load = useCallback(async () => {
    try { setItems((await listNotifications()).notifications); setError(null) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load notifications.') }
  }, [])

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(), 30_000)
    return () => window.clearInterval(interval)
  }, [load])

  async function respond(item: PlayerNotification, accept: boolean) {
    setBusy(item.id)
    try { await respondToFriendRequest(item.action.friendshipId, accept); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to update request.') }
    finally { setBusy(null) }
  }

  return <>
    {slot && createPortal(<BellButton count={items.length} onClick={() => { setOpen(true); void load() }} />, slot)}
    {open && <div aria-label="Notifications" style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(2, 8, 18, .65)', display: 'grid', placeItems: 'start end', padding: 16 }} onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section style={{ width: 'min(390px, 100%)', maxHeight: 'min(620px, calc(100vh - 32px))', overflow: 'auto', marginTop: 48, padding: 18, border: '1px solid var(--ln-cyan-border)', borderRadius: 10, background: 'var(--ln-panel)', boxShadow: '0 20px 50px rgba(0,0,0,.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><h2 style={{ margin: 0, fontFamily: 'var(--ln-font-display)', fontSize: 15, letterSpacing: '.12em' }}>NOTIFICATIONS</h2><button type="button" onClick={() => setOpen(false)} style={{ minWidth: 44, minHeight: 44, border: 0, background: 'transparent', color: 'var(--ln-text)', fontSize: 20, cursor: 'pointer' }} aria-label="Close notifications">×</button></div>
        {error && <p style={{ color: 'var(--ln-crimson-press)', fontSize: 14 }}>{error}</p>}
        {items.length === 0 ? <p style={{ color: 'var(--ln-text-muted)', fontSize: 14 }}>No new notifications.</p> : items.map(item => <article key={item.id} style={{ padding: '14px 0', borderTop: '1px solid var(--ln-divider)' }}><strong style={{ fontSize: 14 }}>{item.title}</strong><p style={{ margin: '6px 0 12px', color: 'var(--ln-text-muted)', fontSize: 14 }}>{item.body}</p><div style={{ display: 'flex', gap: 8 }}><button type="button" disabled={busy === item.id} onClick={() => void respond(item, true)} style={actionStyle}>ACCEPT</button><button type="button" disabled={busy === item.id} onClick={() => void respond(item, false)} style={{ ...actionStyle, background: 'var(--ln-crimson-soft)', borderColor: 'var(--ln-crimson-border)', color: 'var(--ln-crimson-press)' }}>DECLINE</button></div></article>)}
      </section>
    </div>}
  </>
}

const actionStyle = { minHeight: 44, padding: '0 13px', borderRadius: 6, border: '1px solid var(--ln-cyan-border)', background: 'var(--ln-cyan-soft)', color: 'var(--ln-cyan-press)', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '.08em', cursor: 'pointer' } as const
