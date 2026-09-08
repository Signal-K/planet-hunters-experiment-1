'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolvePreset } from '@/lib/devPresets'
import { pbShared } from '@/lib/pb'
import { hasStoredCredentials } from '@/lib/accountAuth'
import { returningScreen } from '@/lib/initial-route'
import { GAME_STATE_STORAGE_KEY, gameStateStorageKey } from '@/lib/game-state-storage'

const STORAGE_KEY = GAME_STATE_STORAGE_KEY

function savedScreen(): string {
  try {
    const raw = window.localStorage.getItem(gameStateStorageKey(STORAGE_KEY, pbShared.authStore.record?.id))
    return returningScreen(raw)
  } catch {
    return 'hub'
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
