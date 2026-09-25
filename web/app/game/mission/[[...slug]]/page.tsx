import { notFound, redirect } from 'next/navigation'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { presetForMissionRoute } from '@/lib/devRoutes'
import { resolvePreset } from '@/lib/devPresets'
import { routeSegmentForScreen } from '@/lib/game-route'

export default async function MissionShortcutPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  if (!isDevLauncherEnabled()) redirect('/game')
  const { slug } = await params
  const preset = presetForMissionRoute(slug)
  if (!preset) redirect('/game/launcher')
  const resolved = resolvePreset(preset)
  if (!resolved) notFound()
  redirect(`/game/${routeSegmentForScreen(resolved.screen ?? 'hub')}?preset=${preset}`)
}
