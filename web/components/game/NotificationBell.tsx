'use client'

import { useCallback, useEffect, useState } from 'react'
import { listNotifications, type PlayerNotification } from '@/lib/notifications/client'
import { respondToFriendRequest } from '@/lib/friends/client'

function BellButton({ count, onClick }: { count: number; onClick: () => void }) {
  return <button type="button" className="notification-bell" onClick={onClick} aria-label={`Notifications${count ? `, ${count} unread` : ''}`} style={{
    // The top-right corner is used by each scene's primary action. Keep the
    // shared inbox in the header gutter so it never steals that hit target.
    position: 'fixed', top: 64, right: 148, zIndex: 70, minWidth: 44, minHeight: 44,
    borderRadius: 6, border: '1px solid var(--ln-cyan-border)', background: 'var(--ln-panel)',
    color: 'var(--ln-text)', fontSize: 20, cursor: 'pointer', boxShadow: '0 8px 24px rgba(3, 12, 28, .28)',
  }}>
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
    {count > 0 && <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, padding: '0 4px', display: 'grid', placeItems: 'center', background: 'var(--ln-crimson-press)', color: 'var(--ln-panel)', fontFamily: 'var(--ln-font-mono)', fontSize: 11, fontWeight: 800 }}>{count}</span>}
  </button>
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<PlayerNotification[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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
    <BellButton count={items.length} onClick={() => { setOpen(true); void load() }} />
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
