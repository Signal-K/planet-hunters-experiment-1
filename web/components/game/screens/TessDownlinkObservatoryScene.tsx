'use client'

import styles from './TessDownlinkObservatoryScene.module.css'

interface TessDownlinkObservatorySceneProps {
  transitOnline: boolean
  deepSpaceOnline: boolean
  readyCount: number
}

/**
 * The Instrument Hub is the stationary receiving room for instruments already
 * in orbit. It intentionally has no Earth Base structures: reusing the Base
 * backdrop here made those structures appear to vanish for science work.
 */
export function TessDownlinkObservatoryScene({ transitOnline, deepSpaceOnline, readyCount }: TessDownlinkObservatorySceneProps) {
  const linkLabel = transitOnline ? 'TESS LINK' : deepSpaceOnline ? 'NEOCP LINK' : 'RECEIVER STANDBY'
  const sampleY = [102, 99, 103, 100, 102, 104, 100, 132, 161, 130, 102, 99, 104, 101, 103, 99, 102]
  const sampleX = [24, 68, 112, 156, 200, 244, 274, 294, 314, 334, 356, 400, 444, 488, 532, 576, 616]

  return (
    <div className={styles.scene} data-testid="tess-downlink-observatory-scene" aria-hidden="true">
      <div className={styles.ambientGlow} />
      <div className={styles.wall} />
      <div className={styles.viewport}>
        <div className={styles.starfield} />
        <div className={styles.star} />
        <div className={styles.orbit} />
        <div className={styles.satellite} />
        <svg className={styles.lightcurve} viewBox="0 0 640 220" preserveAspectRatio="none">
          <path className={styles.baseline} d="M24 106H616" />
          <path className={styles.trace} d="M24 102 L68 99 L112 103 L156 100 L200 102 L244 104 L274 100 L294 132 L314 161 L334 130 L356 102 L400 99 L444 104 L488 101 L532 103 L576 99 L616 102" />
          <g className={styles.samples}>{sampleX.map((x, index) => <circle key={x} cx={x} cy={sampleY[index]} r="4" />)}</g>
          <path className={styles.scanCursor} d="M156 28V192" />
        </svg>
        <div className={styles.viewportLabel}>TESS RAW CADENCE / FLUX SAMPLE</div>
      </div>
      <div className={styles.receiverArm}><span /></div>
      <div className={styles.receiverHead}><span className={styles.receiverLens} /><span className={styles.receiverLight} /></div>
      <div className={styles.packetTape}><span>SECTOR 74</span><span>CAM 02</span><span>CADENCE 120S</span><span>QUALITY FLAG 0</span><span>SECTOR 74</span><span>CAM 02</span><span>CADENCE 120S</span></div>
      <div className={styles.linkReadout}><span className={styles.linkDot} /><span>{linkLabel}</span><strong>{readyCount > 0 ? `${readyCount} READY` : 'SYNCED'}</strong></div>
    </div>
  )
}
