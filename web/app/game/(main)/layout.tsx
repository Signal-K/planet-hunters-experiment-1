'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

// This route is an SPA. Rendering its interactive scene tree on the Worker
// eagerly evaluates the game provider, the full catalog, and every screen's
// dependency graph for an HTML response that is immediately hydrated and
// replaced. On Workers that transient module graph can exceed the memory limit
// even when CPU time is low. Keep the boundary in a Client Component because
// Next only supports `ssr: false` there.
const GameLayoutClient = dynamic(() => import('./GameLayoutClient'), {
  ssr: false,
  loading: () => <main className="game-stage" aria-label="Loading Landnam game" />,
})

export default function GameLayout({ children }: { children: ReactNode }) {
  return <GameLayoutClient>{children}</GameLayoutClient>
}
