'use client'

import { useEffect, useMemo, useState } from 'react'
import ScenePanel from '@/components/game/ScenePanel'
import TopBar from '@/components/ui/TopBar'
import { InstrumentHubControlsBar } from '@/components/game/instrument-hub/InstrumentHubControlsBar'
import { InstrumentHubScene } from '@/components/game/instrument-hub/InstrumentHubScene'
import { InstrumentHubWorkSurface } from '@/components/game/instrument-hub/InstrumentHubWorkSurface'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import {
  DEFAULT_INSTRUMENT_HUB_VIEW,
  cycleSourceFilter,
  filterInstrumentSignals,
  selectInstrumentSignalIndex,
} from '@/lib/instrument-hub-state'
import type { Player } from '@/lib/game-types'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import styles from './InstrumentHubScreen.module.css'

interface InstrumentHubScreenProps {
  player: Player
  onBack: () => void
  onInspect: (signal: InstrumentSignal) => void
  onSnoozePing?: () => void
}

export default function InstrumentHubScreen({ player, onBack, onInspect, onSnoozePing }: InstrumentHubScreenProps) {
  const { signals, loading } = useInstrumentSignals(player)
  const [view, setView] = useState(DEFAULT_INSTRUMENT_HUB_VIEW)
  const [armed, setArmed] = useState(false)

  const filteredSignals = useMemo(
    () => filterInstrumentSignals(signals, view),
    [signals, view],
  )

  useEffect(() => {
    setView(current => selectInstrumentSignalIndex(current, current.selectedIndex, filteredSignals.length))
  }, [filteredSignals.length])

  const selectedSignal = filteredSignals[view.selectedIndex] ?? null

  const openSelectedInspector = () => {
    if (!selectedSignal) return
    setArmed(true)
    onInspect(selectedSignal)
  }

  return (
    <ScenePanel
      ambient="observatory"
      className={`game-screen theme-deep ${styles.screen}`}
      data-testid="instrument-hub-screen"
      scene={(
        <InstrumentHubScene
          player={player}
          workSurface={(
            <InstrumentHubWorkSurface
              signals={filteredSignals}
              selectedIndex={view.selectedIndex}
              selectedSignal={selectedSignal}
              loading={loading}
              gain={view.gain}
              zoom={view.zoom}
              scrub={view.scrub}
              armed={armed}
              onSelectIndex={index => setView(current => selectInstrumentSignalIndex(current, index, filteredSignals.length))}
            />
          )}
          controls={(
            <InstrumentHubControlsBar
              sourceFilter={view.sourceFilter}
              gain={view.gain}
              zoom={view.zoom}
              scrub={view.scrub}
              armed={armed}
              canInspect={!!selectedSignal}
              onCycleFilter={() => setView(current => ({ ...current, sourceFilter: cycleSourceFilter(current.sourceFilter) }))}
              onGainChange={gain => setView(current => ({ ...current, gain }))}
              onZoomChange={zoom => setView(current => ({ ...current, zoom }))}
              onScrubChange={scrub => setView(current => ({ ...current, scrub }))}
              onToggleArm={() => setArmed(value => !value)}
              onSnoozePing={() => onSnoozePing?.()}
              onOpenInspector={openSelectedInspector}
            />
          )}
        />
      )}
    >
      <TopBar eyebrow="ORBITAL OBSERVATORY / DATA LINK" title="Instrument Hub" onBack={onBack} glass />
    </ScenePanel>
  )
}

export type InstrumentHubInspectScreen = Extract<import('@/lib/game-types').Screen, 'galaxy' | 'asteroid-discovery'>
