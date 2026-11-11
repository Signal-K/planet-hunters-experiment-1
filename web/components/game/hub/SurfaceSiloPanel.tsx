'use client'

import React from 'react'
import { SURFACE_SILO_CAPACITY } from '@/lib/data'
import { buildingLevel, siloCapacityMultiplier } from '@/lib/data/building-levels'
import { storedMinerals } from '@/components/game/hub/HubSubsurfaceView'
import styles from './SurfaceSiloPanel.module.css'

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
  return (
    <aside className={`ln-action-confirm ${styles.panel}`} data-testid="surface-silo-panel" aria-label="Surface Silo">
      <div className="ln-action-confirm__copy">
        <span>{`Level ${level} · above ground${held >= capacity ? ' · full' : ''}`}</span>
        <strong>{`Surface Silo · ${held} / ${capacity} U`}</strong>
        {minerals.length === 0
          ? <p>Empty. Ore you bring home from a mission is stored here.</p>
          : (
            <ul className={styles.list}>
              {minerals.map(m => (
                <li key={m.id} className={styles.row}>
                  <span className={styles.swatch} style={{ background: m.color }} aria-hidden />
                  <span className={styles.name}>{titleCase(m.name)}</span>
                  <span className={styles.amount}>{m.amount} U</span>
                </li>
              ))}
            </ul>
          )}
        {beyond > 0 && <p>{vault
          ? `${beyond} U more is in the Mineral Vault underground.`
          : `Full. ${beyond} U more is waiting with nowhere to go: sell it, or build a Mineral Vault underground.`}</p>}
      </div>
      <div className="ln-action-confirm__actions">
        <button type="button" onClick={onClose} data-testid="surface-silo-close">CLOSE</button>
        {onSell && total > 0 && <button type="button" className="is-primary" onClick={onSell} data-testid="surface-silo-sell">SELL AT EXCHANGE</button>}
      </div>
    </aside>
  )
}
