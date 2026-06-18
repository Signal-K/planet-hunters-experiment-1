import GameApp from '@/components/game/GameApp'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

export default function ShipCustomizerPage() {
  return (
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  )
}
