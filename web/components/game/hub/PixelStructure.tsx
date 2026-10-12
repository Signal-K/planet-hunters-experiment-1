'use client'

import { structureTier } from '@/lib/scene/base-world'
import { KitRocket } from '@/components/game/hub/KitRocket'
import type { InstalledCustomizerPartsByKind } from '@/lib/data'
import styles from './BaseLayerScene.module.css'

const KIT = '/game/assets/base/kit'

/** Native pad stack: concrete slab, lattice gantry, cream rocket. Sizes follow --px. */
function LaunchpadKit({ tier, parts }: { tier: number; parts?: InstalledCustomizerPartsByKind | null }) {
  return (
    <span data-pixel-structure="launchpad" data-tier={tier} className={styles.padStack}>
      <img src={`${KIT}/pad-gantry-frame.png`} alt="" draggable={false} className={styles.padGantry} />
      <KitRocket parts={parts} className={styles.padRocket} testId="pad-rocket" />
      <img src={`${KIT}/pad-slab-concrete.png`} alt="" draggable={false} className={styles.padSlab} />
    </span>
  )
}

/** Side-on pixel structure. The base shows the launchpad and the glazed hangar only. */
export function PixelStructure({ kind, level = 1, parts }: { kind: string; level?: number; parts?: InstalledCustomizerPartsByKind | null }) {
  const tier = structureTier(level)
  if (kind === 'launchpad') return <LaunchpadKit tier={tier} parts={parts} />
  if (kind === 'hangar') {
    return <img src={`${KIT}/hangar-white.png`} alt="" draggable={false} className={styles.hangarSprite} data-pixel-structure="hangar" data-tier={tier} />
  }
  return null
}
