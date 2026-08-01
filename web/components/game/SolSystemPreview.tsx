'use client'

import PixiGalaxyMap from '@/components/TargetPicker/PixiGalaxyMap'
import type { Mission } from '@/lib/data'

/**
 * SolSystemPreview — the "our own solar system" destination from the
 * satellite-pointing galaxy map (PixiGalaxyStarMap's Sol marker). Renders
 * the REAL solar-system map component (the same one TargetPickerScreen uses
 * for mining-mission target selection) — not a lookalike reimplementation —
 * with zero targets, since satellite investigation of in-system objects
 * isn't available yet.
 *
 * See the design decision:
 * ~/Navigation/workspace/projects/landnam/docs/satellite-infrastructure-levels-solar-system-investigation.md
 * — a future satellite-infrastructure level unlocks this (asteroid discovery
 * via the Daily Minor Planet Project).
 */

// Placeholder Mission satisfying PixiGalaxyMap's required shape (it only
// reads requires.max_orbit) — no real mission exists for this preview.
const EMPTY_SOL_MISSION: Mission = {
  id: 'satellite-sol-preview',
  title: 'Satellite Preview',
  brief: '',
  client: '',
  tag: 'PREVIEW',
  difficulty: 'L1',
  locked: false,
  sequence: 0,
  requires: { minerals: {}, cargo_min: 0, drill_tier: 0, max_orbit: 8 },
  payout: { francs: 0, affinity: 0 },
}

export default function SolSystemPreview({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <PixiGalaxyMap
        mission={EMPTY_SOL_MISSION}
        targets={[]}
        compatibleIds={new Set()}
        pickedId=""
        onPick={() => {}}
      />
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 8, left: 8, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 11px 5px 8px',
          background: 'rgba(20,20,23,0.88)',
          border: '1px solid rgba(112,217,234,0.3)',
          borderRadius: 8,
          cursor: 'pointer',
          fontFamily: 'var(--ln-font-mono), ui-monospace, monospace',
          fontSize: 10,
          fontWeight: 700,
          color: '#87cffa',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        <span style={{ fontSize: 12 }}>‹</span> Star Map
      </button>
      <div style={{
        position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 10,
        background: 'rgba(12,12,13,0.92)',
        border: '1px solid rgba(245,166,35,0.3)',
        borderRadius: 10,
        padding: '8px 12px',
        fontFamily: 'var(--ln-font-body), system-ui, sans-serif',
        fontSize: 11,
        color: '#f5a623',
        lineHeight: 1.35,
      }}>
        <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>No targets here yet</span>
        <br />
        <span style={{ color: '#a9b8ce' }}>A future satellite upgrade will let you scan objects in our own system — asteroid discovery via the real Daily Minor Planet Project.</span>
      </div>
    </div>
  )
}
