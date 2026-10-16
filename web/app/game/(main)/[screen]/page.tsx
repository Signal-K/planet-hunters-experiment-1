import ScreenPageClient from './ScreenPageClient'
import { gameScreenParams } from '@/lib/game-screens'

// Prebuild a loading shell for every gameplay route, including hub and
// mission-history. The Worker then serves that shell instead of server-rendering
// the game tree on each authenticated request (Cloudflare error 1102).
export function generateStaticParams() {
  return gameScreenParams()
}

// A name outside the screen list has no shell to render. Reject it here so the
// Worker does not SSR an unknown route.
export const dynamicParams = false

export default function ScreenPage({ params }: { params: Promise<{ screen: string }> }) {
  return <ScreenPageClient params={params} />
}
