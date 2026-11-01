'use client'

import { useEffect, useMemo, useState } from 'react'
import { PrimaryBtn } from '@/components/ui/Button'
import EnceladusSurveyChart from '@/components/game/EnceladusSurveyChart'
import InstrumentViewport, { InstrumentAnswerRow, InstrumentKnob, InstrumentLamp, InstrumentModuleKey, InstrumentStandbyViewport, InstrumentSwitch, InstrumentToolButton } from '@/components/game/instrument-viewport/InstrumentViewport'
import type { InstrumentCommandResult, InstrumentView } from '@/lib/instrument-viewport/view'
import viewportStyles from '@/components/game/instrument-viewport/InstrumentViewport.module.css'
import {
  SATURN_QUESTION,
  type MoonSurveyChart,
  type SaturnCandidate,
  type SaturnVerdict,
} from '@/lib/data'
import { fetchReviewableSaturnCandidates } from '@/lib/saturn-subjects'
import type { Player } from '@/lib/game-types'
import { instrumentDigestDateKey, pickInstrumentInspectCandidate, unresolvedSaturnInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'

interface SaturnStormSearchScreenProps {
  player: Player
  inspectSubjectId?: string
  onBack: () => void
  onLaunchImager: () => void
  onSubmit: (candidateId: string, cellIndex: number, verdict: SaturnVerdict, storm: boolean) => void
}

const VERDICT_ACTIONS: Array<{ id: SaturnVerdict; label: string; mark: string }> = [
  { id: 'yes', label: 'Yes', mark: 'Y' },
  { id: 'no', label: 'No', mark: 'N' },
  { id: 'maybe', label: 'Maybe', mark: 'M' },
]

/** The Saturn desk briefs the player on their first frame (notes/decisions "Instruments are controls you look through"). */
export const SATURN_BRIEFING = [
  'Saturn desk here. This is a real Cassini frame of Saturn\'s clouds, cut into nine squares. Your satellite sends one a day.',
  'Tap a square to look at it. The white box shows the square you picked. Aim, zoom and exposure on the left help you see detail.',
  'A storm is a bright, round knot or swirl in the cloud bands. If you see one, tap MARK STORM, then answer YES.',
  'Smooth bands with no knot are NO. If you cannot tell, answer MAYBE. Each answer is saved straight away. Answer all nine squares to finish the frame.',
] as const

/**
 * SSL-745: false-colour maps for the greyscale Cassini frame. Brightness becomes colour, so a
 * bright storm knot stands out from the bands. Mirrored by native `SaturnPalette`.
 */
export const SATURN_PALETTES = [
  { id: 'clr', name: 'CLR', table: null },
  { id: 'heat', name: 'HEAT', table: { r: '0 0.7 1 1', g: '0 0.1 0.65 1', b: '0 0.15 0.1 0.9' } },
  { id: 'ice', name: 'ICE', table: { r: '0 0.05 0.4 1', g: '0 0.3 0.85 1', b: '0.08 0.7 1 1' } },
  { id: 'mt', name: 'MT', table: { r: '0 0.45 0.95 1', g: '0 0.05 0.35 1', b: '0.1 0.6 0.9 1' } },
] as const

/** Inline SVG filters the frame and loupe read: one colour map per palette, plus an unsharp kernel. */
function SaturnFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      {SATURN_PALETTES.filter(p => p.table).map(p => (
        <filter key={p.id} id={`sat-${p.id}`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={p.table!.r} />
            <feFuncG type="table" tableValues={p.table!.g} />
            <feFuncB type="table" tableValues={p.table!.b} />
          </feComponentTransfer>
        </filter>
      ))}
      <filter id="sat-sharpen"><feConvolveMatrix order="3" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0" preserveAlpha="true" /></filter>
    </svg>
  )
}

type CellState = { answer: SaturnVerdict | null; storm: boolean }

function emptyCells(): CellState[] {
  return Array.from({ length: 9 }, () => ({ answer: null, storm: false }))
}

export default function SaturnStormSearchScreen({ player, inspectSubjectId, onBack, onLaunchImager, onSubmit }: SaturnStormSearchScreenProps) {
  const classifications = useMemo(() => player.saturnClassifications ?? {}, [player.saturnClassifications])
  const [candidate, setCandidate] = useState<SaturnCandidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(2)
  const [cells, setCells] = useState<CellState[]>(emptyCells)
  const [contrast, setContrast] = useState(1)
  const [palette, setPalette] = useState(0)
  const [sharpen, setSharpen] = useState(false)
  const [loupe, setLoupe] = useState(false)

  useEffect(() => {
    if (!player.freeOperations || !player.saturnImagerLaunchedAt) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchReviewableSaturnCandidates()
      .then(pool => {
        if (cancelled) return
        const digest = unresolvedSaturnInstrumentDigest(pool, player, instrumentDigestDateKey())
        const active = player.saturnActiveFrameId
          ? pool.find(item => item.id === player.saturnActiveFrameId) ?? digest.find(item => item.id === player.saturnActiveFrameId)
          : undefined
        setCandidate(active ?? pickInstrumentInspectCandidate(digest, inspectSubjectId))
      })
      .catch(() => { if (!cancelled) setCandidate(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // Classifications stay out of the dependency list so a submission does not
    // clear the frame before the saved state can render (KES-116).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectSubjectId, player.freeOperations, player.saturnImagerLaunchedAt])

  useEffect(() => {
    setSelected(2)
    setCells(emptyCells())
  }, [candidate?.id])

  if (!player.freeOperations) {
    return (
      <InstrumentStandbyViewport
        testId="saturn-storm-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="LOCKED"
        title="Saturn satellite"
        onBack={onBack}
        status="LOCKED"
        messageTitle="Free Operations Required"
        messageBody="Saturn satellite downlinks unlock after the starter contract arc."
      />
    )
  }

  if (!player.saturnImagerLaunchedAt) {
    return (
      <InstrumentStandbyViewport
        testId="saturn-storm-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="IMAGER REQUIRED"
        title="Saturn satellite"
        onBack={onBack}
        status="NO IMAGER"
        messageTitle="Launch Saturn satellite"
        messageBody="Deploy the Saturn satellite from the Launchpad to start receiving Cassini frames."
        answers={<PrimaryBtn testId="launch-saturn-imager-btn" onClick={onLaunchImager}>PREPARE LAUNCH</PrimaryBtn>}
      />
    )
  }

  if (loading) {
    return (
      <InstrumentStandbyViewport
        testId="saturn-storm-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="DAILY DOWNLINK"
        title="Saturn satellite"
        onBack={onBack}
        status="ACQUIRING"
        messageTitle="Acquiring Signal"
        messageBody="Pulling today's Cassini frame."
      />
    )
  }

  if (!candidate) {
    return (
      <InstrumentStandbyViewport
        testId="saturn-storm-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="DAILY DOWNLINK"
        title="Saturn satellite"
        onBack={onBack}
        status="EMPTY FEED"
        messageTitle="No Frame Available"
        messageBody="Every available Cassini frame is already classified. New frames arrive with the next downlink."
      />
    )
  }

  const classification = classifications[candidate.id]
  const savedCells = classification?.cells ?? {}
  const complete = !!classification && (!classification.cells || Object.keys(savedCells).length === 9)
  const pieces = Object.keys(savedCells).length
  const chart = player.moonSurveyCharts?.enceladus as MoonSurveyChart | undefined

  const paint = (answer: SaturnVerdict) => {
    if (savedCells[selected] || complete) return
    setCells(prev => prev.map((cell, index) => index === selected ? { ...cell, answer } : cell))
    onSubmit(candidate.id, selected, answer, cells[selected]?.storm ?? false)
  }

  const imageFilter = [
    SATURN_PALETTES[palette].table ? `url(#sat-${SATURN_PALETTES[palette].id})` : '',
    sharpen ? 'url(#sat-sharpen)' : '',
    `contrast(${contrast.toFixed(2)})`,
  ].filter(Boolean).join(' ')
  const onCommand = (line: string, view: InstrumentView): InstrumentCommandResult | null => {
    const [verb, arg] = line.trim().toUpperCase().split(/\s+/)
    if (verb === 'PALETTE') {
      const i = arg ? SATURN_PALETTES.findIndex(p => p.name === arg) : (palette + 1) % SATURN_PALETTES.length
      if (i < 0) return { view, lines: [`> PALETTE  USE ${SATURN_PALETTES.map(p => p.name).join(' ')}`] }
      setPalette(i); return { view, lines: [`> PALETTE  ${SATURN_PALETTES[i].name}`] }
    }
    if (verb === 'CONTRAST') {
      const n = Number(arg)
      if (!arg || !Number.isFinite(n)) return { view, lines: [`> CONTRAST  ${contrast.toFixed(1)}`] }
      const next = Math.min(3, Math.max(0.5, n)); setContrast(next); return { view, lines: [`> CONTRAST  ${next.toFixed(1)}`] }
    }
    if (verb === 'SHARPEN') { setSharpen(on => !on); return { view, lines: [`> SHARPEN  ${sharpen ? 'OFF' : 'ON'}`] } }
    if (verb === 'LOUPE') { setLoupe(on => !on); return { view, lines: [`> LOUPE  ${loupe ? 'OFF' : 'ON'}`] } }
    return null
  }

  const markStorm = () => {
    if (savedCells[selected] || complete) return
    const storm = !cells[selected]?.storm
    const answer = cells[selected]?.answer ?? 'yes'
    setCells(prev => prev.map((cell, index) => index === selected ? { ...cell, storm, answer } : cell))
    onSubmit(candidate.id, selected, answer, storm)
  }

  return (
    <InstrumentViewport
      instrumentId="saturn-imager"
      level={Math.max(player.transitSatelliteLevel ?? 1, player.deepSpaceTelescopeLevel ?? 1)}
      testId="saturn-storm-search-screen"
      sceneClassName="ln-scene-asteroid-discovery"
      eyebrow="SATURN DOWNLINK"
      title={candidate.opusId.toUpperCase()}
      onBack={onBack}
      status={complete ? 'FRAME COMPLETE' : `PIECES ${pieces} / 9`}
      onCommand={onCommand}
      module={{
        name: 'IMAGING · SI-04',
        testId: 'saturn-imaging',
        lights: <>
          <InstrumentLamp label="SHRP" on={sharpen} />
          <InstrumentLamp label="LOUPE" on={loupe} tone="amber" />
        </>,
        content: <>
          <InstrumentKnob label="CONTRAST" testId="saturn-contrast" min={0.5} max={3} step={0.05} value={contrast} readout={`${contrast.toFixed(1)}×`} onChange={setContrast} />
          <InstrumentModuleKey testId="saturn-palette" label="PALETTE" readout={SATURN_PALETTES[palette].name} pressed={palette > 0} onClick={() => setPalette(i => (i + 1) % SATURN_PALETTES.length)} />
          <InstrumentSwitch label="SHARPEN" testId="saturn-sharpen" pressed={sharpen} onToggle={() => setSharpen(on => !on)} />
          <InstrumentModuleKey testId="saturn-next-square" label="NEXT SQ" readout={`SQ ${selected + 1}`} disabled={complete} onClick={() => setSelected(i => (i + 1) % 9)} />
          <InstrumentSwitch label="LOUPE" testId="saturn-loupe" pressed={loupe} onToggle={() => setLoupe(on => !on)} />
        </>,
      }}
      viewportChrome={loupe && !complete ? (
        <span className={viewportStyles.loupeTag} data-testid="saturn-loupe-tag">SQ {selected + 1} · 3×</span>
      ) : undefined}
      briefing={{ speaker: 'Saturn desk', lines: SATURN_BRIEFING, startOpen: Object.keys(classifications).length === 0 }}
      caption={(
        <p className={viewportStyles.caption} data-testid="saturn-question">{SATURN_QUESTION}</p>
      )}
      viewport={(
        <>
          <SaturnFilters />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={viewportStyles.frameImage}
            data-testid="saturn-frame"
            src={candidate.imageUrl}
            alt={`Cassini frame ${candidate.opusId}`}
            style={{ filter: imageFilter, visibility: loupe && !complete ? 'hidden' : undefined }}
          />
          {loupe && !complete && (
            /* LOUPE: the selected square fills the well at 3×. Same aspect and cover crop as the frame, so it matches the grid square exactly. */
            <div className={viewportStyles.loupe} data-testid="saturn-loupe-view">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={candidate.imageUrl} alt={`Square ${selected + 1} of Cassini frame ${candidate.opusId}, magnified`} style={{ filter: imageFilter, left: `${-(selected % 3) * 100}%`, top: `${-Math.floor(selected / 3) * 100}%` }} />
            </div>
          )}
        </>
      )}
      overlay={loupe && !complete ? undefined : (
        <div className={viewportStyles.saturnGrid} data-testid="saturn-grid">
          {cells.map((cell, index) => {
            const saved = savedCells[index]
            const value: CellState = saved ? { answer: saved.verdict, storm: saved.storm } : cell
            return (
            <button
              key={index}
              type="button"
              className={viewportStyles.saturnCell}
              data-testid={`saturn-cell-${index}`}
              aria-pressed={selected === index}
              aria-label={`Square ${index + 1}${value.storm ? ', storm marked' : ''}${value.answer ? `, ${value.answer}` : ''}`}
              disabled={!!saved || complete}
              onClick={() => setSelected(index)}
            >
              {value.answer && <span className={viewportStyles.cellTag}>{VERDICT_ACTIONS.find(action => action.id === value.answer)?.mark}</span>}
              {value.storm && <span className={viewportStyles.stormMark} data-testid={`saturn-storm-${index}`} />}
            </button>
            )
          })}
        </div>
      )}
      answers={complete ? (
        <div className={viewportStyles.saved} data-testid="saturn-frame-complete" style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          {chart && <EnceladusSurveyChart chart={chart} classification={classification} />}
          {chart?.tier === 'gold' ? 'GOLD ATLAS RECORDED · RESEARCH XP AWARDED' : 'MOON ATLAS RECORDED · RESEARCH XP AWARDED'}
        </div>
      ) : (
        <InstrumentAnswerRow
          actions={VERDICT_ACTIONS.map(action => ({
            id: action.id,
            label: action.label,
            testId: `saturn-verdict-${action.id}`,
            onClick: () => paint(action.id),
          }))}
        />
      )}
      tool={(
        <InstrumentToolButton
          testId="saturn-mark-storm"
          label="Mark storm"
          pressed={cells[selected]?.storm}
          disabled={!!savedCells[selected] || complete}
          onClick={markStorm}
        />
      )}
    />
  )
}
