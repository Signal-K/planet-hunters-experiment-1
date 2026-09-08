'use client'

import React, { useState } from 'react'
import { posthog } from '@/lib/posthog'
import { UI_ZONES } from '@/lib/ui-zones'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), distinctId: posthog.get_distinct_id?.() }),
    }).catch(() => {})
    setSent(true)
    setTimeout(() => {
      setOpen(false)
      setSent(false)
      setText('')
    }, 1400)
  }

  return (
    <>
      <button
        data-ui-zone={UI_ZONES.feedbackLauncher}
        onClick={() => setOpen(true)}
        style={{
          position: 'absolute', bottom: 12, right: 12, zIndex: 80,
          padding: '6px 12px',
          background: 'rgba(8,20,36,0.85)',
          border: '1px solid rgba(112,217,234,0.18)',
          borderRadius: 8,
          color: 'rgba(169,184,206,0.7)',
          fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          cursor: 'pointer', backdropFilter: 'blur(4px)',
        }}
      >
        Feedback
      </button>

      {open && (
        <aside data-ui-zone={UI_ZONES.screenContent} aria-label="Send feedback" style={{
            position: 'absolute', right: 12, bottom: 52, zIndex: 96,
            width: 'min(420px, calc(100% - 24px))',
            background: 'linear-gradient(180deg, #0d1c30, #060d18)',
            border: '1px solid rgba(112,217,234,0.25)',
            padding: '14px 16px 16px',
            boxShadow: 'var(--ln-shadow-panel)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#e6efff', letterSpacing: '0.04em' }}>
                Send Feedback
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close feedback" style={{ border: 0, background: 'transparent', color: 'var(--ln-text-muted)', cursor: 'pointer' }}>CLOSE</button>
            </div>

            {sent ? (
              <div style={{
                textAlign: 'center', padding: '20px 0',
                fontFamily: 'var(--ln-font-display)', fontSize: 13,
                color: '#87CFFA', letterSpacing: '0.08em',
              }}>
                Sent — thanks!
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="What's working, what isn't, what's missing..."
                  rows={4}
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: 'rgba(20,20,23,0.8)',
                    border: '1px solid rgba(112,217,234,0.25)',
                    borderRadius: 10, resize: 'none', outline: 'none',
                    fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#e6efff',
                    lineHeight: 1.5, boxSizing: 'border-box',
                  }}
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  style={{
                    padding: '12px', borderRadius: 10, border: 'none',
                    background: text.trim()
                      ? 'linear-gradient(180deg, #6cc2ff, #2d8de0)'
                      : 'rgba(44,96,140,0.3)',
                    color: text.trim() ? '#06121f' : '#3d5670',
                    fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    cursor: text.trim() ? 'pointer' : 'not-allowed',
                    transition: 'background 150ms, color 150ms',
                  }}
                >
                  Send
                </button>
              </form>
            )}
        </aside>
      )}
    </>
  )
}
