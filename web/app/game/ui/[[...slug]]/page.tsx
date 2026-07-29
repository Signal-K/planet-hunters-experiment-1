import { notFound, redirect } from 'next/navigation'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { presetForUiRoute } from '@/lib/devRoutes'
import { resolvePreset } from '@/lib/devPresets'

export default async function UiShortcutPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  if (!isDevLauncherEnabled()) redirect('/game')
  const { slug } = await params
  const preset = presetForUiRoute(slug)
  if (!preset) redirect('/game/launcher')
  const resolved = resolvePreset(preset)
  if (!resolved) notFound()
  redirect(`/game/${resolved.screen ?? 'hub'}?preset=${preset}`)
}
