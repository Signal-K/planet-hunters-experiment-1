'use client'

import dynamic from 'next/dynamic'

// Keep route synchronisation client-only with the main game shell. Importing
// useGame here would otherwise retain the catalog-heavy provider in the Worker
// render path even though the page itself renders no visible HTML.
const ScreenRouteClient = dynamic(() => import('./ScreenRouteClient'), { ssr: false })

export default function ScreenPageClient({ params }: { params: Promise<{ screen: string }> }) {
  return <ScreenRouteClient params={params} />
}
