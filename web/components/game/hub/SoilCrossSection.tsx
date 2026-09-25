'use client'

/**
 * Soil strata line + subsurface ore glow, sitting on the plateau's lower edge.
 * Ported from `landnam-earth-base-v2.html` (2026-07-26): a single dashed
 * hairline standing in for the cut-away ground plane, plus three pulsing
 * deposit blooms hinting at what's underneath.
 *
 * The deposit colors are the locked semantic mineral palette (iron rust,
 * silicon pale-blue, gold warm-white) — NOT the screen's UI accent, which is
 * cyan/mint only.
 */
export function SoilCrossSection() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Strata hairline — level with the plateau's bottom edge */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 'var(--hub-ground)', height: 0,
        borderTop: '1.5px dashed rgba(200,220,255,0.35)',
      }} />

      {/* Ore deposits — offset pulse cycles so they never breathe in unison */}
      <Ore left="20%" w={60} h={22} color="rgba(217,113,80,0.32)" delay="0s" />
      <Ore left="74%" w={54} h={20} color="rgba(185,216,255,0.3)" delay="1.6s" />
      <Ore left="48%" w={42} h={16} color="rgba(200,200,200,0.24)" delay="3s" />
    </div>
  )
}

function Ore({ left, w, h, color, delay }: { left: string; w: number; h: number; color: string; delay: string }) {
  return (
    <div
      className="hub-ore"
      style={{
        position: 'absolute', left, bottom: 'calc(var(--hub-ground) - 18px)',
        width: w, height: h, borderRadius: '50%',
        background: `radial-gradient(ellipse, ${color}, transparent 72%)`,
        filter: 'blur(1px)',
        animation: 'hub-ore-pulse 5s ease-in-out infinite',
        animationDelay: delay,
      }}
    />
  )
}
