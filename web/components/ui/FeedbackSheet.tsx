'use client'

import React, { useState } from 'react'
import { captureSurveySent } from '@/lib/posthog'
import { feedbackSurveyPayload } from '@/lib/feedback-survey'
import PageSurface from '@/components/ui/PageSurface'

export default function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    captureSurveySent(feedbackSurveyPayload(text.trim()))
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    }).catch(() => {})
    setSent(true)
    setTimeout(onClose, 1400)
  }

  // SSL-35: Feedback opens from the Menu instead of an always-on launcher.
  return (
    <PageSurface
      ariaLabel="Send feedback"
      testId="feedback-sheet"
      contentStyle={{
        background: 'var(--ln-panel)',
        border: '1px solid var(--ln-cyan-soft)',
        padding: 'var(--ln-s-4) var(--ln-s-5) var(--ln-s-6)',
        overflowY: 'auto',
      }}
    >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: 'var(--ln-text)', letterSpacing: '0.04em' }}>
                Send Feedback
              </div>
              <button type="button" onClick={onClose} aria-label="Close feedback" style={{ minHeight: 44, border: 0, background: 'transparent', color: 'var(--ln-text-muted)', cursor: 'pointer', fontFamily: 'var(--ln-font-display)', fontWeight: 800, letterSpacing: '0.14em' }}>CLOSE</button>
            </div>

            {sent ? (
              <div style={{
                textAlign: 'center', padding: 'var(--ln-s-5) 0',
                fontFamily: 'var(--ln-font-display)', fontSize: 13,
                color: 'var(--ln-cyan)', letterSpacing: '0.08em',
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
                    background: 'var(--ln-bg)',
                    border: '1px solid var(--ln-cyan-border)',
                    borderRadius: 10, resize: 'none', outline: 'none',
                    fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)',
                    lineHeight: 1.5, boxSizing: 'border-box',
                  }}
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  style={{
                    padding: '12px', borderRadius: 10, border: 'none',
                    background: text.trim()
                      ? 'var(--ln-cyan)'
                      : 'var(--ln-divider)',
                    color: text.trim() ? 'var(--ln-void)' : 'var(--ln-text-muted)',
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
    </PageSurface>
  )
}
