'use client'

import { MINERAL_META, SURFACE_SILO_CAPACITY } from '@/lib/data'
import { buildingLevel, siloCapacityMultiplier } from '@/lib/data/building-levels'
import styles from './SurfaceSiloPanel.module.css'

interface StoredMineral { id: string; amount: number; name: string; symbol: string; color: string; rarity: string }

/** The Earth stash as a list, largest first. */
export function storedMinerals(stash: Record<string, number> = {}): StoredMineral[] {
  return Object.entries(stash)
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => {
      const meta = MINERAL_META[id]
      return { id, amount, name: meta?.name ?? id, symbol: meta?.sym ?? id.slice(0, 2).toUpperCase(), color: meta?.color ?? 'var(--ln-text-muted)', rarity: meta?.rarity ?? 'unclassified' }
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
}

interface SurfaceSiloPanelProps {
  stash?: Record<string, number>
  buildingLevels?: Record<string, number>
  subsurfaceBuilt?: string[]
  /** Opens the Exchange. Hidden when the Base has no way to sell. */
  onSell?: () => void
  onClose: () => void
}

/** Ore the Surface Silo holds at its current level. */
export function surfaceSiloCapacity(buildingLevels?: Record<string, number>): number {
  return SURFACE_SILO_CAPACITY * siloCapacityMultiplier(buildingLevel({ buildingLevels }, 'surface-silo'))
}

/** Splits the Earth stash between the Surface Silo and what lies past it, filling the silo largest ore first. */
export function surfaceSiloContents(stash: Record<string, number> | undefined, capacity: number) {
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

const titleCase = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

export function SurfaceSiloPanel({ stash, buildingLevels, subsurfaceBuilt, onSell, onClose }: SurfaceSiloPanelProps) {
  const capacity = surfaceSiloCapacity(buildingLevels)
  const level = buildingLevel({ buildingLevels }, 'surface-silo')
  const { inSilo: minerals, held, total, beyond } = surfaceSiloContents(stash, capacity)
  const vault = (subsurfaceBuilt ?? []).includes('mineral-vault')
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
          <span>STORAGE</span><strong>{held} / {capacity} U</strong>
          <meter min={0} max={capacity} value={held} aria-label="Surface Silo fill" />
        </div>
        {holdings.length === 0
          ? <p>Empty. Ore you bring home from a mission is stored here.</p>
          : (
            <table className={styles.list}>
              <thead><tr><th scope="col">Mineral</th><th scope="col">In silo</th>{beyond > 0 && <th scope="col">{vault ? 'In vault' : 'Waiting'}</th>}</tr></thead>
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
        {beyond > 0 && <p>{vault
          ? `${beyond} U more is in the Mineral Vault underground.`
          : `Full. ${beyond} U more is waiting with nowhere to go: sell it, or build a Mineral Vault underground.`}</p>}
      </div>
      <footer className={styles.actions}>
        <p>{total} U held across Earth storage</p>
        {onSell && total > 0 && <button type="button" onClick={onSell} data-testid="surface-silo-sell">SELL AT EXCHANGE</button>}
      </footer>
    </section>
  )
}
