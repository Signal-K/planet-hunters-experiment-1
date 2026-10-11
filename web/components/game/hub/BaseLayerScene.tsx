'use client'

import React, { useEffect, useState } from 'react'
import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'
import {
  biomeLayers,
  sanitizeEarthBiome,
  seasonForDate,
  worldTimeGrade,
  type EarthBiomeId,
  type Season,
  type WorldTimeGrade,
} from '@/lib/scene/base-world'
import styles from './BaseLayerScene.module.css'

export function BaseLayerScene({
  phase = 'dusk',
  time,
  biome = 'mountains',
  season,
  paths = [],
  siloBuilt = false,
  onOpenSilo,
}: {
  phase?: TimeOfDayPhase
  /** Six-step grade. When set, it wins over the coarse `phase`. */
  time?: WorldTimeGrade
  biome?: EarthBiomeId
  season?: Season
  /** Scene-x percentages (0-100) where a short path meets the road. */
  paths?: number[]
  siloBuilt?: boolean
  onOpenSilo?: () => void
}) {
  const [liveSeason, setLiveSeason] = useState<Season>(season ?? 'autumn')
  useEffect(() => {
    if (season) return
    setLiveSeason(seasonForDate(new Date()))
  }, [season])
  const shownSeason = season ?? liveSeason
  const shownTime = time ?? worldTimeGrade(phase)
  const landscape = sanitizeEarthBiome(biome)
  const layers = biomeLayers(landscape)

  return (
    <div
      className={styles.scene}
      data-testid="base-layer-scene"
      data-biome={landscape}
      data-season={shownSeason}
      data-time={shownTime}
      aria-hidden={onOpenSilo ? undefined : true}
    >
      <div className={styles.sky} data-layer="sky" />
      <div className={styles.luminary} data-layer="luminary" />
      <div className={styles.stars} data-layer="stars" />
      <div className={styles.clouds} data-layer="clouds">
        <span className={styles.cloud} style={{ top: '10%', animationDuration: '92s' }} />
        <span className={styles.cloud} style={{ top: '38%', width: '12%', animationDuration: '128s', animationDelay: '-40s' }} />
        <span className={styles.cloud} style={{ top: '4%', width: '14%', animationDuration: '110s', animationDelay: '-70s' }} />
      </div>
      <div className={styles.horizon} data-layer="horizon">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={styles.band}
            data-layer={layer.id}
            style={{ height: layer.height, zIndex: index + 1, animationDuration: `${layer.parallaxSeconds}s` }}
          >
            <img src={layer.src} alt="" draggable={false} />
            <img src={layer.src} alt="" draggable={false} />
          </div>
        ))}
      </div>
      <div className={styles.grade} data-layer="season" />
      <div className={styles.timeShade} data-layer="time" />
      <div className={styles.ground} data-layer="ground">
        <div className={styles.verge} />
        {paths.map(x => <span key={x} className={styles.path} data-layer="path" style={{ left: `${x}%` }} />)}
        <div className={styles.road} data-layer="road">
          <span className={styles.lane} />
        </div>
        <div className={styles.cutaway} data-layer="cutaway" data-silo={siloBuilt ? 'built' : 'shaft'}>
          <span className={`${styles.bay} ${styles.bayLeft}`}>{siloBuilt && <span className={styles.tank} />}</span>
          <span className={styles.shaft} data-layer="shaft">
            <span className={styles.lift} />
          </span>
          <span className={`${styles.bay} ${styles.bayRight}`}>
            {siloBuilt && <span className={styles.tank} />}
            <span className={styles.lamp} style={{ right: 6 }} />
          </span>
        </div>
      </div>
      {onOpenSilo && (
        <button type="button" className={styles.shaftButton} data-testid="base-lift-shaft" aria-label="Open silo" onClick={onOpenSilo} />
      )}
    </div>
  )
}
