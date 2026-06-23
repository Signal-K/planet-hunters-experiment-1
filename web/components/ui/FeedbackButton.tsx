'use client'

import React, { useState } from 'react'
import { submitFeedback } from '@/lib/posthog'
import { UI_ZONES } from '@/lib/ui-zones'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    submitFeedback(text.trim())
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
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
          border: '1px solid rgba(100,180,255,0.18)',
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
        <div data-ui-zone={UI_ZONES.modalOverlay} style={{ position: 'absolute', inset: 0, zIndex: 96, display: 'flex', alignItems: 'flex-end' }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.7)' }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'relative', width: '100%',
            background: 'linear-gradient(180deg, #0d1c30, #060d18)',
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            border: '1px solid rgba(63,169,255,0.25)',
            padding: '14px 16px 28px',
            boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <div style={{
              fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800,
              color: '#e6efff', marginBottom: 10, letterSpacing: '0.04em',
            }}>
              Send Feedback
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
                    background: 'rgba(8,16,28,0.8)',
                    border: '1px solid rgba(63,169,255,0.25)',
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
          </div>
        </div>
      )}
    </>
  )
}
