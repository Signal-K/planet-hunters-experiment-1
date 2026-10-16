'use client'

import type { ShipRoomKind } from '@/lib/data/shipRooms'
import { KIT_ROCKET_SPACE, KIT_ROCKET_ASPECT, KIT_ROCKET_BANDS, KIT_ROCKET_STAGES, kitRocketSrc, type KitRocketStage } from '@/lib/kit-rocket'
import styles from './KitRocket.module.css'

interface KitRocketProps {
  parts?: Partial<Record<ShipRoomKind, string>> | null
  /** Hangar blueprint: tint the sprite and outline the stage being fitted. */
  blueprint?: boolean
  active?: ShipRoomKind
  onSelect?: (kind: KitRocketStage) => void
  className?: string
  testId?: string
  /** In space the side boosters are gone: draw the core stage only (SSL-553). */
  space?: boolean
}

/** The base-kit pixel rocket. Blueprint mode tints it and outlines one stage. */
export function KitRocket({ parts, blueprint = false, active, onSelect, className, testId, space = false }: KitRocketProps) {
  const src = space && !blueprint ? KIT_ROCKET_SPACE : kitRocketSrc(parts)
  return (
    <div
      className={[styles.root, blueprint ? styles.blueprint : '', className].filter(Boolean).join(' ')}
      style={blueprint ? { aspectRatio: KIT_ROCKET_ASPECT, width: 'auto', maxWidth: '100%', maxHeight: '100%', flex: '0 0 auto' } : undefined}
      data-testid={testId ?? 'kit-rocket'}
      data-sprite={src}
    >
      <img className={styles.sprite} src={src} alt="" draggable={false} />
      {blueprint && KIT_ROCKET_STAGES.map(kind => {
        const band = KIT_ROCKET_BANDS[kind]
        const fitted = !!parts?.[kind]
        return (
          <span key={kind}>
            {fitted && (
              <span
                className={styles.piece}
                data-kind={kind}
                style={{ top: `${band.top * 100}%`, height: `${band.height * 100}%` }}
              >
                <img
                  className={styles.pieceImg}
                  src={src}
                  alt=""
                  draggable={false}
                  style={{ height: `${100 / band.height}%`, top: `${-(band.top / band.height) * 100}%` }}
                />
              </span>
            )}
            <button
              type="button"
              className={styles.hit}
              style={{ top: `${band.top * 100}%`, height: `${band.height * 100}%` }}
              aria-pressed={active === kind}
              aria-label={kind}
              data-testid={`kit-rocket-${kind}`}
              onClick={() => onSelect?.(kind)}
            />
          </span>
        )
      })}
    </div>
  )
}
