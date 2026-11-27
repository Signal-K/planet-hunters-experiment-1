'use client'

import { agencyTier } from '@/lib/agency/construction-translation'
import type { Player } from '@/lib/game-types'
import { MINERAL_META, SURFACE_SILO_CAPACITY } from '@/lib/data'
import { siloCapacityMultiplier } from '@/lib/data/building-levels'
import styles from './SurfaceSiloPanel.module.css'

interface StoredMineral { id: string; amount: number; name: string; symbol: string; color: string; rarity: string }

interface SurfaceSiloPanelProps {
  stash?: Record<string, number>
  agencyLevels?: Player['agencyLevels']
  onClose: () => void
}

/** Ore the Surface Silo holds at its current level. */
export function surfaceSiloCapacity(agencyLevels?: Player['agencyLevels']): number {
  return SURFACE_SILO_CAPACITY * siloCapacityMultiplier(agencyTier({ agencyLevels }, 'ore-storage'))
}

const titleCase = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

export function SurfaceSiloPanel({ stash, agencyLevels, onClose }: SurfaceSiloPanelProps) {
  const capacity = surfaceSiloCapacity(agencyLevels)
  const level = agencyTier({ agencyLevels }, 'ore-storage')
  const { inSilo: minerals, held, total, beyond } = surfaceSiloContents(stash, capacity)
  const amounts = new Map(minerals.map(m => [m.id, m.amount]))
  const holdings = storedMinerals(stash)
  return (
    <section className={styles.panel} data-testid="surface-silo-panel" aria-label="Surface Silo">
      <header className={styles.header}>
        <button type="button" onClick={onClose} data-testid="surface-silo-close">‹ BACK</button>
        <div>
          <p className={styles.eyebrow}>{`Level ${level} · above ground${held >= capacity ? ' · full' : ''}`}</p>
          <h1>Surface Silo</h1>
        </div>
      </header>
      <div className={styles.contents}>
        <div className={styles.capacity}>
          <span>STORAGE</span><strong data-testid="silo-held">{held} / {capacity} U</strong>
          <meter min={0} max={capacity} value={held} aria-label="Surface Silo fill" />
        </div>
        {holdings.length === 0
          ? <p>Empty. Ore you mine on a free run is stored here.</p>
          : (
            <table className={styles.list}>
              <thead><tr><th scope="col">Mineral</th><th scope="col">In silo</th>{beyond > 0 && <th scope="col">Waiting</th>}</tr></thead>
              <tbody>{holdings.map(m => {
                const stored = amounts.get(m.id) ?? 0
                return <tr key={m.id}>
                  <th scope="row"><span className={styles.swatch} style={{ background: m.color }} aria-hidden />{titleCase(m.name)}</th>
                  <td>{stored} U</td>
                  {beyond > 0 && <td>{m.amount - stored} U</td>}
                </tr>
              })}</tbody>
            </table>
          )}
        {beyond > 0 && <p>{`Full. ${beyond} U more is waiting with nowhere to go: it is left behind when you next fly.`}</p>}
      </div>
      <footer className={styles.actions}>
        <p>{total} U held across Earth storage</p>
      </footer>
    </section>
  )
}

/** The Earth stash as a list, largest first. */
function storedMinerals(stash: Record<string, number> = {}): StoredMineral[] {
  return Object.entries(stash)
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => {
      const meta = MINERAL_META[id]
      return { id, amount, name: meta?.name ?? id, symbol: meta?.sym ?? id.slice(0, 2).toUpperCase(), color: meta?.color ?? 'var(--ln-text-muted)', rarity: meta?.rarity ?? 'unclassified' }
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
}

/** Splits the Earth stash between the Surface Silo and what lies past it, filling the silo largest ore first. */
function surfaceSiloContents(stash: Record<string, number> | undefined, capacity: number) {
  let room = capacity
  const inSilo = storedMinerals(stash).map(m => {
    const amount = Math.min(m.amount, room)
    room -= amount
    return { ...m, amount }
  }).filter(m => m.amount > 0)
  const total = storedMinerals(stash).reduce((sum, m) => sum + m.amount, 0)
  const held = capacity - room
  return { inSilo, held, total, beyond: total - held }
}
