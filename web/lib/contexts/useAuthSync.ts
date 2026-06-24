import { useState, useEffect, useRef, useCallback } from 'react'
import { pbShared } from '@/lib/pb'
import { pbLandnam } from '@/lib/pb-landnam'
import { ensureGuestAuth, hasStoredCredentials, isGuestAccount, upgradeGuestAccount } from '@/lib/guestAuth'
import { identifyUser } from '@/lib/posthog'
import type { GameState } from '@/lib/game-types'
import type { Toast } from '@/components/ui/ToastLayer'

const UPGRADE_SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'
const UPGRADE_SNOOZE_MS = 24 * 60 * 60 * 1000

interface AuthSyncOpts {
  state: GameState
  setState: React.Dispatch<React.SetStateAction<GameState>>
  stateRef: React.RefObject<GameState>
  hydrated: boolean
  isPreview: boolean
  addToast: (message: string, kind?: Toast['kind']) => void
  normalizeAndRepair: (partial: Partial<GameState>) => GameState
  storageKey: string
}

export function useAuthSync({
  state, setState, stateRef, hydrated, isPreview,
  addToast, normalizeAndRepair, storageKey,
}: AuthSyncOpts) {
  const [authUserId, setAuthUserId] = useState<string | null>(pbShared.authStore.record?.id ?? null)
  const [backendReady, setBackendReady] = useState(false)
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false)
  const [awaitingRemoteState, setAwaitingRemoteState] = useState(false)
  const [authGateOpen, setAuthGateOpen] = useState(false)
  const [authGateError, setAuthGateError] = useState<string | null>(null)

  const backendRecordId = useRef<string | null>(null)
  const backendLoadedFor = useRef<string | null>(null)
  const authGateDismissed = useRef(false)

  // Track auth identity changes
  useEffect(() => pbShared.authStore.onChange((_token, record) => {
    backendRecordId.current = null
    backendLoadedFor.current = null
    setBackendReady(false)
    setAuthUserId(record?.id ?? null)
    if (record?.id) identifyUser(record.id, record.email ? { email: record.email } : undefined)
  }), [])

  // Returning full-account user on a new device: no local state but an active
  // session can hydrate from the backend. Stored guest credentials should not
  // block local play while auth warms or falls back offline.
  useEffect(() => {
    if (!hydrated || isPreview) return
    const noLocalState = !localStorage.getItem(storageKey)
    if (noLocalState && pbShared.authStore.isValid) setAwaitingRemoteState(true)
  }, [hydrated, isPreview, storageKey])

  // Clear awaitingRemoteState once backend load completes
  useEffect(() => {
    if (backendReady) setAwaitingRemoteState(false)
  }, [backendReady])

  // Show auth gate for brand-new users (no stored credentials, no active session)
  useEffect(() => {
    if (!hydrated || isPreview) return
    if (authGateDismissed.current) return
    if (pbShared.authStore.isValid || hasStoredCredentials()) return
    setAuthGateOpen(true)
  }, [hydrated, isPreview])

  // Restore returning guest session
  useEffect(() => {
    if (isPreview) return
    if (pbShared.authStore.isValid) return
    if (!hasStoredCredentials()) return
    ensureGuestAuth().catch(() => {
      addToast('Offline mode — progress saved on this device only', 'warn')
      setAwaitingRemoteState(false)
    })
  }, [addToast, isPreview])

  // Show upgrade prompt after first mission done
  useEffect(() => {
    if (!hydrated || isPreview) return
    if (state.player.missionsDone < 1) return
    if (!isGuestAccount()) return
    const snoozeUntil = Number(localStorage.getItem(UPGRADE_SNOOZE_KEY) ?? 0)
    if (Date.now() < snoozeUntil) return
    setUpgradePromptOpen(true)
  }, [hydrated, isPreview, state.player.missionsDone, authUserId])

  // Load remote game state on auth
  useEffect(() => {
    if (!hydrated || isPreview || !authUserId || backendLoadedFor.current === authUserId) return
    let active = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyRecord(record: any) {
      backendRecordId.current = record.id
      backendLoadedFor.current = authUserId!
      setState(current => normalizeAndRepair({ ...current, ...(record.state as Partial<GameState>) }))
      setBackendReady(true)
    }

    pbLandnam.collection('game_states')
      .getFirstListItem(`user = "${authUserId}"`)
      .then(record => { if (active) applyRecord(record) })
      .catch(error => {
        if (!active) return
        if (typeof error === 'object' && error && 'status' in error && error.status === 404) {
          backendLoadedFor.current = authUserId!
          setBackendReady(true)
          return
        }
        // Retry once after 4s — Landnam backend may still be warming
        setTimeout(() => {
          if (!active) return
          pbLandnam.collection('game_states')
            .getFirstListItem(`user = "${authUserId}"`)
            .then(record => { if (active) applyRecord(record) })
            .catch(err => {
              if (!active) return
              if (typeof err === 'object' && err && 'status' in err && err.status === 404) {
                backendLoadedFor.current = authUserId!
                setBackendReady(true)
              }
            })
        }, 4000)
      })

    return () => { active = false }
  }, [authUserId, hydrated, isPreview, setState, normalizeAndRepair])

  // Persist state to backend (debounced 400ms)
  useEffect(() => {
    if (!hydrated || isPreview || !authUserId || !backendReady || backendLoadedFor.current !== authUserId) return
    const timer = window.setTimeout(async () => {
      const payload = { user: authUserId, state }
      try {
        if (backendRecordId.current) {
          await pbLandnam.collection('game_states').update(backendRecordId.current, payload)
        } else {
          const record = await pbLandnam.collection('game_states').create(payload)
          backendRecordId.current = record.id
        }
      } catch {
        // Local storage remains the offline source of truth until the data link recovers.
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [authUserId, hydrated, isPreview, backendReady, state])

  const dismissUpgradePrompt = useCallback(() => {
    localStorage.setItem(UPGRADE_SNOOZE_KEY, String(Date.now() + UPGRADE_SNOOZE_MS))
    setUpgradePromptOpen(false)
  }, [])

  const upgradeAccount = useCallback(async (email: string, password: string) => {
    const { emailChangeRequested } = await upgradeGuestAccount(email, password)
    localStorage.removeItem(UPGRADE_SNOOZE_KEY)
    setUpgradePromptOpen(false)
    addToast(
      emailChangeRequested
        ? 'Account saved — check your email to confirm your new address'
        : 'Account saved — your new password is active now',
      'ok',
    )
  }, [addToast])

  const signInFromGate = useCallback(async (email: string, password: string) => {
    setAuthGateError(null)
    try {
      await pbShared.collection('users').authWithPassword(email, password)
      setAuthGateOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign in failed'
      setAuthGateError(msg)
      throw new Error(msg)
    }
  }, [])

  const createAccountFromGate = useCallback(async (email: string, password: string) => {
    setAuthGateError(null)
    try {
      await pbShared.collection('users').create({ email, password, passwordConfirm: password, name: '' })
      await pbShared.collection('users').authWithPassword(email, password)
      setAuthGateOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Account creation failed'
      setAuthGateError(msg)
      throw new Error(msg)
    }
  }, [])

  const skipAuthGate = useCallback(() => {
    authGateDismissed.current = true
    setAuthGateOpen(false)
    ensureGuestAuth().catch(() => {
      addToast('Offline mode — progress saved on this device only', 'warn')
      setAwaitingRemoteState(false)
    })
  }, [addToast])

  const resetGame = useCallback((defaultState: GameState) => {
    setState(defaultState)
    localStorage.removeItem(storageKey)
    if (authUserId && backendRecordId.current) {
      pbLandnam.collection('game_states').delete(backendRecordId.current).catch(() => {})
      backendRecordId.current = null
    }
  }, [authUserId, setState, storageKey])

  return {
    authUserId, backendReady,
    upgradePromptOpen, dismissUpgradePrompt, upgradeAccount,
    awaitingRemoteState,
    authGateOpen, authGateError, signInFromGate, createAccountFromGate, skipAuthGate,
    resetGame,
  }
}
