import { notFound, redirect } from 'next/navigation'
import { resolvePreset } from '@/lib/devPresets'

// Local-only demo entry point — /game/demo/<preset> drops straight into a
// named mission-type state (see lib/devPresets.ts) instead of playing
// through onboarding.
//
// This redirects into the real /game/<screen>?preset=<key> route (the same
// mechanism DevShortcuts already uses) rather than rendering GameApp
// directly. GameApp is a standalone tree outside the (main) route group
// with its own GameProvider; the moment its screen->URL sync effect fires
// (game-context.tsx's `router.push('/game/' + state.screen)`), Next
// navigates into (main)/[screen], unmounting that standalone GameProvider
// and mounting a fresh one that re-hydrates with no preset — silently
// dropping all preset state back to the real save/default. Landing directly
// on the (main) route sidesteps that remount entirely.
export default async function DemoPresetPage({ params }: { params: Promise<{ preset: string }> }) {
  if (process.env.NODE_ENV !== 'development') redirect('/game')
  const { preset } = await params
  const resolved = resolvePreset(preset)
  if (!resolved) notFound()
  redirect(`/game/${resolved.screen ?? 'hub'}?preset=${preset}`)
}
