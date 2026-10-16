'use client'

import { siteById, units } from '@/lib/scene/base-site'
import styles from './BaseLayerScene.module.css'

/**
 * The silo's surface pieces on the strip: the cutaway and its lift-shaft button. Everything else in the world
 * (sky, steppe, escarpments, paved ground, weather and sky events) is game objects drawn by `BaseWorldCanvas`.
 */
export function BaseLayerScene({ siloBuilt = false, onOpenSilo }: { siloBuilt?: boolean; onOpenSilo?: () => void }) {
  if (!siloBuilt) return null
  const shaft = siteById('shaft')
  return (
    <div className={styles.scene} data-testid="base-layer-scene" data-silo="built" aria-hidden={onOpenSilo ? undefined : true} style={{ background: 'none', pointerEvents: 'none' }}>
      <div className={styles.shaftWrap} data-layer="cutaway" data-silo="built" style={{ left: units(shaft.x) }}>
        <img src="/game/assets/base/kit/silo-cutaway.png" alt="" className={styles.shaftArt} data-layer="shaft" />
      </div>
      {onOpenSilo && (
        <button type="button" className={styles.shaftButton} style={{ left: units(shaft.x), pointerEvents: 'auto' }} data-testid="base-lift-shaft" aria-label="Open silo" onClick={onOpenSilo} />
      )}
    </div>
  )
}
