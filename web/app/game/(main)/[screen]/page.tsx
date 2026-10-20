import ScreenPageClient from './ScreenPageClient'
import { notFound } from 'next/navigation'
import { gameScreenParams, VALID_SCREENS } from '@/lib/game-screens'
import type { Screen } from '@/lib/game-types'

// Prebuild a loading shell for every gameplay route, including hub and
// mission-history. The Worker then serves that shell instead of server-rendering
// the game tree on each authenticated request (Cloudflare error 1102).
export function generateStaticParams() {
  return gameScreenParams()
}

// Keep fallback route generation enabled. OpenNext's Cloudflare adapter does
// not currently preserve Next's static `[screen]` entries when
// `dynamicParams` is false, which made every production game URL return 404.
// This server boundary is deliberately tiny, so generating a missing shell
// does not pull the game graph into the Worker request.
export const dynamicParams = true

export default async function ScreenPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params
  if (!VALID_SCREENS.has(screen as Screen)) notFound()

  return <ScreenPageClient params={params} />
}
