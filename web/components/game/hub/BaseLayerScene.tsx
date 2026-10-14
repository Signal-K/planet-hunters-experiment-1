'use client'

import React, { useEffect, useState } from 'react'
import type { TimeOfDayPhase } from '@/lib/hooks/useTimeOfDay'
import {
  sanitizeEarthBiome,
  seasonForDate,
  worldTimeGrade,
  type EarthBiomeId,
  type Season,
  type WorldTimeGrade,
} from '@/lib/scene/base-world'
import { ASSET_ROOT, BASE_SITE, aboveGround, backdropFor, groundRuns, propsFor, siteById, skyGrade, STRIP_W, units } from '@/lib/scene/base-site'
import { MeteorShowerWeather } from './MeteorShowerWeather'
import styles from './BaseLayerScene.module.css'

/**
 * Base world layers from the shared site map (SSL-423): sky grade with sun or moon, stars and drifting clouds,
 * two parallax backdrop bands, ground runs and natural props. Everything is laid out in kit units on the
 * 520-unit strip, so it lines up with the structures and sites drawn on the same strip.
 * A fresh base has no structures: no apron, no buildings, only land.
 */
export function BaseLayerScene({
  phase = 'dusk',
  time,
  biome = 'mountains',
  season,
  placed = [],
  panX = 0,
  zoom = 1,
  siloBuilt = false,
  onOpenSilo,
}: {
  phase?: TimeOfDayPhase
  /** Six-step grade. When set, it wins over the coarse `phase`. */
  time?: WorldTimeGrade
  biome?: EarthBiomeId
  season?: Season
  /** Built structures: the apron under the pad only exists once the launchpad is built. */
  placed?: readonly string[]
  /** Camera offset in screen px, for the backdrop parallax. */
  panX?: number
  zoom?: number
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
  const sky = skyGrade(shownTime)
  const bands = backdropFor(landscape)
  const runs = groundRuns(landscape, placed)
  const props = propsFor(landscape)
  const shaft = siteById('shaft')
  const tile = BASE_SITE.ground.tileWidth
  const bandTile = BASE_SITE.backdrop.tileWidth
  // A layer with parallax p moves p times as far as the ground: undo (1 - p) of the camera pan.
  const parallax = (p: number) => `translateX(${(-panX * (1 - p)) / Math.max(zoom, 0.01)}px)`

  return (
    <div
      className={styles.scene}
      data-testid="base-layer-scene"
      data-biome={landscape}
      data-season={shownSeason}
      data-time={shownTime}
      data-strip={STRIP_W}
      aria-hidden={onOpenSilo ? undefined : true}
      style={{
        '--sky-top': sky.top,
        '--sky-mid': sky.mid,
        '--sky-horizon': sky.horizon,
      } as React.CSSProperties}
    >
      <div className={styles.sky} data-layer="sky" />
      <div className={styles.skyFixed} style={{ transform: parallax(0.02) }}>
        <div className={styles.starsWrap} style={{ opacity: sky.stars }}>
          <div className={styles.stars} data-layer="stars" />
        </div>
        <div
          className={styles.luminary}
          data-layer="luminary"
          data-luminary={sky.luminary.kind}
          style={{ left: `${sky.luminary.x * 100}%`, top: `calc(${sky.luminary.y} * (100% - var(--hub-ground)))` }}
        />
        <div className={styles.clouds} data-layer="clouds" style={{ opacity: sky.clouds }}>
          {BASE_SITE.sky.clouds.map((cloud, i) => (
            <img
              key={cloud.src}
              src={`${ASSET_ROOT}${cloud.src}`}
              alt=""
              draggable={false}
              className={styles.cloud}
              data-cloud={i}
              style={{
                left: units(cloud.x),
                top: `calc(${cloud.y} * (100% - var(--hub-ground)))`,
                width: units(cloud.width),
                animationDuration: `${cloud.seconds}s`,
                animationDelay: `-${(cloud.seconds * (i + 1)) / 4}s`,
              }}
            />
          ))}
        </div>
      </div>
      <MeteorShowerWeather />
      <div className={styles.horizon} data-layer="horizon">
        {bands.map((band, index) => (
          <div
            key={band.id}
            className={styles.band}
            data-layer={`band-${band.id}`}
            style={{
              bottom: aboveGround(BASE_SITE.backdrop.lift - 2 * index),
              height: units(band.height),
              zIndex: index + 1,
              backgroundImage: `url(${ASSET_ROOT}${band.src})`,
              backgroundSize: `${units(bandTile)} 100%`,
              transform: parallax(band.parallax),
            }}
          />
        ))}
      </div>
      <div className={styles.ground} data-layer="ground">
        {runs.map(run => (
          <div
            key={`${run.style}-${run.from}`}
            className={styles.groundRun}
            data-ground={run.style}
            style={{
              left: units(run.from),
              width: units(run.to - run.from),
              bottom: `calc(var(--hub-ground) - ${run.below} * var(--px, 3px))`,
              height: units(run.above + run.below),
              backgroundImage: `url(${ASSET_ROOT}${run.src})`,
              backgroundSize: `${units(tile)} 100%`,
              // Tiles line up across runs, so the apron reads as paving laid into one continuous ground.
              backgroundPosition: `calc(${-run.from} * var(--px, 3px)) 0`,
            }}
          />
        ))}
        <div className={styles.groundDeep} style={{ height: `calc(var(--hub-ground) - ${runs[0]?.below ?? 38} * var(--px, 3px) + 1px)`, background: runs[0]?.deep }} />
      </div>
      <div className={styles.props} data-layer="props">
        {props.map(prop => (
          <img
            key={`${prop.sprite}-${prop.x}`}
            src={`${ASSET_ROOT}${prop.src}`}
            alt=""
            draggable={false}
            className={styles.prop}
            data-prop={prop.sprite}
            style={{ left: units(prop.x - prop.width / 2), width: units(prop.width), bottom: aboveGround(prop.foot) }}
          />
        ))}
      </div>
      {siloBuilt && (
        <div className={styles.shaftWrap} data-layer="cutaway" data-silo="built" style={{ left: units(shaft.x) }}>
          <img src="/game/assets/base/kit/silo-cutaway.png" alt="" className={styles.shaftArt} data-layer="shaft" />
        </div>
      )}
      {siloBuilt && onOpenSilo && (
        <button type="button" className={styles.shaftButton} style={{ left: units(shaft.x) }} data-testid="base-lift-shaft" aria-label="Open silo" onClick={onOpenSilo} />
      )}
    </div>
  )
}

/** Time-of-day shade laid over the whole world, structures included, so night darkens everything evenly. */
export function BaseTimeShade({ time }: { time: WorldTimeGrade }) {
  const sky = skyGrade(time)
  return <div className={styles.timeShade} data-layer="time" data-time={time} style={{ opacity: sky.shade, background: sky.top }} aria-hidden="true" />
}
