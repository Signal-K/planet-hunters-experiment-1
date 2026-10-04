import { redirect } from 'next/navigation'
import GameApp from '@/components/game/GameApp'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

export default function ShipCustomizerPage() {
  if (process.env.NODE_ENV !== 'development') redirect('/game')
  return (
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  )
}
