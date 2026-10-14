'use client'

import { aboveGround, units, type BaseSite } from '@/lib/scene/base-site'
import styles from './SiteMarker.module.css'

/**
 * Where a structure will stand, marked on the ground at its real footprint (SSL-423 site map).
 * A fresh base shows exactly one of these, on the pad site, so the first build has an obvious place.
 */
export function SiteMarker({ site, label, onPlace, disabled = false }: { site: BaseSite; label: string; onPlace: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={styles.marker}
      data-testid={site.plot != null ? `build-plot-${site.plot}` : `build-site-${site.id}`}
      data-beacon={site.plot != null ? `build-plot-${site.plot}` : undefined}
      data-site={site.id}
      aria-label={`Place ${label} here`}
      disabled={disabled}
      onClick={onPlace}
      style={{ left: units(site.x - site.half), width: units(site.half * 2), bottom: aboveGround(-2) }}
    >
      <span className={styles.footprint} aria-hidden="true" />
      <span className={styles.label}>
        <span className={styles.plus} aria-hidden="true">+</span>
        Place {label}
      </span>
    </button>
  )
}
