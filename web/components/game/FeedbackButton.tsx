'use client'

import { useState } from 'react'
import { IconBtn, GhostBtn } from '@/components/ui/Button'

const FEEDBACK_EMAIL = 'liam@skinetics.tech'

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.4 8.5 8.5 0 0 1-4-1L3 20l1.1-5.5a8.38 8.38 0 0 1-1-4A8.5 8.5 0 0 1 12 2a8.38 8.38 0 0 1 9 8.5z"/>
    </svg>
  )
}

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  function close() {
    setOpen(false)
    setCopied(false)
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const mailHref = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Landnam feedback')}&body=${encodeURIComponent(text)}`

  return (
    <>
      <div style={{ position: 'absolute', left: 12, bottom: 8, zIndex: 96 }}>
        <IconBtn ariaLabel="Send feedback" onClick={() => setOpen(true)} size={32}>
          <CommentIcon />
        </IconBtn>
      </div>

      {open && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 99, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.7)' }} />
          <div style={{
            position: 'relative', width: '100%',
            background: 'linear-gradient(180deg, #0d1c30, #060d18)',
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            border: '1px solid rgba(135,207,250,0.4)',
            padding: '18px 16px 26px',
            boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#87CFFA', textTransform: 'uppercase' }}>Send Feedback</div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 6, lineHeight: 1.45 }}>
              This build doesn&apos;t send feedback automatically. Write a note below, then copy it or email it to the team.
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What worked, what didn't, what confused you..."
              rows={4}
              style={{
                width: '100%', marginTop: 12, padding: 10, borderRadius: 10, resize: 'vertical',
                background: 'rgba(8,16,28,0.7)', border: '1px solid rgba(135,207,250,0.3)',
                color: '#e6efff', fontFamily: 'var(--ln-font-body)', fontSize: 13,
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <GhostBtn full={false} onClick={copyToClipboard}>{copied ? 'Copied' : 'Copy Text'}</GhostBtn>
              <a
                href={mailHref}
                style={{
                  flex: 1, textAlign: 'center', textDecoration: 'none',
                  padding: '16px 22px', borderRadius: 12,
                  background: 'linear-gradient(180deg, #6cc2ff 0%, #2d8de0 100%)',
                  color: '#06121f', fontFamily: 'var(--ln-font-display)', fontWeight: 800,
                  fontSize: 16, letterSpacing: '0.14em', textTransform: 'uppercase',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3)',
                }}
              >
                Email Feedback →
              </a>
            </div>
            <div style={{ marginTop: 10 }}>
              <GhostBtn onClick={close}>Close</GhostBtn>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
