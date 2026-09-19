'use client'

import { useEffect, useState } from 'react'
import type { Player } from '@/game-context'
import type { AsteroidCandidate, TessCandidate } from '@/lib/data'
import { fetchReviewableTessCandidates } from '@/lib/tess-subjects'
import { fetchReviewableAsteroidCandidates } from '@/lib/asteroid-subjects'
import {
  instrumentDigestDateKey,
  unresolvedDeepSpaceInstrumentDigest,
  unresolvedTransitInstrumentDigest,
} from '@/lib/systems/InstrumentFeedSystem'
import styles from './InstrumentHubScreen.module.css'

interface InstrumentHubScreenProps {
  player: Player
  onBack: () => void
  onOpenTess: () => void
  onOpenAsteroid: () => void
}

/**
 * Earth Base orbit interface (SSL-304). Lists every unresolved item in the
 * owned instruments' daily digests and opens the matching inspector. This is
 * an instrument feed, not client work, and involves no crew.
 */
export default function InstrumentHubScreen({ player, onBack, onOpenTess, onOpenAsteroid }: InstrumentHubScreenProps) {
  const [tess, setTess] = useState<TessCandidate[]>([])
  const [asteroids, setAsteroids] = useState<AsteroidCandidate[]>([])
  const [loading, setLoading] = useState(true)

  const transitOnline = !!player.transitSatelliteLaunchedAt
  const deepSpaceOnline = !!player.deepSpaceTelescopeBuilt

  useEffect(() => {
    let cancelled = false
    const today = instrumentDigestDateKey()
    const tessLoad = transitOnline
      ? fetchReviewableTessCandidates()
          .then(c => unresolvedTransitInstrumentDigest(c, player, today))
          .catch(() => [] as TessCandidate[])
      : Promise.resolve([] as TessCandidate[])
    const asteroidLoad = deepSpaceOnline
      ? fetchReviewableAsteroidCandidates()
          .then(c => unresolvedDeepSpaceInstrumentDigest(c, player, today))
          .catch(() => [] as AsteroidCandidate[])
      : Promise.resolve([] as AsteroidCandidate[])
    Promise.all([tessLoad, asteroidLoad]).then(([t, a]) => {
      if (cancelled) return
      setTess(t)
      setAsteroids(a)
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitOnline, deepSpaceOnline, player.tessClassifications, player.asteroidClassifications])

  const total = tess.length + asteroids.length

  return (
    <section className={`screen-scroll ${styles.root}`} data-testid="instrument-hub-screen">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Earth Base orbit</div>
            <h1>Instrument signals</h1>
            <p>
              {loading ? 'Checking downlink...' : total > 0 ? `${total} signal${total === 1 ? '' : 's'} waiting for review.` : 'No signals waiting. New data arrives with the next daily downlink.'}
            </p>
          </div>
          <button type="button" className={styles.back} onClick={onBack}>Back to base</button>
        </header>

        {!transitOnline && !deepSpaceOnline && (
          <p className={styles.empty} data-testid="instrument-hub-empty">
            No instruments in orbit yet. Launch a transit telescope or build a deep space telescope to receive signals.
          </p>
        )}

        {transitOnline && (
          <section className={styles.group} aria-labelledby="ih-tess">
            <h2 id="ih-tess">Transit telescope · TESS</h2>
            {tess.length === 0 && !loading && <p className={styles.none}>All TESS signals reviewed.</p>}
            <ul className={styles.list}>
              {tess.map(c => (
                <li key={c.id}>
                  <button type="button" className={styles.item} data-testid={`instrument-signal-tess-${c.id}`} onClick={onOpenTess}>
                    <span className={styles.itemMain}>
                      <span className={styles.itemTitle}>{c.host || c.ticId}</span>
                      <span className={styles.itemMeta}>{c.toi} · {c.sector} · S/N {c.signalToNoise}</span>
                    </span>
                    <span className={styles.cta}>Open inspector ›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {deepSpaceOnline && (
          <section className={styles.group} aria-labelledby="ih-neo">
            <h2 id="ih-neo">Deep space telescope · NEOCP</h2>
            {asteroids.length === 0 && !loading && <p className={styles.none}>All NEOCP signals reviewed.</p>}
            <ul className={styles.list}>
              {asteroids.map(c => (
                <li key={c.id}>
                  <button type="button" className={styles.item} data-testid={`instrument-signal-neocp-${c.id}`} onClick={onOpenAsteroid}>
                    <span className={styles.itemMain}>
                      <span className={styles.itemTitle}>{c.tempDesig}</span>
                      <span className={styles.itemMeta}>V {c.vMag} · {c.nObs} obs · {c.arcDays} d arc</span>
                    </span>
                    <span className={styles.cta}>Open inspector ›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </section>
  )
}
