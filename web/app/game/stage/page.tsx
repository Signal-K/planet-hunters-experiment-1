import { redirect } from 'next/navigation'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import StageClient from './StageClient'
import StageGallery from './StageGallery'

// Isolated stage (dev/staging only). `/game/stage?preset=KEY` mounts ONE screen
// from fixture state, with no Flight Plan, auth gate, tickers, sync or chrome,
// so a scene/mechanic can be checked on its own without playing the loop.
//   preset=sandbox:<entry>[:<base64url setup>] strips campaign context and layers a setup over a fixture.
//   &hud=1 and &shower=1 opt back into sandbox-hidden chrome or the Orionids event.
//   &time, &season, &sky, &menu, &building, &launchscene and &click are scene switches used by Things.
// With no preset it lists every fixture.
export default async function StagePage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  if (!isDevLauncherEnabled()) redirect('/game')
  const { preset } = await searchParams
  if (preset) return <StageClient />
  return <StageGallery />
}
