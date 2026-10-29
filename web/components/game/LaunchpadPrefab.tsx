'use client'
import type { CSSProperties } from 'react'
import { authoredScene, resolvePrefab } from '@/lib/engine/SceneGraph'
import styles from './screens/RocketBuilderScene.module.css'

// Resolve once in percentages. The host fits the prefab; no per-frame React state or resize observer.
const objects = resolvePrefab(authoredScene('launchpad')!, 'launchpad-complex', 100, 100)
const part = (id: string) => {
  const object = objects.find(item => item.id === id)
  if (!object || object.layout !== 'shared') throw new Error(`Missing shared launchpad part ${id}`)
  return object
}
const frame = (id: string): CSSProperties => {
  const { x, y, w, h } = part(id).frame
  return { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }
}
const source = (id: string) => part(id).asset!.replace(/^web\/public/, '')
const rocket = part('staged-rocket').frame

export default function LaunchpadPrefab({ towerLabel, onChooseMission, rocketId = 'explorer', showRocket = true }: { towerLabel: string; onChooseMission: () => void; rocketId?: string; showRocket?: boolean }) {
  return (
    <div className={styles.complex} data-testid="launchpad-complex" data-engine-prefab="launchpad" style={{
      '--rocket-center': `${rocket.x + rocket.w / 2}%`,
      '--rocket-foot': `${100 - rocket.y - rocket.h}%`,
      '--rocket-top': `${100 - rocket.y}%`,
    } as CSSProperties}>
      <img className={styles.complexArt} style={frame('apron')} src={source('apron')} alt="" data-engine-object="apron" />
      {showRocket && <div className={styles.rocketSlot} style={frame('staged-rocket')} data-engine-object="staged-rocket" data-rocket-id={rocketId}>
        <img className={styles.rocket} src={source('staged-rocket')} alt="" data-testid="launch-rocket" />
      </div>}
      <img className={styles.scaffold} style={frame('assembly-scaffold')} src={source('assembly-scaffold')} alt="" data-testid="pad-scaffold" data-engine-object="assembly-scaffold" />
      <span className={styles.weld} aria-hidden="true" />
      <button type="button" className={styles.gantryHit} style={frame('launch-control')} data-engine-object="launch-control" data-testid="launchpad-status-card" data-action="primary-mission" aria-label={towerLabel}
        onClick={part('launch-control').action === 'choose-mission' ? onChooseMission : undefined}>
        <span data-testid="launchpad-new-mission-btn" />
      </button>
    </div>
  )
}
