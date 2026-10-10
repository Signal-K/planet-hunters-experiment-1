'use client'

import { useEffect, useMemo, useState } from 'react'
import { PrimaryBtn } from '@/components/ui/Button'
import EnceladusSurveyChart from '@/components/game/EnceladusSurveyChart'
import InstrumentViewport, { InstrumentAnswerRow, InstrumentStandbyViewport, InstrumentToolButton } from '@/components/game/instrument-viewport/InstrumentViewport'
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
  onClaimTerritory: () => void
}

const VERDICT_ACTIONS: Array<{ id: SaturnVerdict; label: string; mark: string }> = [
  { id: 'yes', label: 'Yes', mark: 'Y' },
  { id: 'no', label: 'No', mark: 'N' },
  { id: 'maybe', label: 'Maybe', mark: 'M' },
]

type CellState = { answer: SaturnVerdict | null; storm: boolean }

function emptyCells(): CellState[] {
  return Array.from({ length: 9 }, () => ({ answer: null, storm: false }))
}

export default function SaturnStormSearchScreen({ player, inspectSubjectId, onBack, onLaunchImager, onSubmit, onClaimTerritory }: SaturnStormSearchScreenProps) {
  const classifications = useMemo(() => player.saturnClassifications ?? {}, [player.saturnClassifications])
  const [candidate, setCandidate] = useState<SaturnCandidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(2)
  const [cells, setCells] = useState<CellState[]>(emptyCells)

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
        eyebrow="BASE / LOCKED"
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
        eyebrow="BASE / IMAGER REQUIRED"
        title="Saturn satellite"
        onBack={onBack}
        status="NO IMAGER"
        messageTitle="Launch Saturn satellite"
        messageBody="Deploy the Saturn satellite from the Launchpad to start receiving Cassini frames."
        answers={<PrimaryBtn testId="launch-saturn-imager-btn" onClick={onLaunchImager}>OPEN LAUNCHPAD</PrimaryBtn>}
      />
    )
  }

  if (loading) {
    return (
      <InstrumentStandbyViewport
        testId="saturn-storm-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="BASE / DAILY DOWNLINK"
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
        eyebrow="BASE / DAILY DOWNLINK"
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

  const markStorm = () => {
    if (savedCells[selected] || complete) return
    const storm = !cells[selected]?.storm
    const answer = cells[selected]?.answer ?? 'yes'
    setCells(prev => prev.map((cell, index) => index === selected ? { ...cell, storm, answer } : cell))
    onSubmit(candidate.id, selected, answer, storm)
  }

  return (
    <InstrumentViewport
      testId="saturn-storm-search-screen"
      sceneClassName="ln-scene-asteroid-discovery"
      eyebrow="INSTRUMENT DATA FEED · SATURN DOWNLINK"
      title={candidate.opusId.toUpperCase()}
      onBack={onBack}
      status={complete ? 'FRAME COMPLETE' : `PIECES ${pieces} / 9`}
      caption={(
        <p className={viewportStyles.caption} data-testid="saturn-question">{SATURN_QUESTION}</p>
      )}
      viewport={(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={viewportStyles.frameImage}
          data-testid="saturn-frame"
          src={candidate.imageUrl}
          alt={`Cassini frame ${candidate.opusId}`}
        />
      )}
      overlay={(
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
          {chart?.tier === 'gold' && !chart.territoryPlotClaimedAt ? <button type="button" className={viewportStyles.chartAction} onClick={onClaimTerritory}>CLAIM ENCELADUS PLOT</button> : chart?.tier === 'gold' ? 'ENCELADUS PLOT CLAIMED' : 'MOON ATLAS RECORDED · RESEARCH XP AWARDED'}
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
