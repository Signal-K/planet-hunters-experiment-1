'use client'

import { useState } from 'react'
import type { FlowSummary } from '@/lib/authoring/studio-types'
import styles from './Studio.module.css'

interface Props {
  flow: FlowSummary
  step: number
  onStep: (index: number) => void
  onClose: () => void
}

/** A mission as steps: click one to open its scene in the setup the script names, and read what to do there. */
export default function FlowBar({ flow, step, onStep, onClose }: Props) {
  const [more, setMore] = useState(false)
  const current = flow.steps[step]
  return (
    <div className={styles.flow} data-testid="flow-bar">
      <div className={styles.flowHead}>
        <span className={styles.flowName}>{flow.name}</span>
        <span className={styles.steps} role="group" aria-label="Steps">
          {flow.steps.map((s, i) => (
            <button key={i} type="button" className={styles.step} aria-current={i === step ? 'step' : undefined} onClick={() => onStep(i)} data-testid={`flow-step-${i + 1}`} title={s.title}>{i + 1} {s.title}</button>
          ))}
        </span>
        <button type="button" className={`${styles.btn} ${styles.btnQuiet} ${styles.iconBtn}`} onClick={onClose} aria-label="Leave this mission" title="Leave this mission">×</button>
      </div>
      {current?.instructions && (
        <p className={styles.flowText} data-testid="flow-text" style={more ? undefined : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} onClick={() => setMore(m => !m)} title="Click to read more">
          {current.instructions.trim()}
        </p>
      )}
    </div>
  )
}
