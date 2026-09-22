'use client'

import { useEffect, useMemo, useState } from 'react'
import ScenePanel from '@/components/game/ScenePanel'
import TopBar from '@/components/ui/TopBar'
import { InstrumentHubClassifyScreen } from '@/components/game/instrument-hub/InstrumentHubClassifyScreen'
import { InstrumentHubControls } from '@/components/game/instrument-hub/InstrumentHubControls'
import { InstrumentHubScene } from '@/components/game/instrument-hub/InstrumentHubScene'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import {
  DEFAULT_INSTRUMENT_HUB_VIEW,
  filterInstrumentSignals,
  selectInstrumentSignalIndex,
  type InstrumentSourceFilter,
} from '@/lib/instrument-hub-state'
import { UI_ZONES } from '@/lib/ui-zones'
import type { Player } from '@/lib/game-types'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import styles from './InstrumentHubScreen.module.css'

interface InstrumentHubScreenProps {
  player: Player
  onBack: () => void
  onInspect: (signal: InstrumentSignal) => void
  onSnoozePing?: () => void
}

function sourceLabel(kind: InstrumentSignal['kind']): string {
  return kind === 'transit' ? 'Transit telescope' : 'Deep space telescope'
}

export default function InstrumentHubScreen({ player, onBack, onInspect, onSnoozePing }: InstrumentHubScreenProps) {
  const { signals, loading } = useInstrumentSignals(player)
  const transitOnline = !!player.transitSatelliteLaunchedAt
  const deepSpaceOnline = !!player.deepSpaceTelescopeBuilt

  const [view, setView] = useState(DEFAULT_INSTRUMENT_HUB_VIEW)
  const [transitEnabled, setTransitEnabled] = useState(true)
  const [neocpEnabled, setNeocpEnabled] = useState(true)
  const [armed, setArmed] = useState(false)
  const [highlightStrong, setHighlightStrong] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)

  const filteredSignals = useMemo(() => {
    const base = filterInstrumentSignals(signals, view)
    return base.filter(signal => {
      if (signal.kind === 'transit' && !transitEnabled) return false
      if (signal.kind === 'deep-space' && !neocpEnabled) return false
      if (highlightStrong && signal.kind === 'transit') {
        const sn = Number.parseFloat(signal.subtitle.split('S/N ')[1] ?? '0')
        return sn >= 12
      }
      return true
    })
  }, [signals, view, transitEnabled, neocpEnabled, highlightStrong])

  useEffect(() => {
    setView(current => selectInstrumentSignalIndex(current, current.selectedIndex, filteredSignals.length))
  }, [filteredSignals.length])

  const selectedSignal = filteredSignals[view.selectedIndex] ?? null

  useEffect(() => {
    if (!autoAdvance || filteredSignals.length === 0) return
    const timer = window.setInterval(() => {
      setView(current => selectInstrumentSignalIndex(
        current,
        (current.selectedIndex + 1) % filteredSignals.length,
        filteredSignals.length,
      ))
    }, 4200)
    return () => window.clearInterval(timer)
  }, [autoAdvance, filteredSignals.length])

  const openSelectedInspector = () => {
    if (!selectedSignal) return
    setArmed(true)
    onInspect(selectedSignal)
  }

  const updateSourceFilter = (sourceFilter: InstrumentSourceFilter) => {
    setView(current => selectInstrumentSignalIndex({ ...current, sourceFilter }, current.selectedIndex, filteredSignals.length))
  }

  return (
    <ScenePanel
      ambient="observatory"
      className={`game-screen theme-deep ${styles.screen}`}
      data-testid="instrument-hub-screen"
      scene={(
        <InstrumentHubScene
          classify={(
            <InstrumentHubClassifyScreen
              signal={selectedSignal}
              gain={view.gain}
              zoom={view.zoom}
              scrub={view.scrub}
              armed={armed}
              loading={loading}
            />
          )}
          queue={(
            <section className={styles.queue} aria-label="Instrument signals">
              <header className={styles.queueHeader}>
                <span className={styles.queueEyebrow}>Downlink queue</span>
                <span className={styles.queueCount}>{filteredSignals.length.toString().padStart(2, '0')} READY</span>
              </header>
              <div className={styles.queueList}>
                {loading && <p className={styles.queueEmpty}>Acquiring instrument downlink.</p>}
                {!loading && filteredSignals.length === 0 && (
                  <p className={styles.queueEmpty}>
                    No unresolved instrument data. Orbit stays linked; a ping appears on Earth Base when a new downlink arrives.
                  </p>
                )}
                {filteredSignals.map((signal, index) => (
                  <button
                    key={`${signal.kind}:${signal.id}`}
                    type="button"
                    className={`${styles.queueItem}${index === view.selectedIndex ? ` ${styles.queueItemActive}` : ''}`}
                    data-testid="instrument-signal"
                    onClick={() => setView(current => selectInstrumentSignalIndex(current, index, filteredSignals.length))}
                  >
                    <span className={styles.queueKind}>{sourceLabel(signal.kind)}</span>
                    <strong className={styles.queueTitle}>{signal.title}</strong>
                    <span className={styles.queueMeta}>{signal.subtitle}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.inspect}
                data-testid="instrument-signal-inspect"
                disabled={!selectedSignal}
                onClick={openSelectedInspector}
              >
                Open Inspector
              </button>
            </section>
          )}
          controls={(
            <InstrumentHubControls
              sourceFilter={view.sourceFilter}
              unresolvedOnly={view.unresolvedOnly}
              selectedIndex={view.selectedIndex}
              visibleCount={filteredSignals.length}
              gain={view.gain}
              zoom={view.zoom}
              scrub={view.scrub}
              armed={armed}
              transitEnabled={transitEnabled}
              neocpEnabled={neocpEnabled}
              highlightStrong={highlightStrong}
              autoAdvance={autoAdvance}
              onSourceFilter={updateSourceFilter}
              onToggleUnresolved={() => setView(current => ({ ...current, unresolvedOnly: !current.unresolvedOnly }))}
              onSelectIndex={index => setView(current => selectInstrumentSignalIndex(current, index, filteredSignals.length))}
              onGainChange={gain => setView(current => ({ ...current, gain }))}
              onZoomChange={zoom => setView(current => ({ ...current, zoom }))}
              onScrubChange={scrub => setView(current => ({ ...current, scrub }))}
              onToggleTransit={() => setTransitEnabled(value => !value)}
              onToggleNeocp={() => setNeocpEnabled(value => !value)}
              onToggleArmed={() => setArmed(value => !value)}
              onToggleHighlight={() => setHighlightStrong(value => !value)}
              onToggleAutoAdvance={() => setAutoAdvance(value => !value)}
              onOpenInspector={openSelectedInspector}
              onSnoozePing={() => onSnoozePing?.()}
            />
          )}
        />
      )}
    >
      <TopBar eyebrow="ORBITAL OBSERVATORY / DATA LINK" title="Instrument Hub" onBack={onBack} glass />
      <div className={styles.hint} data-ui-zone={UI_ZONES.screenContent}>
        Use the console to filter, scrub, and arm the selected downlink. The classify screen stays dominant on portrait mobile.
      </div>
    </ScenePanel>
  )
}

export type InstrumentHubInspectScreen = Extract<import('@/lib/game-types').Screen, 'galaxy' | 'asteroid-discovery'>
