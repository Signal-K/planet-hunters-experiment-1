'use client'

import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import { UI_ZONES } from '@/lib/ui-zones'

export default function MissionBoardCompleteState({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--ln-shell)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image src="/earth-day.jpg" alt="" fill style={{ objectFit: 'cover', filter: 'brightness(0.22) saturate(0.6)' }} />
      </div>
      <TopBar eyebrow="EARTH BASE · COMPLETE" title="Mission Board" onBack={onBack} solid />
      <div data-ui-zone={UI_ZONES.screenContent} style={{
        position: 'absolute', inset: 0, paddingTop: 72,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '72px 32px 64px',
      }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, marginBottom: 24, background: 'var(--ln-panel-2)', border: '1.5px solid var(--ln-cyan-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="10" stroke="var(--ln-cyan)" strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="14" cy="14" r="3.5" fill="var(--ln-cyan)" opacity="0.7" />
          </svg>
        </div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 10 }}>
          Training Arc Complete
        </div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 22, color: 'var(--ln-text)', textAlign: 'center', lineHeight: 1.25, marginBottom: 16 }}>
          Three Operations Down
        </div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-dim)', textAlign: 'center', lineHeight: 1.6, maxWidth: 300, marginBottom: 32 }}>
          Custom missions are unlocked. Pick contractor requests, build infrastructure, or mine high-value minerals for your own account.
        </div>
        <div style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid var(--ln-cyan-border)', background: 'var(--ln-overlay)', fontFamily: 'var(--ln-font-mono)', fontSize: 11, color: 'var(--ln-cyan-bright)', letterSpacing: '0.14em', textAlign: 'center', textTransform: 'uppercase' }}>
          Open Free Ops from the mission board
        </div>
      </div>
    </div>
  )
}
