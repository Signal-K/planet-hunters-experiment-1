'use client'

import { redirect, useRouter } from 'next/navigation'
import { useMemo, useState, type ReactNode } from 'react'
import ObservatoryChart from '@/components/game/ObservatoryChart'
import TelescopeConsole from '@/components/game/TelescopeConsole'
import ObservatoryReadout from '@/components/game/ObservatoryReadout'
import ObservatoryCoach, { useObservatoryCoach } from '@/components/game/ObservatoryCoach'
import PixiGalaxyStarMap from '@/components/game/PixiGalaxyStarMap'
import SolSystemPreview from '@/components/game/SolSystemPreview'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import { deriveObservatoryStats, sectorWindows, tessLightcurvePoints, type TessCandidate, type TessVerdict, type TransitRange } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'

export default function TransitDemoPage() {
  if (process.env.NODE_ENV !== 'development') redirect('/game')
  return <TransitDemo />
}

// Liam, 2026-07-03: "in the demo, there should be unlimited [anomalies]" —
// procedurally generate a new candidate every round instead of a single
// fixed anomaly, so the dev preview never runs out to test against.
const DEMO_CONSTELLATIONS = ['Dorado', 'Lyra', 'Aquarius', 'Centaurus', 'Cygnus', 'Vela', 'Orion', 'Carina']

function makeDemoCandidate(round: number): TessCandidate {
  const seed = round + 1
  const toiNum = 100 + ((seed * 37) % 900)
  return {
    id: `demo-round-${round}`,
    ticId: `TIC ${100000000 + seed * 7919}`,
    toi: `TOI-${toiNum}.01`,
    host: `TOI-${toiNum}`,
    sector: `Sectors ${1 + (seed % 5)}-${5 + (seed % 5)}`,
    constellation: DEMO_CONSTELLATIONS[seed % DEMO_CONSTELLATIONS.length],
    distanceLy: 20 + ((seed * 53) % 1400),
    planetRadiusEarth: 0.6 + (((seed * 17) % 400) / 100),
    periodDays: 3 + (((seed * 13) % 400) / 10),
    transitEpoch: (seed % 10) + 0.5,
    depthPpm: 200 + ((seed * 91) % 5000),
    signalToNoise: 3 + ((seed * 7) % 30),
  }
}

// A handful of extra "unsearched" stars for the pointing map, alongside
// whichever rounds have actually been logged this session.
const MAP_PREVIEW_ROUNDS = [50, 51, 52, 53]

// Direct-action verdict buttons, matching the citizen-science ticket wording
// (kkhyll: CONFIRM TRANSIT / MARK NOISE / SKIP) and mirroring TessDiscoveryScreen.
const VERDICT_ACTIONS: Array<{ id: TessVerdict; label: string; requiresMark: boolean; kind: 'amber' | 'cyan' | 'ghost' }> = [
  { id: 'planet', label: 'Confirm Transit', requiresMark: true, kind: 'amber' },
  { id: 'not_planet', label: 'Mark Noise', requiresMark: true, kind: 'cyan' },
  { id: 'unsure', label: 'Skip', requiresMark: false, kind: 'ghost' },
]

type LogEntry = { verdict: TessVerdict; ranges: TransitRange[] }

// Context-free clone of components/Sidebar/Sidebar.tsx's visuals — that
// component calls useGame() and needs a live GameProvider, which this
// standalone dev preview intentionally skips. Glyphs copied 1:1 from
// Sidebar.tsx's NAV_ITEMS so this actually looks like the real rail instead
// of empty colored boxes. Buttons navigate to the real /game/<screen>
// routes (leaving this dev preview) since there's no in-page game state to
// preserve here — previously fully inert, which read as "the sidebar
// buttons don't work" (Liam, 2026-07-04).
function DemoSidebar() {
  const router = useRouter()
  const items: Array<{ id: string; label: string; color: string; glyph: ReactNode }> = [
    { id: 'hub', label: 'Base', color: '#39d36a', glyph: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 19c0-3 3-9 7-9s7 6 7 9"/><circle cx="12" cy="9" r="2"/><path d="M12 21c-1.5-1-2-2-2-3M12 21c1.5-1 2-2 2-3"/>
      </svg>
    ) },
    { id: 'missions', label: 'Missions', color: '#f5a623', glyph: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
      </svg>
    ) },
    { id: 'galaxy', label: 'Atlas', color: '#7ec8ff', glyph: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
      </svg>
    ) },
    { id: 'fab', label: 'Build', color: '#c084ff', glyph: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L8 6H4l2 4-2 4h4l4 6 4-6h4l-2-4 2-4h-4L12 2z"/>
      </svg>
    ) },
    { id: 'market', label: 'Market', color: '#ffb347', glyph: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10h16l-2-6H6l-2 6z"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>
      </svg>
    ) },
  ]
  return (
    <nav className="desktop-sidebar" aria-label="Desktop navigation (dev preview)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 8px', flex: 1 }}>
        {items.map(item => {
          const active = item.id === 'galaxy'
          return (
            <button
              key={item.id}
              data-testid={`demo-sidebar-nav-${item.id}`}
              onClick={() => router.push(`/game/${item.id}`)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', padding: '10px 4px', borderRadius: 8, cursor: 'pointer',
                border: active ? `1px solid ${item.color}66` : '1px solid transparent',
                background: active ? `radial-gradient(circle at 50% 30%, ${item.color}22, ${item.color}0d)` : 'transparent',
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8,
                background: active ? `radial-gradient(circle at 35% 30%, ${item.color}, ${item.color}cc 70%, ${item.color}88)` : 'rgba(24,24,28,0.72)',
                border: `1.5px solid ${active ? '#ffffff33' : item.color + '44'}`,
                boxShadow: active ? `0 0 12px ${item.color}66` : `0 0 8px ${item.color}22`,
                color: active ? '#06121f' : item.color,
              }}>
                {item.glyph}
              </span>
              <span style={{
                fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: item.color, whiteSpace: 'nowrap',
              }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// Mirrors TessDiscoveryScreen: no candidate-picker step (there's always
// exactly one daily anomaly), same TopBar + Panel + sticky-actions shell
// every other screen in the game uses.
function TransitDemo() {
  const [round, setRound] = useState(0)
  const [ranges, setRanges] = useState<TransitRange[]>([])
  const [logged, setLogged] = useState<LogEntry | null>(null)
  const [sectorIndex, setSectorIndex] = useState(0)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [visitedRounds, setVisitedRounds] = useState<number[]>([])
  const [viewingSol, setViewingSol] = useState(false)

  const candidate = useMemo(() => makeDemoCandidate(round), [round])
  const mapCandidates = useMemo(
    () => [...visitedRounds, round, ...MAP_PREVIEW_ROUNDS].map(makeDemoCandidate),
    [visitedRounds, round],
  )
  const visitedIds = useMemo(() => new Set(visitedRounds.map(r => `demo-round-${r}`)), [visitedRounds])

  const activeRanges = logged?.ranges ?? ranges
  const markCount = activeRanges.length
  const points = useMemo(() => tessLightcurvePoints(candidate), [candidate])
  const sectors = useMemo(() => sectorWindows(points, candidate.sector), [points, candidate])
  const activeSector = sectors[Math.min(sectorIndex, Math.max(0, sectors.length - 1))]
  // Fixed across all sectors — see ObservatoryChart's yDomain doc comment.
  const yDomain = useMemo<[number, number] | undefined>(() => {
    if (!points.length) return undefined
    const ys = points.map(p => p.y)
    return [Math.min(...ys), Math.max(...ys)]
  }, [points])
  const stats = deriveObservatoryStats(candidate, points, activeRanges)
  const coach = useObservatoryCoach()
  const showCoach = coach.visible && !logged

  const castVerdict = (verdict: TessVerdict) => {
    if (logged) return
    setLogged({ verdict, ranges })
    setVisitedRounds(prev => (prev.includes(round) ? prev : [...prev, round]))
  }

  const nextAnomaly = () => {
    setRound(r => r + 1)
    setRanges([])
    setLogged(null)
    setSectorIndex(0)
    setTargetId(null)
    setViewingSol(false)
  }

  return (
    <main className="game-stage" aria-label="Landnam game (dev preview)">
      <div className="portrait-canvas">
        <div className="game-screen">
          <TopBar eyebrow="DEV · TESS ANOMALY" title={candidate.toi} onBack={() => window.history.back()} />
          <div className={`screen-scroll${logged || markCount > 0 ? ' screen-scroll--tall-actions' : ''}`} data-ui-zone={UI_ZONES.screenContent}>
            <Panel accent="var(--ln-amber)" style={{ padding: 12, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LiveDot active={!logged} />
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 18, color: '#e8f0fe' }}>{candidate.host}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#6b7fa3', marginTop: 2 }}>
                    {candidate.ticId} / {candidate.constellation.toUpperCase()} / {candidate.distanceLy} LY
                  </div>
                </div>
                <StatusPill kind={logged ? 'ok' : 'info'}>
                  {logged ? logged.verdict.replace('_', ' ').toUpperCase() : 'REVIEW'}
                </StatusPill>
              </div>

              {!logged && sectors.length > 1 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {sectors.map((sector, index) => (
                    <button
                      key={sector.label}
                      data-testid={`sector-pill-${index}`}
                      onClick={() => setSectorIndex(index)}
                      style={{
                        padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                        border: `1px solid ${index === sectorIndex ? 'rgba(245,166,35,0.6)' : 'rgba(112,217,234,0.2)'}`,
                        background: index === sectorIndex ? 'rgba(245,166,35,0.14)' : 'rgba(20,20,23,0.5)',
                        color: index === sectorIndex ? 'var(--ln-amber)' : 'var(--ln-text-muted)',
                        fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                      }}
                    >
                      {sector.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Viewport: the lightcurve while reviewing, replaced by the
                  galaxy star map (pick tomorrow's target) once logged. */}
              <TelescopeConsole
                sector={logged ? 'TARGET SELECT' : (activeSector?.label ?? candidate.sector)}
                targetCount={logged ? mapCandidates.length : 1}
                signal={candidate.signalToNoise}
              >
                {logged ? (
                  viewingSol ? (
                    <div style={{ height: 280 }}>
                      <SolSystemPreview onBack={() => setViewingSol(false)} />
                    </div>
                  ) : (
                    <PixiGalaxyStarMap
                      candidates={mapCandidates}
                      visitedIds={visitedIds}
                      selectedId={targetId}
                      onSelect={setTargetId}
                      onOpenSol={() => setViewingSol(true)}
                      height={280}
                    />
                  )
                ) : (
                  <ObservatoryChart
                    points={activeSector?.points ?? points}
                    ranges={activeRanges}
                    onRange={(x1, x2) => setRanges(prev => [...prev, { x1, x2 }])}
                    onRemoveRange={index => setRanges(prev => prev.filter((_, current) => current !== index))}
                    locked={false}
                    height={280}
                    yDomain={yDomain}
                  />
                )}
              </TelescopeConsole>

              {logged ? (
                <div style={{ marginTop: 8, textAlign: 'center', fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: targetId ? 'var(--ln-amber)' : '#5d7390' }}>
                  {mapCandidates.length === 0
                    ? 'No anomalies to classify yet — check back later.'
                    : targetId
                      ? `Target locked — ${mapCandidates.find(c => c.id === targetId)?.toi ?? targetId}`
                      : 'Tap a star to point the satellite tomorrow · green = already searched'}
                </div>
              ) : (
                <div style={{ marginTop: 8, textAlign: 'center', fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: markCount > 0 ? 'var(--ln-amber)' : '#5d7390' }}>
                  {markCount === 0
                    ? 'Drag over the lightcurve to mark a transit'
                    : `${markCount} region${markCount !== 1 ? 's' : ''} marked`}
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <ObservatoryReadout stats={stats} />
              </div>
            </Panel>
          </div>

          {showCoach && <ObservatoryCoach onDismiss={coach.dismiss} />}

          <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions}>
            {logged ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <StatusPill kind="ok">ANNOTATION SAVED</StatusPill>
                <PrimaryBtn testId="next-demo-anomaly" kind="amber" onClick={nextAnomaly} disabled={!targetId}>
                  Next Anomaly ›
                </PrimaryBtn>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {VERDICT_ACTIONS.map(action => (
                    <VerdictButton
                      key={action.id}
                      action={action}
                      disabled={action.requiresMark && markCount === 0}
                      onClick={() => castVerdict(action.id)}
                    />
                  ))}
                </div>
                {markCount > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <GhostBtn onClick={() => setRanges([])}>CLEAR MARKS</GhostBtn>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <DemoSidebar />
    </main>
  )
}

function LiveDot({ active }: { active: boolean }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
      background: active ? 'var(--ln-ok)' : 'var(--ln-text-muted)',
      boxShadow: active ? '0 0 6px var(--ln-ok)' : 'none',
      animation: active ? 'ln-pulse 1.4s ease-in-out infinite' : 'none',
    }} />
  )
}

function VerdictButton({ action, disabled, onClick }: { action: { id: TessVerdict; label: string; kind: 'amber' | 'cyan' | 'ghost' }; disabled: boolean; onClick: () => void }) {
  const palette: Record<typeof action.kind, { border: string; bg: string; color: string; glow: string }> = {
    amber: { border: 'rgba(245,166,35,0.7)', bg: 'linear-gradient(180deg, rgba(245,166,35,0.28), rgba(232,112,64,0.18))', color: 'var(--ln-amber-bright)', glow: 'rgba(245,166,35,0.4)' },
    cyan:  { border: 'rgba(112,217,234,0.6)', bg: 'rgba(112,217,234,0.12)', color: 'var(--ln-cyan-bright)', glow: 'rgba(112,217,234,0.35)' },
    ghost: { border: 'rgba(169,184,206,0.25)', bg: 'rgba(20,20,23,0.5)', color: 'var(--ln-text-muted)', glow: 'transparent' },
  }
  const p = palette[action.kind]
  return (
    <button
      data-testid={`tess-verdict-${action.id}`}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      style={{
        minHeight: 46,
        borderRadius: 10,
        border: `1px solid ${p.border}`,
        background: p.bg,
        color: p.color,
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 800,
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        boxShadow: disabled ? 'none' : `0 0 14px ${p.glow}`,
      }}
    >
      {action.label}
    </button>
  )
}
