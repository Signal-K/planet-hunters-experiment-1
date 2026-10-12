'use client'

import { flightBodySpec, type FlightBodyInput } from '@/lib/flight-body'
import styles from './FlightScene.module.css'

/** Native asteroid sprite. Kind stays on the element for the flight-body spec. */
export function FlightBody({ target, returning }: { target: FlightBodyInput; returning: boolean }) {
  const spec = flightBodySpec(target, returning)
  return (
    <img
      src="/game/assets/base/kit/asteroid-pixel.png"
      alt=""
      draggable={false}
      className={styles.bodySprite}
      data-testid="transit-destination"
      data-body={spec.kind}
      data-palette={spec.kind === 'earth' ? 'earth' : spec.palette.id}
    />
  )
}
