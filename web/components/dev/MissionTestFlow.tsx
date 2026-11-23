'use client'

import { useState } from 'react'
import styles from './MissionTestFlow.module.css'

import { missionTestPaths } from '@/lib/mission-test-paths'

export default function MissionTestFlow() {
  const [context, setContext] = useState('Regular play')
  const [index, select] = useState(0)
  const paths = missionTestPaths[context]
  const path = paths[index]
  const regions = [...new Set(paths.map(p => p.region))]
  return <section className={styles.flow} aria-label="Mission test paths">
    <div className={styles.orbit} role="group" aria-label="Play context">
      {Object.keys(missionTestPaths).map(name => <button key={name} aria-pressed={context === name} onClick={() => { setContext(name); select(0) }}>{name}</button>)}
      <span>Test flight</span>
    </div>
    <div className={styles.detail}>
      <fieldset><legend>Location group</legend>{regions.map(region => <button key={region} aria-pressed={path.region === region} onClick={() => select(paths.findIndex(p => p.region === region))}>{region}</button>)}</fieldset>
      <fieldset><legend>Mission</legend>{paths.map((p, i) => p.region === path.region && <button key={p.mission} aria-pressed={i === index} onClick={() => select(i)}>{p.mission}</button>)}</fieldset>
      <h2>Test checkpoints</h2>
      <ol>{path.steps.map(([label, key]) => <li key={key}><a href={'/game/stage?preset=' + key}>{label}</a></li>)}</ol>
      <p>Each checkpoint opens its own fixture. Use Back to pick another branch.</p>
    </div>
  </section>
}
