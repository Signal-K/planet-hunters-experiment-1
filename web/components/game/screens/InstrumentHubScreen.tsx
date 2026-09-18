'use client'

import ScenePanel from '@/components/game/ScenePanel'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { OrbitalInstrumentNetwork } from '@/components/game/hub/OrbitalInstrumentNetwork'
import TopBar from '@/components/ui/TopBar'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { useInstrumentSignals } from '@/lib/hooks/useInstrumentSignals'
import { UI_ZONES } from '@/lib/ui-zones'
import type { Player, Screen } from '@/lib/game-types'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import styles from './InstrumentHubScreen.module.css'

interface InstrumentHubScreenProps {
  player: Player
  onBack: () => void
  onInspect: (signal: InstrumentSignal) => void
}

function sourceLabel(kind: InstrumentSignal['kind']): string {
  return kind === 'transit' ? 'Transit telescope' : 'Deep space telescope'
}

export default function InstrumentHubScreen({ player, onBack, onInspect }: InstrumentHubScreenProps) {
  const { phase } = useTimeOfDay()
  const { signals, loading } = useInstrumentSignals(player)
  const transitOnline = !!player.transitSatelliteLaunchedAt
  const deepSpaceOnline = !!player.deepSpaceTelescopeBuilt

  return (
    <ScenePanel
      ambient="survey"
      className={`game-screen theme-deep ${styles.screen}`}
      data-testid="instrument-hub-screen"
      scene={<HubWorldBackground phase={phase} />}
    >
      <TopBar eyebrow="BASE / ORBIT" title="Instrument Hub" onBack={onBack} glass />
      <div className={styles.frame} data-ui-zone={UI_ZONES.screenContent}>
        <div className={styles.place} aria-hidden={false}>
          <OrbitalInstrumentNetwork
            transitOnline={transitOnline}
            deepSpaceOnline={deepSpaceOnline}
            readyCount={signals.length}
            ping={signals.length > 0}
          />
        </div>
        <section className={styles.feed} aria-label="Instrument signals">
          <div className={styles.feedEyebrow}>Downlink queue</div>
          {loading && <p className={styles.loading}>Acquiring instrument downlink.</p>}
          {!loading && signals.length === 0 && (
            <p className={styles.empty} data-testid="instrument-hub-empty">
              No unresolved instrument data. Orbit stays linked; a ping appears here when a new downlink arrives.
            </p>
          )}
          {signals.map(signal => (
            <article key={`${signal.kind}:${signal.id}`} className={styles.signal} data-testid="instrument-signal">
              <div className={styles.signalCopy}>
                <div className={styles.signalKind}>{sourceLabel(signal.kind)}</div>
                <h2 className={styles.signalTitle}>{signal.title}</h2>
                <div className={styles.signalMeta}>{signal.subtitle}</div>
              </div>
              <button
                type="button"
                className={styles.inspect}
                data-testid="instrument-signal-inspect"
                onClick={() => onInspect(signal)}
              >
                Open Inspector
              </button>
            </article>
          ))}
        </section>
      </div>
    </ScenePanel>
  )
}

export type InstrumentHubInspectScreen = Extract<Screen, 'galaxy' | 'asteroid-discovery'>
