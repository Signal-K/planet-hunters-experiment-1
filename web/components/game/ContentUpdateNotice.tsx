'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Player, Screen } from '@/lib/game-types'
import {
  CONTENT_UPDATE_FLAG,
  contentUpdateTargeting,
  parseContentUpdatePayload,
  type ContentUpdate,
} from '@/lib/content-updates'
import { initPostHog, posthog } from '@/lib/posthog'
import styles from './ContentUpdateNotice.module.css'

const SEEN_KEY_PREFIX = 'landnam-content-update-seen:'

interface ContentUpdateNoticeProps {
  player: Player
  blocked?: boolean
  onNavigate: (screen: Screen) => void
}

export default function ContentUpdateNotice({ player, blocked = false, onNavigate }: ContentUpdateNoticeProps) {
  const [update, setUpdate] = useState<ContentUpdate | null>(null)
  const targeting = useMemo(() => contentUpdateTargeting(player), [player])
  const targetingKey = JSON.stringify(targeting)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    initPostHog()

    const evaluate = () => {
      if (!posthog.isFeatureEnabled(CONTENT_UPDATE_FLAG)) {
        setUpdate(null)
        return
      }
      const next = parseContentUpdatePayload(posthog.getFeatureFlagPayload(CONTENT_UPDATE_FLAG))
      if (!next || localStorage.getItem(`${SEEN_KEY_PREFIX}${next.id}`)) {
        setUpdate(null)
        return
      }
      setUpdate(next)
    }

    const unsubscribe = posthog.onFeatureFlags(evaluate)
    posthog.setPersonProperties(targeting)
    posthog.setPersonPropertiesForFlags(targeting, true)
    evaluate()
    return unsubscribe
  }, [targeting, targetingKey])

  useEffect(() => {
    if (!update || blocked) return
    posthog.capture('content update shown', {
      update_id: update.id,
      playstyle: targeting.landnam_playstyle,
      progression_stage: targeting.landnam_progression_stage,
    })
  }, [blocked, targeting.landnam_playstyle, targeting.landnam_progression_stage, update])

  if (!update || blocked) return null

  const dismiss = (event: 'content update dismissed' | 'content update opened') => {
    localStorage.setItem(`${SEEN_KEY_PREFIX}${update.id}`, new Date().toISOString())
    posthog.capture(event, {
      update_id: update.id,
      playstyle: targeting.landnam_playstyle,
      progression_stage: targeting.landnam_progression_stage,
    })
    setUpdate(null)
  }

  return (
    <div className={styles.scrim} data-testid="content-update-notice">
      <section className={styles.notice} role="dialog" aria-modal="true" aria-labelledby="content-update-title">
        <pre className={styles.message}>
          <span className={styles.accent}>+-- NEW CONTENT --------------------------------+</span>{'\n'}
          <span id="content-update-title">| {update.headline}</span>{'\n'}
          <span className={styles.accent}>+-- MISSIONS -----------------------------------+</span>{'\n'}
          {update.missions.map(mission => <span key={mission}>| &gt; {mission}{'\n'}</span>)}
          <span className={styles.accent}>+-- YOUR PROGRAM -------------------------------+</span>{'\n'}
          <span className={styles.muted}>| {update.impact}</span>{'\n'}
          <span className={styles.accent}>+------------------------------------------------+</span>
        </pre>
        <div className={styles.actions}>
          <button className={styles.action} type="button" onClick={() => dismiss('content update dismissed')}>Dismiss</button>
          {update.ctaScreen && (
            <button
              className={`${styles.action} ${styles.primary}`}
              type="button"
              onClick={() => {
                const destination = update.ctaScreen!
                dismiss('content update opened')
                onNavigate(destination)
              }}
            >
              {update.ctaLabel ?? 'Open'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
