import { redirect } from 'next/navigation'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { DEV_GROUPS } from '@/lib/devPresets'
import StageClient from './StageClient'

// Isolated stage (dev/staging only). `/game/stage?preset=KEY` mounts ONE screen
// from fixture state, with no Flight Plan, auth gate, tickers, sync or chrome,
// so a scene/mechanic can be checked on its own without playing the loop.
//   &patch={"francs":0}   shallow-merge into player after load
//   &chrome=1             also mount the shared nav bars
// With no preset it lists every fixture.
export default async function StagePage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  if (!isDevLauncherEnabled()) redirect('/game')
  const { preset } = await searchParams
  if (preset) return <StageClient />
  return (
    <main style={{ padding: 16, background: '#eef4fa', color: '#0f2436', minHeight: 'var(--app-h)', font: '16px system-ui' }}>
      <h1 style={{ fontSize: 20 }}>Stage: one scene, no loop</h1>
      {DEV_GROUPS.map(g => (
        <section key={g.label} style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16 }}>{g.label}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {g.shots.map(s => (
              <a key={s.key} href={`/game/stage?preset=${s.key}`} title={s.hint}
                style={{ minHeight: 44, display: 'grid', placeItems: 'center', padding: '0 12px', border: '2px solid #0f2436', borderRadius: 6, color: 'inherit', textDecoration: 'none' }}>
                {s.label} <small style={{ marginLeft: 6, opacity: 0.7 }}>{s.key}</small>
              </a>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
