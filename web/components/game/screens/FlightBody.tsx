'use client'

import { flightBodySpec, type FlightBodyInput } from '@/lib/flight-body'
import styles from './FlightScene.module.css'

/** Kit sprite for the body ahead: Earth on the trip home (Liam, 01.11), otherwise the asteroid. Kind stays on the element. */
export function FlightBody({ target, returning }: { target: FlightBodyInput; returning: boolean }) {
  const spec = flightBodySpec(target, returning)
  return (
    <img
      src={spec.kind === 'earth' ? '/game/assets/base/kit/earth-pixel.png' : '/game/assets/base/kit/asteroid-pixel.png'}
      alt=""
      draggable={false}
      className={styles.bodySprite}
      data-testid="transit-destination"
      data-body={spec.kind}
      data-palette={spec.kind === 'earth' ? 'earth' : spec.palette.id}
    />
  )
}
