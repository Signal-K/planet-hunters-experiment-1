import { redirect } from 'next/navigation'
import { DEV_GROUPS } from '@/lib/devPresets'

// Plain <a> tags, not next/link — Link's client-side router cache has been
// observed serving a stale /game/<screen> RSC payload that ignores a changed
// ?preset= query, silently dropping back to whatever state was last loaded
// on that screen. DevShortcuts.tsx sidesteps the same issue with a hard
// `window.location.href` reload; plain anchors get the same guarantee here
// without needing a client component.

// Local-only launcher — one big button per mission type, dropping straight
// into its "Hub" state (mission on the board, ready to play). Other states
// for that mission type (Fab/Mining/Debrief/...) are listed small below the
// button for when a specific sub-state is needed. See lib/devPresets.ts for
// what each preset actually sets up.
export default function DemoIndexPage() {
  if (process.env.NODE_ENV !== 'development') redirect('/game')
  return (
    <main style={{ minHeight: '100dvh', background: '#060d18', padding: 24, fontFamily: 'var(--ln-font-mono)' }}>
      <h1 style={{ fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', color: '#e8f0fe', marginBottom: 4 }}>
        LAUNCH A MISSION DEMO
      </h1>
      <p style={{ fontSize: 12, color: '#6b7fa3', marginBottom: 28 }}>
        Local-only. Pick a mission type to drop straight into it.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
        {DEV_GROUPS.map(group => {
          const primary = group.shots.find(s => s.key.endsWith('-hub')) ?? group.shots[0]
          const rest = group.shots.filter(s => s.key !== primary.key)
          return (
            <div
              key={group.label}
              style={{
                border: `1px solid ${group.color}33`,
                borderRadius: 12,
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
                  borderRadius: 10,
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
                LAUNCH ›
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
