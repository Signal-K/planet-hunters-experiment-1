'use client'

import { openFeedbackSurvey } from '@/lib/posthog'

export default function FeedbackButton() {
  return (
    <button
      onClick={openFeedbackSurvey}
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: 80,
        padding: '6px 12px',
        background: 'rgba(8,20,36,0.85)',
        border: '1px solid rgba(100,180,255,0.18)',
        borderRadius: 8,
        color: 'rgba(169,184,206,0.7)',
        fontFamily: 'var(--ln-font-display)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
      }}
    >
      Feedback
    </button>
  )
}
