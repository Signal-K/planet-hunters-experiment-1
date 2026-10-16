import { redirect } from 'next/navigation'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import StageClient from './StageClient'
import StageGallery from './StageGallery'

// Isolated stage (dev/staging only). `/game/stage?preset=KEY` mounts ONE screen
// from fixture state, with no Flight Plan, auth gate, tickers, sync or chrome,
// so a scene/mechanic can be checked on its own without playing the loop.
//   &patch={"francs":0}   shallow-merge into player after load
//   &chrome=1             also mount the shared nav bars
// With no preset it lists every fixture.
export default async function StagePage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  if (!isDevLauncherEnabled()) redirect('/game')
  const { preset } = await searchParams
  if (preset) return <StageClient />
  return <StageGallery />
}
