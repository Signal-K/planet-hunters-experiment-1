import { ORIONIDS_VARIANTS } from '@/lib/orionids/theme'
import styles from './OrionidsPlanetMark.module.css'

/** Pixel meteor on a planet found during the shower. The pulse stops when motion is reduced. */
export default function OrionidsPlanetMark({ name }: { name: string }) {
  return (
    <span className={styles.mark} data-testid="orionids-planet-mark">
      <img src={ORIONIDS_VARIANTS.blueprint.meteorIcon} alt="" width={28} height={28} />
      <span>{name}</span>
      <em>Orionids-found</em>
    </span>
  )
}
