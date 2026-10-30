'use client'

import type { InstrumentSignal, InstrumentSignalKind } from '@/lib/systems/InstrumentFeedSystem'
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  type ControlStationModel,
  type StationBody,
} from '@/lib/control-station'
import type { ReactNode } from 'react'
import { WorldSpaceWeekBanner } from '@/components/game/WorldSpaceWeek'
import type { WswBanner } from '@/lib/wsw'
import styles from './ControlStationBoard.module.css'

interface ControlStationBoardProps {
  model: ControlStationModel
  onBody: (bodyId: string) => void
  onOpen: (signal: InstrumentSignal) => void
  /** Opens the Build screen from a row that asks the player to build equipment. */
  onBuild: () => void
  banner: WswBanner
  /** Extra panels under the map (daily research). */
  left?: ReactNode
  /** Extra panels under the instrument list (survey scan, charts, badges). */
  right?: ReactNode
}

const STARS: readonly { x: number; y: number; r: number }[] = [
  { x: 36, y: 42, r: 1.5 },
  { x: 84, y: 96, r: 1.2 },
  { x: 300, y: 48, r: 1.6 },
  { x: 360, y: 210, r: 1.2 },
  { x: 420, y: 64, r: 1.4 },
  { x: 590, y: 46, r: 1.5 },
  { x: 560, y: 250, r: 1.2 },
  { x: 70, y: 250, r: 1.3 },
]

function percentX(x: number): string {
  return `${(x / MAP_WIDTH) * 100}%`
}

function percentY(y: number): string {
  return `${(y / MAP_HEIGHT) * 100}%`
}

function Planet({ body }: { body: StationBody }) {
  const clipId = `control-station-clip-${body.id}`
  return (
    <g>
      {body.kind === 'planet' && (
        <circle className={styles.orbit} cx={body.x} cy={body.y} r={body.r + 40} />
      )}
      <clipPath id={clipId}>
        <circle cx={body.x} cy={body.y} r={body.r} />
      </clipPath>
      <circle className={body.kind === 'planet' ? styles.ocean : styles.ringed} cx={body.x} cy={body.y} r={body.r} />
      {body.kind === 'planet' && (
        <g clipPath={`url(#${clipId})`}>
          <ellipse className={styles.land} cx={body.x - body.r * 0.22} cy={body.y - body.r * 0.12} rx={body.r * 0.46} ry={body.r * 0.28} />
          <ellipse className={styles.land} cx={body.x + body.r * 0.28} cy={body.y + body.r * 0.2} rx={body.r * 0.2} ry={body.r * 0.34} />
        </g>
      )}
      {body.kind === 'ringed' && (
        <ellipse className={styles.ring} cx={body.x} cy={body.y} rx={body.r * 1.75} ry={body.r * 0.42} transform={`rotate(-18 ${body.x} ${body.y})`} />
      )}
    </g>
  )
}

function EquipmentPreview({ kind }: { kind: InstrumentSignalKind }) {
  if (kind === 'transit') {
    return (
      <svg className={styles.preview} viewBox="0 0 48 48" aria-hidden="true">
        <rect className={styles.plate} width="48" height="48" />
        <path className={styles.trace} d="M4 24 C10 22 14 23 18 24 C22 18 26 30 30 24 C34 20 38 22 44 23" />
        <circle className={styles.spark} cx="12" cy="14" r="1.2" />
        <circle className={styles.spark} cx="34" cy="12" r="1" />
      </svg>
    )
  }
  if (kind === 'saturn') {
    return (
      <svg className={styles.preview} viewBox="0 0 48 48" aria-hidden="true">
        <rect className={styles.plate} width="48" height="48" />
        <ellipse className={styles.previewRing} cx="24" cy="24" rx="16" ry="6" transform="rotate(-18 24 24)" />
        <circle className={styles.previewDisc} cx="24" cy="24" r="8" />
      </svg>
    )
  }
  return (
    <svg className={styles.preview} viewBox="0 0 48 48" aria-hidden="true">
      <rect className={styles.plate} width="48" height="48" />
      <circle className={styles.spark} cx="12" cy="16" r="1.4" />
      <circle className={styles.spark} cx="28" cy="12" r="1" />
      <circle className={styles.spark} cx="36" cy="22" r="1.6" />
      <circle className={styles.spark} cx="18" cy="30" r="1.2" />
      <circle className={styles.spark} cx="32" cy="34" r="1" />
    </svg>
  )
}

/**
 * Control Station in the two-tone style (SSL-691): where your instruments are on the left, what they have for you
 * on the right. Tapping a body on the map filters the list, the same as the location tabs under it.
 */
export function ControlStationBoard({ model, onBody, onOpen, onBuild, banner, left, right }: ControlStationBoardProps) {
  return (
    <div className={styles.workspace} data-testid="control-station">
      <section className={styles.left} aria-label="Your instruments">
        <span className={styles.eyebrow}>Your instruments</span>
        <div className={styles.map} data-testid="control-station-map">
          <div className={styles.stage}>
            <svg className={styles.diagram} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true">
              {STARS.map(star => <circle key={`${star.x}-${star.y}`} className={styles.star} cx={star.x} cy={star.y} r={star.r} />)}
              {model.bodies.map(body => <Planet key={body.id} body={body} />)}
            </svg>
            {model.bodies.map(body => (
              <button
                key={body.id}
                type="button"
                className={styles.bodyHit}
                data-active={model.activeBodyId === body.id}
                style={{ left: percentX(body.x), top: percentY(body.y), width: `max(44px, ${(body.r * 2 + 16) / MAP_WIDTH * 100}%)` }}
                aria-label={`Show ${body.name}`}
                onClick={() => onBody(model.activeBodyId === body.id ? 'all' : body.id)}
              >
                <span className={styles.bodyLabel}>{body.name}</span>
              </button>
            ))}
            {model.markers.map(marker => (
              marker.readyCount > 0 ? (
                <span
                  key={marker.equipmentId}
                  className={styles.mapBadge}
                  style={{ left: percentX(marker.x), top: percentY(marker.y) }}
                  data-testid="control-station-marker"
                  data-equipment-id={marker.equipmentId}
                >
                  {marker.readyCount}
                </span>
              ) : (
                <span
                  key={marker.equipmentId}
                  className={styles.mapDot}
                  style={{ left: percentX(marker.x), top: percentY(marker.y) }}
                  data-testid="control-station-marker"
                  data-equipment-id={marker.equipmentId}
                />
              )
            ))}
          </div>
        </div>
        <div className={styles.filters} role="radiogroup" aria-label="Location">
          {model.filters.map(filter => (
            <button
              key={filter.id}
              type="button"
              role="radio"
              aria-checked={filter.id === model.activeBodyId}
              className={styles.filter}
              data-testid="control-station-filter"
              onClick={() => onBody(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {left}
      </section>

      <section className={styles.right} aria-label="Instruments">
        <WorldSpaceWeekBanner banner={banner} className={styles.wsw} />
        <div className={styles.list} data-testid="control-station-list">
          {model.emptyLabel && <p className={styles.empty}>{model.emptyLabel}</p>}
          {model.groups.map(group => (
            <section key={group.locationId} className={styles.group}>
              <h2 className={styles.groupLabel}>{group.label}</h2>
              <ul className={styles.rows}>
                {group.rows.map(row => (
                  <li
                    key={row.equipmentId}
                    className={styles.row}
                    data-testid="control-station-row"
                    data-equipment-id={row.equipmentId}
                    data-ready={row.readyCount > 0}
                  >
                    <div className={styles.monitor} data-off={!row.openSignal} data-state={row.buildPrompt ? 'none' : row.live ? 'listening' : 'standby'} aria-hidden="true">
                      {/* No data yet: a glyph, since the status line under the name already says it in words. */}
                      {row.openSignal && row.previewKind ? <EquipmentPreview kind={row.previewKind} /> : row.buildPrompt ? (
                        <svg className={styles.offGlyph} viewBox="0 0 30 30"><circle cx="15" cy="15" r="11" /></svg>
                      ) : (
                        <svg className={styles.offGlyph} viewBox="0 0 30 30"><circle cx="15" cy="20" r="2" fill="currentColor" /><path d="M9 14a8 8 0 0 1 12 0M5 10a14 14 0 0 1 20 0" /></svg>
                      )}
                      {row.openSignal && <span className={styles.count}>{row.readyCount}</span>}
                    </div>
                    <div className={styles.copy}>
                      <span className={styles.name} data-testid="instrument-signal">{row.name}</span>
                      <span className={styles.status}>
                        <i className={styles.pip} data-on={row.live} aria-hidden="true" />
                        {row.status}
                      </span>
                      {row.projects.length > 0 && (
                        <span className={styles.tags}>
                          {row.projects.map(project => (
                            <span key={project.id} className={styles.tag}>{project.label}</span>
                          ))}
                        </span>
                      )}
                    </div>
                    {row.buildPrompt && (
                      <button
                        type="button"
                        className={styles.action}
                        data-testid="control-station-build"
                        aria-label={`Build ${row.name}`}
                        onClick={onBuild}
                      >
                        Build
                      </button>
                    )}
                    {row.openSignal && row.previewKind && (
                      <button
                        type="button"
                        className={styles.action}
                        data-testid="instrument-signal-inspect"
                        aria-label={`Open ${row.name}`}
                        onClick={() => row.openSignal && onOpen(row.openSignal)}
                      >
                        Open
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {right}
      </section>
    </div>
  )
}
