'use client'

import { aboveGround, OPERATIONS_APRON, siteById, units } from '@/lib/scene/base-site'
import styles from './BaseLayerScene.module.css'

/**
 * The silo's surface pieces on the strip: the cutaway and its lift-shaft button. Everything else in the world
 * (sky, steppe, escarpments, paved ground, weather and sky events) is game objects drawn by `BaseWorldCanvas`.
 */
export function BaseLayerScene({ siloBuilt = false, operationsOnline = false, onOpenSilo }: { siloBuilt?: boolean; operationsOnline?: boolean; onOpenSilo?: () => void }) {
  if (!siloBuilt && !operationsOnline) return null
  const shaft = siteById('shaft')
  return (
    <div className={styles.scene} data-testid="base-layer-scene" data-silo={siloBuilt ? 'built' : 'empty'} data-operations={operationsOnline || undefined} aria-hidden={siloBuilt && onOpenSilo ? undefined : true} style={{ background: 'none', pointerEvents: 'none' }}>
      {operationsOnline && <OperationsApron />}
      {siloBuilt && <div className={styles.shaftWrap} data-layer="cutaway" data-silo="built" style={{ left: units(shaft.x) }}>
        <img src="/game/assets/base/kit/silo-cutaway.png" alt="" className={styles.shaftArt} data-layer="shaft" />
      </div>}
      {siloBuilt && onOpenSilo && (
        <button type="button" className={styles.shaftButton} style={{ left: units(shaft.x), pointerEvents: 'auto' }} data-testid="base-lift-shaft" aria-label="Open silo" onClick={onOpenSilo} />
      )}
    </div>
  )
}

/** Once an agency can launch, the pad is supported by a small live apron.
 * These are shared service assets, not player-owned buildings: the Hangar,
 * Exchange and Control Station still arrive through the build progression. */
function OperationsApron() {
  const facility = ({ id, src, x, width, lift }: typeof OPERATIONS_APRON.props[number]) => (
    <img key={id} src={`/game/assets/${src}`} alt="" draggable={false} data-apron-prop={id} className={`${styles.apronProp} ${styles[id] ?? ''}`} style={{ left: units(x), width: units(width), bottom: aboveGround(lift) }} />
  )
  return <div className={styles.operationsApron} data-testid="base-operations-apron" aria-hidden="true">
    {OPERATIONS_APRON.props.map(facility)}
  </div>
}
