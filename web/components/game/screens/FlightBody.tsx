'use client'

import { flightBodySpec, type FlightBodyInput } from '@/lib/flight-body'
import styles from './FlightScene.module.css'
import { useSpriteFailure } from '@/components/game/hub/useSpriteFailure'

/** Kit sprite for the body ahead: Earth on the trip home (Liam, 01.11), otherwise the asteroid. Kind stays on the element. */
export function FlightBody({ target, returning }: { target: FlightBodyInput; returning: boolean }) {
  const spec = flightBodySpec(target, returning)
  const src = spec.kind === 'earth' ? '/game/assets/base/kit/earth-pixel.png' : '/game/assets/base/kit/asteroid-pixel.png'
  const sprite = useSpriteFailure(src)
  if (sprite.failed) return (
    <svg className={styles.bodySprite} viewBox="0 0 48 48" role="img" aria-label={spec.kind === 'earth' ? 'Earth' : 'Destination'} data-testid="transit-destination" data-body={spec.kind} data-art-fallback={spec.kind}>
      {spec.kind === 'earth' ? <>
        <circle cx="24" cy="24" r="22" fill="var(--ln-blueprint-blue)" stroke="var(--ln-map-sun)" strokeWidth="2" />
        <path d="m12 10 9-5 3 7-6 6 4 6-7 3-5-8Zm16 8 10-4 6 9-6 7-5 10-7-8 5-7Z" fill="var(--ln-play)" />
        <path d="M14 5h20M15 43h18" stroke="var(--ln-map-sun)" strokeWidth="3" />
      </> : <>
        <path d="m9 10 17-6 15 12 3 17-13 11-20-5L3 25Z" fill="var(--ln-mineral-iron)" stroke="var(--ln-map-sun)" strokeWidth="2" />
        <circle cx="17" cy="19" r="5" fill="var(--ln-blueprint-ink)" /><circle cx="31" cy="31" r="6" fill="var(--ln-blueprint-ink)" />
      </>}
    </svg>
  )
  return (
    <img
      src={src}
      ref={sprite.image}
      onError={sprite.onError}
      alt=""
      draggable={false}
      className={styles.bodySprite}
      data-testid="transit-destination"
      data-body={spec.kind}
      data-palette={spec.kind === 'earth' ? 'earth' : spec.palette.id}
    />
  )
}
