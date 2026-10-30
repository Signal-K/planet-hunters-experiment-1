'use client'

import { useState } from 'react'
import type { Player } from '@/lib/game-types'
import { unlockedConstellations, type UnlockedConstellation } from '@/lib/data/constellations'
import styles from './BaseConstellations.module.css'

/** Earned patterns are a night-sky detail, not a daytime HUD layer. */
export function BaseConstellations({ player, visible = true }: { player: Player; visible?: boolean }) {
  const unlocked = unlockedConstellations(player)
  const [selected, setSelected] = useState<string | null>(null)
  if (!visible || unlocked.length === 0) return null

  return <div className={styles.layer} aria-label="Unlocked constellations" data-testid="base-constellations">
    {unlocked.map(constellation => <Constellation key={constellation.id} constellation={constellation} selected={selected === constellation.id} onSelect={() => setSelected(selected === constellation.id ? null : constellation.id)} />)}
    {selected && <aside className={styles.archive} aria-label="Sky archive">
      {(() => {
        const active = unlocked.find(constellation => constellation.id === selected)
        if (!active) return null
        return <>
      <div className={styles.archiveHeader}>
        <span className={styles.archiveKicker}>Sky archive</span>
        <button type="button" className={styles.archiveClose} onClick={() => setSelected(null)} aria-label="Close sky archive">×</button>
      </div>
      <span className={styles.archiveEyebrow}>Recorded milestone</span>
      <strong className={styles.archiveTitle}>{active.name}</strong>
      <span className={styles.archiveSource}>{active.earnedBy}</span>
      <div className={styles.explanation}>
        <span className={styles.explanationLabel}>About this pattern</span>
        <p>{active.description}</p>
        <small>Recorded from {active.earnedBy}</small>
      </div>
        </>
      })()}
    </aside>}
  </div>
}

function Constellation({ constellation, selected, onSelect }: { constellation: UnlockedConstellation; selected: boolean; onSelect: () => void }) {
  return <div className={styles.constellation} data-testid={`constellation-${constellation.id}`}>
    <svg className={styles.lines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={constellation.points.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')} />
    </svg>
    {constellation.points.map(([x, y], index) => <button key={index} type="button" className={styles.star} style={{ left: `${x * 100}%`, top: `${y * 100}%` }} onClick={onSelect} aria-label={`${constellation.name} star`} />)}
  </div>
}
