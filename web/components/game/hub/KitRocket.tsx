'use client'

import type { ShipRoomKind } from '@/lib/data/shipRooms'
import { KIT_ROCKET_SPACE, KIT_ROCKET_ASPECT, KIT_ROCKET_BANDS, KIT_ROCKET_STAGES, kitRocketSrc, type KitRocketStage } from '@/lib/kit-rocket'
import styles from './KitRocket.module.css'
import { useSpriteFailure } from './useSpriteFailure'

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
  const sprite = useSpriteFailure(src)
  return (
    <div
      className={[styles.root, blueprint ? styles.blueprint : '', className].filter(Boolean).join(' ')}
      style={blueprint ? { aspectRatio: KIT_ROCKET_ASPECT, width: 'auto', maxWidth: '100%', maxHeight: '100%', flex: '0 0 auto' } : undefined}
      data-testid={testId ?? 'kit-rocket'}
      data-sprite={src}
    >
      {sprite.failed && space ? (
        <svg className={styles.sprite} viewBox="0 0 44 72" role="img" aria-label="Rocket" data-art-fallback="rocket">
          <g fill="var(--ln-map-sun)" stroke="var(--ln-blueprint-ink)" strokeWidth="2">
            <path d="M16 16 22 3 28 16v43H16Z" />
            <path d="m16 46-6 14h6M28 46l6 14h-6" />
            <path d="M17 61h10v6H17Z" fill="var(--ln-blueprint-blue)" />
            <path d="M16 25h12M16 48h12" />
            <rect x="19" y="29" width="6" height="8" fill="var(--ln-blueprint-blue)" />
          </g>
        </svg>
      ) : <img ref={sprite.image} onError={sprite.onError} className={styles.sprite} src={src} alt="" draggable={false} />}
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
