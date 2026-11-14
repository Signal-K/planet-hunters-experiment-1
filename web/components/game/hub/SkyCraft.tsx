'use client'

import type { InstrumentPointing } from '@/lib/research/paths'
import styles from './SkyCraft.module.css'

export interface SkyCraftItem {
  id: Extract<InstrumentPointing, 'transit' | 'deep-space'>
  name: string
  /** True when this craft has no target this week. */
  needsPointing: boolean
  /** SSL-834: signals from this craft waiting at the Data hub. The craft carries the "data ready" tag in place of a HUD pill. */
  ready?: number
}

/**
 * SSL-827: the craft the player has in Earth orbit fly across the Base sky, each on its own lane and pace, in place
 * of the old static orbit diagram. Tapping one opens the pointing screen for it, the same screen as the Point prompt
 * and the data-ready chip. A craft with no target this week pings as it flies.
 */
export function SkyCraft({ craft, onPoint, onOpenData }: { craft: SkyCraftItem[]; onPoint: (id: SkyCraftItem['id']) => void; onOpenData?: () => void }) {
  if (craft.length === 0) return null
  return (
    <div className={styles.sky} data-testid="hub-sky-craft">
      {craft.map(item => (
        <div key={item.id} className={styles.lane} data-craft={item.id}>
          <button
            type="button"
            className={styles.craft}
            data-craft={item.id}
            data-testid={`hub-sky-craft-${item.id}`}
            data-ping={item.needsPointing || undefined}
            data-ready={item.ready || undefined}
            aria-label={item.ready && onOpenData
              ? `${item.name}: ${item.ready} data ready. Open the Data hub.`
              : `${item.name}: ${item.needsPointing ? 'point it' : 'open pointing'}`}
            // A craft that needs a target opens pointing first; one with data waiting opens the Data hub to review it.
            onClick={() => (item.ready && onOpenData && !item.needsPointing ? onOpenData() : onPoint(item.id))}
          >
            {item.needsPointing && <i className={styles.ping} aria-hidden="true" />}
            <span className={styles.body} aria-hidden="true" />
            {!!item.ready && (
              <span className={styles.tag} data-testid="hub-data-ready-chip" aria-hidden="true">
                <i />{item.ready} data ready
              </span>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
