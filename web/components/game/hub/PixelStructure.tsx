'use client'

import { structureTier } from '@/lib/scene/base-world'
import styles from './BaseLayerScene.module.css'

const KIT = '/game/assets/base/kit'

/** Native pad stack: concrete slab, lattice gantry, cream rocket. Sizes follow --px. */
function LaunchpadKit({ tier }: { tier: number }) {
  return (
    <span data-pixel-structure="launchpad" data-tier={tier} className={styles.padStack}>
      <img src={`${KIT}/pad-gantry-frame.png`} alt="" draggable={false} className={styles.padGantry} />
      <img src={`${KIT}/pad-rocket.png`} alt="" draggable={false} className={styles.padRocket} />
      <img src={`${KIT}/pad-slab-concrete.png`} alt="" draggable={false} className={styles.padSlab} />
    </span>
  )
}

/** Side-on pixel structure. The base shows the launchpad and the glazed hangar only. */
export function PixelStructure({ kind, level = 1 }: { kind: string; level?: number }) {
  const tier = structureTier(level)
  if (kind === 'launchpad') return <LaunchpadKit tier={tier} />
  if (kind === 'hangar') {
    return <img src={`${KIT}/hangar-white.png`} alt="" draggable={false} className={styles.hangarSprite} data-pixel-structure="hangar" data-tier={tier} />
  }
  return null
}
