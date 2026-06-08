import GameApp from '@/components/game/GameApp'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

export default function GamePage() {
  return (
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  )
}
