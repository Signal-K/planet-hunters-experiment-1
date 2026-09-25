import { notFound, redirect } from 'next/navigation'
import { resolvePreset } from '@/lib/devPresets'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { canonicalGameRoute } from '@/lib/game-route'

// Local-only demo entry point — /game/demo/<preset> drops straight into a
// named mission-type state (see lib/devPresets.ts) instead of playing
// through onboarding.
//
// This redirects into the real canonical game route with ?preset=<key> (the
// same mechanism DevShortcuts already uses), so the preset is applied by the
// one live (main) shell. Rendering a separate GameProvider here would be
// unmounted by its own screen->URL sync the moment it navigated into
// (main)/[screen], silently dropping the preset state.
export default async function DemoPresetPage({ params }: { params: Promise<{ preset: string }> }) {
  if (!isDevLauncherEnabled()) redirect('/game')
  const { preset } = await params
  const resolved = resolvePreset(preset)
  if (!resolved) notFound()
  const route = canonicalGameRoute({
    screen: resolved.screen ?? 'hub',
    missionId: resolved.missionId ?? null,
    targetId: resolved.targetId ?? null,
  })
  redirect(`/game/${route}?preset=${preset}`)
}
