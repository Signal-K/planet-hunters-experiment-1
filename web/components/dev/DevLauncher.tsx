import { DEV_GROUPS } from '@/lib/devPresets'

export default function DevLauncher() {
  return (
    <main style={{ minHeight: '100dvh', background: '#060d18', padding: 24, fontFamily: 'var(--ln-font-mono)' }}>
      <h1 style={{ fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', color: '#e8f0fe', marginBottom: 4 }}>
        LAUNCH MISSION AND UI STATES
      </h1>
      <p style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 28 }}>
        Local and staged only. Pick a state to reload the game with a dedicated preset.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
        {DEV_GROUPS.map(group => {
          const primary = group.shots.find(s => s.key.endsWith('-hub')) ?? group.shots[0]
          const rest = group.shots.filter(s => s.key !== primary.key)
          return (
            <div
              key={group.label}
              style={{
                border: `1px solid ${group.color}33`,
                borderRadius: 8,
                padding: 16,
                background: `${group.color}0a`,
              }}
            >
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', color: group.color, textTransform: 'uppercase', marginBottom: 10 }}>
                {group.label}
              </div>
              <a
                href={`/game/demo/${primary.key}`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '14px 16px',
                  borderRadius: 8,
                  border: `1px solid ${group.color}88`,
                  background: `${group.color}22`,
                  color: group.color,
                  fontFamily: 'var(--ln-font-display)',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textDecoration: 'none',
                }}
              >
                LAUNCH
              </a>
              {rest.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                  {rest.map(shot => (
                    <a
                      key={shot.key}
                      href={`/game/demo/${shot.key}`}
                      title={shot.hint}
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.04em',
                        color: '#5d7390',
                        textDecoration: 'underline',
                        textUnderlineOffset: 3,
                      }}
                    >
                      {shot.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
