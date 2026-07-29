import type { ReactNode } from 'react'

interface MissionBoardSectionProps {
  title: string
  children: ReactNode
}

export default function MissionBoardSection({ title, children }: MissionBoardSectionProps) {
  return (
    <section style={{ padding: '0 14px', marginTop: 24, marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </section>
  )
}
