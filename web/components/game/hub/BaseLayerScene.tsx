'use client'

import React, { useEffect, useState } from 'react'
import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'
import {
  biomeLayers,
  biomeGround,
  sanitizeEarthBiome,
  seasonForDate,
  worldTimeGrade,
  type EarthBiomeId,
  type Season,
  type WorldTimeGrade,
} from '@/lib/scene/base-world'
import { MeteorShowerWeather } from './MeteorShowerWeather'
import styles from './BaseLayerScene.module.css'

export function BaseLayerScene({
  phase = 'dusk',
  time,
  biome = 'mountains',
  season,
  siloBuilt = false,
  onOpenSilo,
}: {
  phase?: TimeOfDayPhase
  /** Six-step grade. When set, it wins over the coarse `phase`. */
  time?: WorldTimeGrade
  biome?: EarthBiomeId
  season?: Season
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
  const ground = biomeGround(landscape)

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
      <MeteorShowerWeather />
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
      <div className={styles.props} data-layer="props">
        <img src="/game/assets/base/kit/prop-tree-a.png" alt="" draggable={false} className={styles.prop} data-prop="tree-a" />
        <img src="/game/assets/base/kit/prop-tree-b.png" alt="" draggable={false} className={styles.prop} data-prop="tree-b" />
        <img src="/game/assets/base/kit/prop-rock.png" alt="" draggable={false} className={styles.prop} data-prop="rock" />
        <img src="/game/assets/base/kit/prop-tree-c.png" alt="" draggable={false} className={styles.prop} data-prop="tree-c" />
      </div>
      <div className={styles.ground} data-layer="ground">
        {ground && <img className={styles.biomeGround} src={ground} alt="" draggable={false} />}
        <div className={styles.verge} />
        <div className={styles.road} data-layer="road" />
      </div>
      {siloBuilt && (
        <div className={styles.shaftWrap} data-layer="cutaway" data-silo="built">
          <img src="/game/assets/base/kit/silo-cutaway.png" alt="" className={styles.shaftArt} data-layer="shaft" />
        </div>
      )}
      {siloBuilt && onOpenSilo && (
        <button type="button" className={styles.shaftButton} data-testid="base-lift-shaft" aria-label="Open silo" onClick={onOpenSilo} />
      )}
    </div>
  )
}
