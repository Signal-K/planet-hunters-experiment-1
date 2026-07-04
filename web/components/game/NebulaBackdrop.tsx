'use client'

// Warm/cool nebula-sky backdrop for the Observatory (TESS classification) screens.
// Mirrors the blob palette used in LightcurveCanvas's chart background so the
// panel content and the chart read as one continuous sky, per the Landnam.html
// Observatory design (drawSky).
export default function NebulaBackdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: [
          'radial-gradient(80% 60% at 26% 13%, rgba(90,58,138,0.30), transparent 70%)',
          'radial-gradient(60% 55% at 86% 40%, rgba(20,84,95,0.22), transparent 70%)',
          'radial-gradient(42% 40% at 14% 70%, rgba(122,42,68,0.16), transparent 70%)',
          'radial-gradient(95% 55% at 52% 100%, rgba(154,82,16,0.30), transparent 70%)',
        ].join(', '),
      }}
    />
  )
}
