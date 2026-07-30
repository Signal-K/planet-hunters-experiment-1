'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolvePreset } from '@/lib/devPresets'

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
    const screen = preset?.screen ?? savedScreen()
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
