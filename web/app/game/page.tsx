'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolvePreset } from '@/lib/devPresets'
import { pbShared } from '@/lib/pb'
import { hasStoredCredentials } from '@/lib/guestAuth'

const STORAGE_KEY = 'landnam-game-state-v1'
const VALID_SCREENS = new Set([
  'intro',
  'build',
  'hub',
  'missions',
  'galaxy',
  'targets',
  'fab',
  'transit',
  'mining',
  'delivery',
  'debrief',
  'refinery',
  'market',
  'hangar',
  'rocket-buy',
  'skills',
  'scan-station',
  'rover-mining',
  'launchpad',
  'surface-ops',
  'academy',
])

function savedScreen(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'intro'
    const parsed = JSON.parse(raw) as { screen?: unknown }
    return typeof parsed.screen === 'string' && VALID_SCREENS.has(parsed.screen)
      ? parsed.screen
      : 'intro'
  } catch {
    return 'intro'
  }
}

function GameRouteBridge() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const presetName = searchParams.get('preset')
    const preset = presetName ? resolvePreset(presetName) : null
    // A saved deep screen (e.g. 'missions') only means something once this
    // device has actually authenticated (signed in, signed up, or completed
    // guest auth) — otherwise the auth gate is about to open, and resuming
    // straight into gameplay would sit the URL behind it. See STS-624.
    const canResume = pbShared.authStore.isValid || hasStoredCredentials()
    const screen = preset?.screen ?? (canResume ? savedScreen() : 'intro')
    const query = presetName ? `?preset=${encodeURIComponent(presetName)}` : ''
    router.replace(`/game/${screen}${query}`)
  }, [router, searchParams])

  return null
}

export default function GamePage() {
  return (
    <Suspense fallback={null}>
      <GameRouteBridge />
    </Suspense>
  )
}
