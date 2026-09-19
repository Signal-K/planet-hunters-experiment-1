import { notFound, redirect } from 'next/navigation'
import { resolvePreset } from '@/lib/devPresets'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { canonicalGameRoute } from '@/lib/game-route'

// Local-only demo entry point — /game/demo/<preset> drops straight into a
// named mission-type state (see lib/devPresets.ts) instead of playing
// through onboarding.
//
// This redirects into the real canonical game route with ?preset=<key> (the
// same mechanism DevShortcuts already uses) rather than rendering GameApp
// directly. GameApp is a standalone tree outside the (main) route group
// with its own GameProvider; the moment its screen->URL sync effect fires
// (game-context.tsx's `router.push('/game/' + state.screen)`), Next
// navigates into (main)/[screen], unmounting that standalone GameProvider
// and mounting a fresh one that re-hydrates with no preset — silently
// dropping all preset state back to the real save/default. Landing directly
// on the (main) route sidesteps that remount entirely.
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
