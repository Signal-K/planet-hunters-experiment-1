'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Radio, Telescope } from 'lucide-react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import NebulaBackdrop from '@/components/game/NebulaBackdrop'
import InstrumentViewport, { InstrumentAnswerRow, InstrumentToolButton } from '@/components/game/instrument-viewport/InstrumentViewport'
import viewportStyles from '@/components/game/instrument-viewport/InstrumentViewport.module.css'
import {
  SATURN_QUESTION,
  type SaturnCandidate,
  type SaturnVerdict,
} from '@/lib/data'
import { fetchReviewableSaturnCandidates } from '@/lib/saturn-subjects'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { instrumentDigestDateKey, pickInstrumentInspectCandidate, unresolvedSaturnInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'

interface SaturnStormSearchScreenProps {
  player: Player
  inspectSubjectId?: string
  onBack: () => void
  onLaunchImager: () => void
  onSubmit: (candidateId: string, verdict: SaturnVerdict) => void
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

export default function SaturnStormSearchScreen({ player, inspectSubjectId, onBack, onLaunchImager, onSubmit }: SaturnStormSearchScreenProps) {
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
        setCandidate(pickInstrumentInspectCandidate(digest, inspectSubjectId))
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
      <GateScreen
        eyebrow="BASE / LOCKED"
        icon={<Telescope size={22} />}
        title="Free Operations Required"
        body="Saturn imager downlinks unlock after the starter contract arc."
        onBack={onBack}
      />
    )
  }

  if (!player.saturnImagerLaunchedAt) {
    return (
      <GateScreen
        eyebrow="BASE / IMAGER REQUIRED"
        icon={<Telescope size={22} />}
        title="Launch Saturn Imager"
        body="Deploy the Saturn imager from the Launchpad to start receiving Cassini frames."
        onBack={onBack}
        action={<PrimaryBtn testId="launch-saturn-imager-btn" onClick={onLaunchImager}>OPEN LAUNCHPAD</PrimaryBtn>}
      />
    )
  }

  if (loading) {
    return (
      <GateScreen eyebrow="BASE / DAILY DOWNLINK" icon={<Telescope size={22} />} title="Acquiring Signal" body="Pulling today's Cassini frame." onBack={onBack} />
    )
  }

  if (!candidate) {
    return (
      <GateScreen
        eyebrow="BASE / DAILY DOWNLINK"
        icon={<Radio size={22} />}
        title="No Frame Available"
        body="Every available Cassini frame is already classified. New frames arrive with the next downlink."
        onBack={onBack}
      />
    )
  }

  const classification = classifications[candidate.id]
  const locked = classification != null

  const paint = (answer: SaturnVerdict) => {
    if (locked) return
    setCells(prev => prev.map((cell, index) => index === selected ? { ...cell, answer } : cell))
    onSubmit(candidate.id, answer)
  }

  const markStorm = () => {
    if (locked) return
    setCells(prev => prev.map((cell, index) => index === selected ? { ...cell, storm: !cell.storm, answer: cell.storm ? cell.answer : (cell.answer ?? 'yes') } : cell))
  }

  return (
    <InstrumentViewport
      testId="saturn-storm-search-screen"
      sceneClassName="ln-scene-asteroid-discovery"
      eyebrow="INSTRUMENT DATA FEED · SATURN DOWNLINK"
      title={candidate.opusId.toUpperCase()}
      onBack={onBack}
      status={classification ? 'ANNOTATION SAVED' : 'REVIEW'}
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
          {cells.map((cell, index) => (
            <button
              key={index}
              type="button"
              className={viewportStyles.saturnCell}
              data-testid={`saturn-cell-${index}`}
              aria-pressed={selected === index}
              aria-label={`Square ${index + 1}${cell.storm ? ', storm marked' : ''}${cell.answer ? `, ${cell.answer}` : ''}`}
              disabled={locked}
              onClick={() => setSelected(index)}
            >
              {cell.answer && <span className={viewportStyles.cellTag}>{VERDICT_ACTIONS.find(action => action.id === cell.answer)?.mark}</span>}
              {cell.storm && <span className={viewportStyles.stormMark} data-testid={`saturn-storm-${index}`} />}
            </button>
          ))}
        </div>
      )}
      answers={classification ? (
        <div className={viewportStyles.saved}>Annotation saved</div>
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
          disabled={locked}
          onClick={markStorm}
        />
      )}
    />
  )
}

function GateScreen({ eyebrow, icon, title, body, onBack, action }: {
  eyebrow: string
  icon: ReactNode
  title: string
  body: string
  onBack: () => void
  action?: ReactNode
}) {
  return (
    <div className="game-screen theme-deep ln-scene-asteroid-discovery">
      <NebulaBackdrop />
      <TopBar eyebrow={eyebrow} title="Saturn Imager" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent}>
        <Panel accent="var(--ln-cyan)" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--ln-cyan-soft)', border: '1px solid var(--ln-cyan-border)', color: 'var(--ln-cyan)' }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ln-cyan)' }}>{title}</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-muted)', marginTop: 4 }}>{body}</div>
            </div>
          </div>
          {action && <div style={{ marginTop: 16 }}>{action}</div>}
        </Panel>
      </div>
    </div>
  )
}
