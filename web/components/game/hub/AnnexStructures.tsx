'use client'

import { ANNEX_KINDS, ANNEX_SLOTS, aboveGround, displayX, units } from '@/lib/scene/base-site'
import styles from './AnnexStructures.module.css'

/** SSL-843: line-art ground telescope (observatory dome on a drum, the tube out of the slit), in the Base's kit look. */
export function GroundTelescopeArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 68" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {/* tube out of the slit, behind the dome edge */}
      <g transform="rotate(-38 26 26)">
        <rect x="24" y="8" width="7" height="24" rx="1" fill="var(--ln-world-hull-lit)" stroke="var(--ln-world-outline)" strokeWidth="1.6" />
        <rect x="23" y="7" width="9" height="4" rx="1" fill="var(--ln-world-trim-blue)" stroke="var(--ln-world-outline)" strokeWidth="1.4" />
      </g>
      {/* dome */}
      <path d="M7 36 A15 15 0 0 1 37 36 Z" fill="var(--ln-world-hull-lit)" stroke="var(--ln-world-outline)" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M21 21.2 L21 36 L26 36 L26 21.6" fill="var(--ln-world-outline)" />
      {/* drum */}
      <rect x="6" y="36" width="32" height="24" fill="var(--ln-world-hull-lit)" stroke="var(--ln-world-outline)" strokeWidth="1.8" />
      <rect x="6" y="40" width="32" height="4" fill="var(--ln-world-trim-blue)" stroke="var(--ln-world-outline)" strokeWidth="1.2" />
      <rect x="17" y="48" width="10" height="12" fill="var(--ln-world-outline)" />
      <rect x="9" y="48" width="5" height="4" fill="var(--ln-world-glass)" stroke="var(--ln-world-outline)" strokeWidth="1" />
      <rect x="30" y="48" width="5" height="4" fill="var(--ln-world-glass)" stroke="var(--ln-world-outline)" strokeWidth="1" />
      {/* footing */}
      <rect x="2" y="60" width="40" height="6" fill="var(--ln-world-hull-lit)" stroke="var(--ln-world-outline)" strokeWidth="1.8" />
    </svg>
  )
}

const ART: Record<string, (p: { className?: string }) => React.ReactElement> = {
  'ground-telescope': GroundTelescopeArt,
  'ground-telescope-2': GroundTelescopeArt,
}

export function AnnexArt({ kind, className }: { kind: string; className?: string }) {
  const Art = ART[kind]
  return Art ? <Art className={className} /> : null
}

interface AnnexStructuresProps {
  /** Annex kind standing on each slot, by slot plot. */
  standing: Map<number, string>
  onOpen: (kind: string) => void
  /** Hide the empty slot pads (first-run Base, subsurface). */
  quiet?: boolean
}

/**
 * The annex row: every slot is a small paved pad on the ground, like a tree spot in a garden. A slot shows the
 * structure standing on it, an empty pad, or (while a tray item is being placed) a pulsing Place marker.
 */
export function AnnexStructures({ standing, onOpen, quiet = false }: AnnexStructuresProps) {
  return (
    <>
      {ANNEX_SLOTS.map(raw => {
        const slot = { ...raw, x: displayX(raw.x) }
        const kind = standing.get(slot.plot)
        if (kind) {
          const size = ANNEX_KINDS[kind]
          return (
            <button
              key={slot.id}
              type="button"
              className={styles.structure}
              data-testid={`annex-${kind}`}
              data-annex-slot={slot.id}
              aria-label={size?.label ?? kind}
              onClick={() => onOpen(kind)}
              style={{ left: units(slot.x - (size?.body ?? 20) / 2), width: units(size?.body ?? 20), height: units(size?.height ?? 30), bottom: aboveGround(-1) }}
            >
              <AnnexArt kind={kind} className={styles.art} />
              <span className={styles.name}><span className="hub-building-name">{size?.short ?? kind}</span></span>
            </button>
          )
        }
        if (quiet) return null
        return (
          <span
            key={slot.id}
            className={styles.pad}
            data-testid={`annex-slot-${slot.id}`}
            aria-hidden="true"
            style={{ left: units(slot.x - slot.half), width: units(slot.half * 2), bottom: aboveGround(-2) }}
          />
        )
      })}
    </>
  )
}
