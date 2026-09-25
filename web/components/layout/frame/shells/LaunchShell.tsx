'use client'

import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'

/**
 * SSL-35 Launch layout. Every launch renders here, as its own frame, instead
 * of as an overlay on top of the mission-setup review step. The sequence
 * draws its own vehicle and destination readout, so the shell adds no chrome.
 */
export default function LaunchShell({ rocketName, rocketImageSrc, targetName, onComplete }: {
  rocketName: string
  rocketImageSrc?: string
  targetName: string
  onComplete: () => void
}) {
  return (
    <div className="game-screen" data-testid="launch-shell">
      <ErrorBoundary fallback={null} onError={onComplete}>
        <LaunchSequenceCanvas rocketName={rocketName} rocketImageSrc={rocketImageSrc} targetName={targetName} onComplete={onComplete} />
      </ErrorBoundary>
    </div>
  )
}
