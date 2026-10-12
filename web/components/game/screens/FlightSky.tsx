'use client'

import styles from './FlightScene.module.css'

const KIT = '/game/assets/base/kit'

/** Native flight sky: stretched space bands plus the three star tiles. */
export function FlightSky() {
  return (
    <div className={styles.sky} aria-hidden="true">
      <img src={`${KIT}/space-bands.png`} alt="" draggable={false} className={styles.bands} />
      <div className={styles.starTile} data-layer="stars-far" data-speed="far" />
      <div className={styles.starTile} data-layer="stars-mid" data-speed="mid" />
      <div className={styles.starTile} data-layer="stars-near" data-speed="near" />
    </div>
  )
}
