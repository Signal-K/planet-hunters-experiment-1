'use client'

export default function TutorialHighlight({ borderRadius = 12 }: { borderRadius?: number }) {
  return (
    <div
      data-testid="tutorial-coach-highlight"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius,
        border: '2px solid #f5a623',
        pointerEvents: 'none',
        animation: 'coach-glow 1.4s ease-in-out infinite',
        zIndex: 2,
      }}
    />
  )
}
