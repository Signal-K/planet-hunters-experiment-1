'use client'

import { useState, type KeyboardEvent, type ReactNode } from 'react'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import {
  SKY_VIEWS,
  type SkyAnomaly,
  type SkyView,
  type StationHistory,
  type StationTelescope,
} from '@/lib/control-station-sky'
import styles from './ControlStationConsole.module.css'

/**
 * Control station console (SSL-730). Two tones: the telescopes on the left, the sky map and Earth's horizon on the
 * right. Upright, the map and horizon come first and the telescopes sit under them. Each telescope is a switch: on,
 * it filters the map to what it finds. The View switch picks explored, unexplored or everything in the catalogue.
 * Tapping an unexplored anomaly opens its classify tool.
 */
interface ControlStationConsoleProps {
  telescopes: StationTelescope[]
  anomalies: SkyAnomaly[]
  view: SkyView
  onView: (view: SkyView) => void
  telescopeId: string | null
  onTelescope: (id: string | null) => void
  onOpen: (signal: InstrumentSignal) => void
  history: StationHistory
  /** True while the first feed answer is still out. */
  acquiring: boolean
  onBuild: () => void
  buildCost?: string
  buildShortfall?: string | null
  /** The back and help controls, top left. */
  rail: ReactNode
  /** Opens the logbook sheet (daily research, survey scan, charts, badges). */
  onLogbook: () => void
}

const EMPTY: Record<SkyView, string> = {
  unexplored: 'Nothing waiting. New candidates arrive each day.',
  explored: 'Nothing classified here yet.',
  all: 'Nothing in your catalogue here yet.',
}

function AnomalyGlyph({ anomaly }: { anomaly: SkyAnomaly }) {
  if (anomaly.shape === 'asteroid') {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4 13 3 17 8 15 15 8 17 3 11Z" /></svg>
  }
  if (anomaly.shape === 'ringed') {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="5" /><ellipse cx="10" cy="10" rx="9" ry="3" transform="rotate(-18 10 10)" /></svg>
  }
  return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6" /></svg>
}

function TelescopeIcon({ place }: { place: StationTelescope['place'] }) {
  if (place === 'surface') {
    // Dome and slit on a pier.
    return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 24a10 10 0 0 1 20 0Z" /><path d="M16 14v-4M19 11l3-4" /><path d="M4 24h24M12 24v4h8v-4" /></svg>
  }
  if (place === 'orbit') {
    // Tube with solar wings.
    return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="12" y="9" width="8" height="14" rx="2" /><path d="M12 14H4v5h8M20 14h8v5h-8M16 9V5" /></svg>
  }
  return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="6" /><ellipse cx="16" cy="16" rx="13" ry="4" transform="rotate(-18 16 16)" /></svg>
}

/** Where each place sits on the horizon strip, in percent of the strip. */
const HORIZON_SPOT: Record<StationTelescope['place'], { left: number; top: number }> = {
  surface: { left: 30, top: 70 },
  orbit: { left: 58, top: 24 },
  offworld: { left: 88, top: 18 },
}

function ViewSwitch({ view, onView }: { view: SkyView; onView: (view: SkyView) => void }) {
  const index = SKY_VIEWS.findIndex(item => item.id === view)
  const step = (event: KeyboardEvent, delta: number) => {
    event.preventDefault()
    onView(SKY_VIEWS[(index + delta + SKY_VIEWS.length) % SKY_VIEWS.length].id)
  }
  return (
    <div
      className={styles.viewSwitch}
      role="radiogroup"
      aria-label="Show"
      data-testid="control-station-view"
      style={{ '--pos': index } as React.CSSProperties}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') step(event, 1)
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') step(event, -1)
      }}
    >
      <span className={styles.viewThumb} aria-hidden="true" />
      {SKY_VIEWS.map(item => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={item.id === view}
          tabIndex={item.id === view ? 0 : -1}
          data-view={item.id}
          onClick={() => onView(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function ControlStationConsole({
  telescopes,
  anomalies,
  view,
  onView,
  telescopeId,
  onTelescope,
  onOpen,
  history,
  acquiring,
  onBuild,
  buildCost,
  buildShortfall = null,
  rail,
  onLogbook,
}: ControlStationConsoleProps) {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const picked = anomalies.find(item => item.id === pickedId) ?? null
  const active = telescopes.find(item => item.id === telescopeId) ?? null
  const waiting = anomalies.filter(item => item.state === 'unexplored').length
  const toggle = (id: string) => { setPickedId(null); onTelescope(telescopeId === id ? null : id) }

  return (
    <article className={styles.workspace} data-testid="control-station">
      {rail}
      <section className={styles.sky} aria-label="Sky map">
        <ViewSwitch view={view} onView={next => { setPickedId(null); onView(next) }} />
        <div className={styles.scope} data-testid="control-station-map">
          <div className={styles.scopeBar}>
            <span className={styles.scopeName}>Sky map</span>
            <b>{active ? active.name : 'All telescopes'}</b>
            <span>{acquiring ? 'Acquiring' : `${waiting} to classify`}</span>
          </div>
          <div className={styles.field}>
            {anomalies.map(anomaly => (
              <button
                key={anomaly.id}
                type="button"
                className={styles.anomaly}
                data-state={anomaly.state}
                data-picked={anomaly.id === pickedId}
                data-testid="control-station-anomaly"
                style={{ left: `${anomaly.x * 100}%`, top: `${anomaly.y * 100}%` }}
                aria-label={`${anomaly.label}, ${anomaly.detail}`}
                onClick={() => {
                  if (anomaly.signal) onOpen(anomaly.signal)
                  else setPickedId(anomaly.id === pickedId ? null : anomaly.id)
                }}
              >
                <AnomalyGlyph anomaly={anomaly} />
              </button>
            ))}
            {anomalies.length === 0 && <p className={styles.fieldEmpty}>{acquiring ? 'Acquiring signal…' : EMPTY[view]}</p>}
          </div>
          {picked && (
            <div className={styles.readout} role="status" data-testid="control-station-readout">
              <b>{picked.label}</b>
              <span>{picked.detail}</span>
            </div>
          )}
        </div>
        <div className={styles.horizon} data-testid="control-station-horizon">
          <svg className={styles.earth} viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">
            <ellipse className={styles.orbitLine} cx="300" cy="300" rx="470" ry="270" />
            <ellipse className={styles.atmosphere} cx="300" cy="300" rx="424" ry="234" />
            <ellipse className={styles.ground} cx="300" cy="300" rx="420" ry="230" />
          </svg>
          <span className={styles.earthLabel}>Earth</span>
          {telescopes.map(scope => (
            <button
              key={scope.id}
              type="button"
              className={styles.post}
              data-place={scope.place}
              data-built={scope.built}
              aria-pressed={scope.id === telescopeId}
              aria-label={`${scope.name}, ${scope.status}`}
              disabled={!scope.built}
              style={{ left: `${HORIZON_SPOT[scope.place].left}%`, top: `${HORIZON_SPOT[scope.place].top}%` }}
              onClick={() => toggle(scope.id)}
            >
              <TelescopeIcon place={scope.place} />
              {scope.readyCount > 0 && <i>{scope.readyCount}</i>}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.desk} aria-label="Telescopes">
        <h1 className={styles.title}>Control station</h1>
        <ul className={styles.keys}>
          {telescopes.map(scope => (
            <li key={scope.id} className={styles.key} data-testid="control-station-telescope" data-telescope={scope.id} data-on={scope.id === telescopeId}>
              <button
                type="button"
                className={styles.keyToggle}
                aria-pressed={scope.id === telescopeId}
                disabled={!scope.built}
                onClick={() => toggle(scope.id)}
              >
                <span className={styles.switch} aria-hidden="true"><span /></span>
                <span className={styles.keyCopy}>
                  <b>{scope.name}</b>
                  <small>
                    <i className={styles.led} data-on={scope.live} data-ready={scope.readyCount > 0} aria-hidden="true" />
                    {scope.status}
                  </small>
                  <em>{scope.finds}</em>
                </span>
                {scope.built && <span className={styles.counter} data-ready={scope.readyCount > 0} aria-label={`${scope.readyCount} ready`}>{String(scope.readyCount).padStart(2, '0')}</span>}
              </button>
              {!scope.built && (
                <button
                  type="button"
                  className={styles.build}
                  data-testid="control-station-build"
                  disabled={!!buildShortfall}
                  aria-label={buildShortfall ? `Build ${scope.name}: needs ${buildShortfall}` : `Build ${scope.name}${buildCost ? ` for ${buildCost}` : ''}`}
                  onClick={onBuild}
                >
                  {buildShortfall ? `Needs ${buildShortfall}` : `Build${buildCost ? ` · ${buildCost}` : ''}`}
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className={styles.history} data-testid="control-station-history">
          <div className={styles.tally}>
            <b>{history.total}</b>
            <span>classified</span>
          </div>
          {history.recent.length > 0 && (
            <ul className={styles.recent}>
              {history.recent.map(item => <li key={item.id}><b>{item.label}</b><span>{item.detail}</span></li>)}
            </ul>
          )}
          <button type="button" className={styles.logbook} data-testid="control-station-logbook" onClick={onLogbook}>Logbook</button>
        </div>
      </section>
    </article>
  )
}
