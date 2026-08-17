'use client'

import { PrimaryBtn } from '@/components/ui/Button'
import Sheet from '@/components/ui/Sheet'

// Shown exactly once, at the tick Free Ops actually starts — see the
// justFinishedOnboarding branch in lib/contexts/useGameLoop.ts, which sets
// `popup: 'tutorial-complete'` as part of the persisted GameState rather
// than gating this on a localStorage flag (KES-167: a local-only ack
// repeated on a new browser/device or after storage was cleared).
export function TutorialCompleteSheet({ onDone }: { onDone: () => void }) {
  return (
    <Sheet
      onDismiss={onDone}
      zIndex={200}
      scrimStyle={{ background: 'rgba(1,5,14,0.88)', backdropFilter: 'blur(8px)' }}
      panelStyle={{
          background: 'linear-gradient(180deg, #081828 0%, #06121f 100%)',
          border: '1px solid rgba(57,211,106,0.25)',
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          padding: '32px 24px 48px',
      }}
      handleContainerStyle={{ marginBottom: 28 }}
      handleStyle={{ width: 36, height: 3, background: 'rgba(57,211,106,0.3)' }}
    >

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.26em', color: '#39d36a', textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Tutorial Complete
          </div>
          <div style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 26, fontWeight: 800,
            color: '#e6efff', letterSpacing: '0.02em', lineHeight: 1.15,
            marginBottom: 14,
          }}>
            Program Online
          </div>
          <div style={{
            fontFamily: 'var(--ln-font-body)', fontSize: 14, color: '#a9b8ce',
            lineHeight: 1.6, maxWidth: 300, margin: '0 auto',
          }}>
            You have completed the onboarding missions. Your space program is now operational — browse contracts, pick targets, and build your base your way.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {['Choose contracts', 'Pick targets', 'Grow your base'].map(label => (
            <div key={label} style={{
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(57,211,106,0.08)',
              border: '1px solid rgba(57,211,106,0.22)',
              fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800,
              letterSpacing: '0.16em', color: '#39d36a', textTransform: 'uppercase',
              textAlign: 'center',
            }}>
              {label}
            </div>
          ))}
        </div>

        <PrimaryBtn kind="green" onClick={onDone}>Start Playing</PrimaryBtn>
    </Sheet>
  )
}
