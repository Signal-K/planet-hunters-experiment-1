'use client'

export default function TutorialHighlight({ borderRadius = 12 }: { borderRadius?: number }) {
  return (
    <div
      className="coach-glow-ring"
      data-testid="tutorial-coach-highlight"
      style={{ borderRadius, zIndex: 2 }}
    />
  )
}
