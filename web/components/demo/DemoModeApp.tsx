'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import { formatCurrency } from '@/lib/format'
import { MINERAL_META } from '@/lib/data/minerals'
import { pbShared } from '@/lib/pb'
import { markDemoBonusPending } from '@/lib/demo-bonus'
import { tessLightcurvePoints, type TessVerdict } from '@/lib/data/tess-candidates'
import { DEMO_TESS_CANDIDATE } from '@/lib/demo-tess-candidate'

// recharts pulls in a lot of weight for a route that's meant to be a fast,
// frictionless first impression — load it only once the citizen-science
// track is actually picked.
const LightcurvePlot = dynamic(() => import('@/components/game/LightcurvePlot'), { ssr: false })

type Track = 'mining' | 'citizen-science'
type MiningPhase = 'outbound' | 'mining' | 'inbound' | 'summary'

const OUTBOUND_MS = 18_000
const MINING_MS = 20_000
const INBOUND_MS = 16_000
const MINE_TAP_YIELD = [6, 14] as const

/**
 * Standalone /demo sandbox (KES-264). Deliberately NOT wired into
 * game-context/useGameLoop/PocketBase — no auth gate, no real mission, no
 * cost. If the player happens to already be signed in when a track
 * completes, it leaves a small note (markDemoBonusPending) for the real game
 * to apply as a one-time bonus next time it boots; if not, the completion
 * screen still shows, nothing persists.
 */
export default function DemoModeApp() {
  const router = useRouter()
  const [track, setTrack] = useState<Track | null>(null)

  return (
    <div className="game-screen theme-blueprint" style={{ position: 'relative' }}>
      <TopBar
        eyebrow="QUICK MISSION"
        title={track === 'mining' ? 'Belt Run' : track === 'citizen-science' ? 'Transit Classification' : 'Try Landnám'}
        onBack={track ? () => setTrack(null) : () => router.push('/game')}
      />
      <div className="screen-scroll" style={{ padding: '86px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {track === null && <TrackPicker onPick={setTrack} />}
        {track === 'mining' && <MiningDemo onExit={() => setTrack(null)} />}
        {track === 'citizen-science' && <CitizenScienceDemo onExit={() => setTrack(null)} />}
      </div>
    </div>
  )
}

function TrackPicker({ onPick }: { onPick: (t: Track) => void }) {
  return (
    <>
      <Panel accent="var(--ln-cyan)">
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, color: 'var(--ln-text)' }}>
          No account needed
        </div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', marginTop: 6, lineHeight: 1.5 }}>
          Two ~5-minute previews of what Landnám plays like — a mining run and a real citizen-science task. Nothing here costs anything or is saved unless you're already signed in, in which case you'll get a small one-time bonus.
        </div>
      </Panel>

      <button data-testid="demo-pick-mining" onClick={() => onPick('mining')} style={trackCardStyle}>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ln-cyan)' }}>~5 min</div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 16, fontWeight: 800, color: 'var(--ln-text)', marginTop: 4 }}>Belt Run</div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', marginTop: 4 }}>Fly to an asteroid, mine ore, bring it home.</div>
      </button>

      <button data-testid="demo-pick-citizen-science" onClick={() => onPick('citizen-science')} style={trackCardStyle}>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ln-cyan)' }}>~5 min</div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 16, fontWeight: 800, color: 'var(--ln-text)', marginTop: 4 }}>Classify a Transit Signal</div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', marginTop: 4 }}>Mark a dip in a real TESS-style lightcurve and call it planet or not.</div>
      </button>
    </>
  )
}

const trackCardStyle: React.CSSProperties = {
  textAlign: 'left', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
  background: 'var(--ln-panel)', border: '1px solid var(--ln-hairline)', borderRadius: 14,
  padding: '14px 16px',
}

function useCountup(active: boolean, durationMs: number) {
  const [progress, setProgress] = useState(0)
  const startRef = useRef<number | null>(null)
  useEffect(() => {
    if (!active) return
    startRef.current = Date.now()
    setProgress(0)
    const id = window.setInterval(() => {
      const elapsed = Date.now() - (startRef.current ?? Date.now())
      setProgress(Math.min(100, Math.round((elapsed / durationMs) * 100)))
    }, 100)
    return () => window.clearInterval(id)
  }, [active, durationMs])
  return progress
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 10, borderRadius: 99, background: 'var(--ln-panel-2)', overflow: 'hidden', border: '1px solid var(--ln-hairline)' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--ln-cyan-press), var(--ln-cyan))', transition: 'width 100ms linear' }} />
    </div>
  )
}

function completeTrack(track: Track) {
  if (pbShared.authStore.isValid) markDemoBonusPending(track)
}

function MiningDemo({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<MiningPhase>('outbound')
  const [ore, setOre] = useState({ iron: 0, ice: 0 })
  const outboundPct = useCountup(phase === 'outbound', OUTBOUND_MS)
  const inboundPct = useCountup(phase === 'inbound', INBOUND_MS)
  const miningStartRef = useRef<number | null>(null)
  const [miningPct, setMiningPct] = useState(0)

  useEffect(() => {
    if (outboundPct >= 100 && phase === 'outbound') setPhase('mining')
  }, [outboundPct, phase])

  useEffect(() => {
    if (phase !== 'mining') return
    miningStartRef.current = Date.now()
    const id = window.setInterval(() => {
      const elapsed = Date.now() - (miningStartRef.current ?? Date.now())
      setMiningPct(Math.min(100, Math.round((elapsed / MINING_MS) * 100)))
    }, 100)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (miningPct >= 100 && phase === 'mining') setPhase('inbound')
  }, [miningPct, phase])

  useEffect(() => {
    if (inboundPct >= 100 && phase === 'inbound') {
      setPhase('summary')
      completeTrack('mining')
    }
  }, [inboundPct, phase])

  function tapMine(mineral: 'iron' | 'ice') {
    const [min, max] = MINE_TAP_YIELD
    const amount = min + Math.floor(Math.random() * (max - min))
    setOre(o => ({ ...o, [mineral]: o[mineral] + amount }))
  }

  const payout = ore.iron * MINERAL_META.iron.price + ore.ice * MINERAL_META.ice.price

  if (phase === 'outbound' || phase === 'inbound') {
    const pct = phase === 'outbound' ? outboundPct : inboundPct
    return (
      <Panel accent="var(--ln-cyan)">
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          {phase === 'outbound' ? 'Outbound · Belt Asteroid' : 'Return · Earth'}
        </div>
        <div style={{ marginTop: 10 }}><ProgressBar pct={pct} /></div>
        <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 12, color: 'var(--ln-text-dim)', marginTop: 8 }}>{pct}%</div>
      </Panel>
    )
  }

  if (phase === 'mining') {
    return (
      <Panel accent="var(--ln-cyan)">
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          On Site · Fire the Extractor
        </div>
        <div style={{ marginTop: 10 }}><ProgressBar pct={miningPct} /></div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <GhostBtn testId="demo-mine-iron" onClick={() => tapMine('iron')}>Mine Iron ({ore.iron})</GhostBtn>
          <GhostBtn testId="demo-mine-ice" onClick={() => tapMine('ice')}>Mine Ice ({ore.ice})</GhostBtn>
        </div>
      </Panel>
    )
  }

  return (
    <Panel accent="var(--ln-ok)">
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, color: 'var(--ln-text)' }}>Run Complete</div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', marginTop: 8 }}>
        Hauled {ore.iron} Iron + {ore.ice} Ice · would sell for {formatCurrency(payout)}
      </div>
      <div style={{ marginTop: 14 }}><PrimaryBtn testId="demo-mining-done" onClick={onExit}>Back to Quick Missions</PrimaryBtn></div>
    </Panel>
  )
}

function CitizenScienceDemo({ onExit }: { onExit: () => void }) {
  const points = useMemo(() => tessLightcurvePoints(DEMO_TESS_CANDIDATE), [])
  const [markers, setMarkers] = useState<number[]>([])
  const [verdict, setVerdict] = useState<TessVerdict | null>(null)

  function handleMarker(x: number) {
    if (x < 0) {
      const target = x === -Number.EPSILON ? 0 : -x
      setMarkers(m => m.filter(v => Math.abs(v - target) >= 0.4))
      return
    }
    setMarkers(m => [...m, x])
  }

  function submitVerdict(v: TessVerdict) {
    setVerdict(v)
    completeTrack('citizen-science')
  }

  if (verdict) {
    return (
      <Panel accent="var(--ln-ok)">
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, color: 'var(--ln-text)' }}>Classification Submitted</div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', marginTop: 8, lineHeight: 1.5 }}>
          You marked {markers.length} dip{markers.length === 1 ? '' : 's'} and called it &ldquo;{verdictLabel(verdict)}.&rdquo; Real Landnám players do exactly this on live TESS data — repeated agreement across players is what promotes a candidate toward confirmation.
        </div>
        <div style={{ marginTop: 14 }}><PrimaryBtn testId="demo-citizen-science-done" onClick={onExit}>Back to Quick Missions</PrimaryBtn></div>
      </Panel>
    )
  }

  return (
    <>
      <Panel accent="var(--ln-cyan)">
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>
          {DEMO_TESS_CANDIDATE.toi} · {DEMO_TESS_CANDIDATE.host}
        </div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', marginTop: 4 }}>
          Click the brightness dip below to mark it, then say what you think it is.
        </div>
      </Panel>
      <Panel accent="var(--ln-cyan)" style={{ padding: 8 }}>
        <LightcurvePlot points={points} markers={markers} onMarker={handleMarker} height={200} />
      </Panel>
      <div style={{ display: 'flex', gap: 8 }}>
        <GhostBtn testId="demo-verdict-planet" onClick={() => submitVerdict('planet')}>Looks like a planet</GhostBtn>
        <GhostBtn testId="demo-verdict-not-planet" onClick={() => submitVerdict('not_planet')}>Not a planet</GhostBtn>
        <GhostBtn testId="demo-verdict-unsure" onClick={() => submitVerdict('unsure')}>Not sure</GhostBtn>
      </div>
    </>
  )
}

function verdictLabel(v: TessVerdict): string {
  if (v === 'planet') return 'planet'
  if (v === 'not_planet') return 'not a planet'
  return 'not sure'
}
