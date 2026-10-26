'use client'

import { useState } from 'react'
import type { Player } from '@/lib/game-types'
import { unlockedConstellations, type UnlockedConstellation } from '@/lib/data/constellations'
import styles from './BaseConstellations.module.css'

export function BaseConstellations({ player }: { player: Player }) {
  const unlocked = unlockedConstellations(player)
  const [selected, setSelected] = useState<string | null>(() => unlocked[0]?.id ?? null)
  if (unlocked.length === 0) return null
  const active = unlocked.find(constellation => constellation.id === selected) ?? unlocked[0]

  return <div className={styles.layer} aria-label="Unlocked constellations" data-testid="base-constellations">
    {unlocked.map(constellation => <Constellation key={constellation.id} constellation={constellation} selected={selected === constellation.id} onSelect={() => setSelected(constellation.id)} />)}
    <aside className={styles.archive} aria-label="Sky archive">
      <div className={styles.archiveHeader}>
        <span className={styles.archiveKicker}>Sky archive</span>
        <span className={styles.archiveCount}>{unlocked.length} recorded</span>
      </div>
      <p className={styles.archiveIntro}>Milestones recorded in the sky.</p>
      <div className={styles.entries} role="list">
        {unlocked.map(constellation => <button
          key={constellation.id}
          type="button"
          className={`${styles.entry} ${selected === constellation.id ? styles.entrySelected : ''}`}
          onClick={() => setSelected(constellation.id)}
          aria-pressed={selected === constellation.id}
        >
          <span className={styles.entryMarker} aria-hidden="true" />
          <span className={styles.entryCopy}>
            <strong>{constellation.name}</strong>
            <small>{constellation.earnedBy}</small>
          </span>
          <span className={styles.entryArrow} aria-hidden="true">›</span>
        </button>)}
      </div>
      <div className={styles.explanation}>
        <span className={styles.explanationLabel}>About this pattern</span>
        <p>{active.description}</p>
        <small>Recorded from {active.earnedBy}</small>
      </div>
    </aside>
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
