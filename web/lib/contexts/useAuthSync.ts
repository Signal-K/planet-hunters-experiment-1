import { useState, useEffect, useRef, useCallback } from 'react'
import type { RecordModel } from 'pocketbase'
import { pbShared } from '@/lib/pb'
import { pbLandnam, exchangeLandnamAuth } from '@/lib/pb-landnam'
import { ensureGuestAuth, hasStoredCredentials, isGuestAccount, upgradeGuestAccount } from '@/lib/guestAuth'
import { identifyUser } from '@/lib/posthog'
import { DEFAULT_STATE, mergeRemoteState, type PartialSave } from '@/lib/game-state'
import type { GameState } from '@/lib/game-types'
import type { Toast } from '@/components/ui/ToastLayer'

const UPGRADE_SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'
const UPGRADE_SNOOZE_MS = 24 * 60 * 60 * 1000

function responseStatus(err: unknown): number | null {
  if (typeof err === 'object' && err && 'status' in err && typeof err.status === 'number') return err.status
  return null
}

function authErrorMessage(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || !err) return fallback
  const data = 'data' in err ? err.data as unknown : null
  const fieldMessages: string[] = []

  if (typeof data === 'object' && data) {
    const message = 'message' in data && typeof data.message === 'string' ? data.message : null
    const fields = 'data' in data && typeof data.data === 'object' && data.data ? data.data : null
    if (fields) {
      Object.values(fields).forEach(value => {
        if (typeof value === 'object' && value && 'message' in value && typeof value.message === 'string') {
          fieldMessages.push(value.message)
        }
      })
    }
    if (fieldMessages.length > 0) return fieldMessages.join(' ')
    if (message && !/^failed$/i.test(message)) return message
  }

  if (err instanceof Error && err.message && !/^failed$/i.test(err.message)) return err.message
  const status = responseStatus(err)
  return status ? `${fallback} (${status})` : fallback
}

function storedSharedAuth(): { token?: string; record: RecordModel | null } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('pocketbase_auth')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { record?: RecordModel, model?: RecordModel }
    return { token: (parsed as { token?: string }).token, record: parsed.record ?? parsed.model ?? null }
  } catch {
    return null
  }
}

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

  // Pre-emptive warmup ping — Fly machines stop when idle. Firing this early
  // means the machine is live by the time auth + state-load requests arrive.
  useEffect(() => {
    if (isPreview) return
    pbLandnam.health.check().catch(() => {})
  }, [isPreview])
  const [backendReady, setBackendReady] = useState(false)
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false)
  const [awaitingRemoteState, setAwaitingRemoteState] = useState(false)
  const [authGateOpen, setAuthGateOpen] = useState(false)
  const [authGateError, setAuthGateError] = useState<string | null>(null)
  // Whether we've finished attempting (successfully or not) to exchange the
  // shared-backend session for a native Landnam auth token. game_states/
  // mission_log calls are gated on this so they don't race an unauthenticated
  // pbLandnam client — see the exchange effect below.
  const [landnamAuthAttempted, setLandnamAuthAttempted] = useState(false)
  // Whether the exchange has actually succeeded — distinct from
  // landnamAuthAttempted, which only means "the initial attempt is done,
  // one way or the other" (so the game_states effects can proceed with
  // their own offline-tolerant fallback). landnamSynced is what's actually
  // true: does this device have a working, mirrored Landnam identity right
  // now. Drives the background re-sync loop below and the UI's "not
  // synced" indicator.
  const [landnamSynced, setLandnamSynced] = useState(false)

  const backendRecordId = useRef<string | null>(null)
  const backendLoadedFor = useRef<string | null>(null)
  const landnamAuthAttemptedFor = useRef<string | null>(null)
  const landnamRetryDelay = useRef(60_000)
  const landnamRetryInFlight = useRef(false)
  const authGateDismissed = useRef(false)
  const lastPersistedMissionsDone = useRef<number | null>(null)
  const lastPersistedTutorial = useRef<boolean | null>(null)

  useEffect(() => {
    if (!hydrated || isPreview) return
    const stored = storedSharedAuth()
    if (!pbShared.authStore.record && stored?.token && stored.record) {
      pbShared.authStore.save(stored.token, stored.record)
    }
    const record = pbShared.authStore.record ?? stored?.record
    if (!record?.id) {
      pbLandnam.authStore.clear()
    }
    if (record?.id && record.id !== authUserId) {
      setAuthUserId(record.id)
    }
  }, [authUserId, hydrated, isPreview])

  const saveRemoteState = useCallback(async (userId: string, nextState: GameState) => {
    const payload = { user: userId, state: nextState, missions_done: nextState.player.missionsDone }
    if (backendRecordId.current) {
      await pbLandnam.collection('game_states').update(backendRecordId.current, payload)
      return
    }

    try {
      // Set the record's own id to the (deterministic, already-unique) userId
      // on first create, so a racing loser (two tabs/devices opening a
      // brand-new session at once) can recover without a getFirstListItem
      // lookup, which has its own race window on Fly (a just-committed row
      // can still 404 on immediate read).
      const record = await pbLandnam.collection('game_states').create({ id: userId, ...payload })
      backendRecordId.current = record.id
    } catch (createErr: unknown) {
      const status = responseStatus(createErr)
      if (status !== 400 && status !== 409) throw createErr
      // The unique-constraint loser isn't always a fresh concurrent create —
      // it can also be a pre-existing record from before this deterministic-
      // id scheme shipped, whose real id is NOT userId. Look it up rather
      // than assuming; a lookup miss here just means the winner's create
      // hasn't replicated yet, so rethrow and let the next periodic save
      // retry instead of writing to a record id that doesn't exist.
      const existing = await pbLandnam.collection('game_states').getFirstListItem(`user = "${userId}"`)
      backendRecordId.current = existing.id
      await pbLandnam.collection('game_states').update(existing.id, payload)
    }
  }, [])

  // Track auth identity changes
  useEffect(() => pbShared.authStore.onChange((_token, record) => {
    backendRecordId.current = null
    backendLoadedFor.current = null
    landnamAuthAttemptedFor.current = null
    landnamRetryDelay.current = 60_000
    setBackendReady(false)
    setLandnamAuthAttempted(false)
    setLandnamSynced(false)
    if (!record) pbLandnam.authStore.clear()
    setAuthUserId(record?.id ?? null)
    if (record?.id) identifyUser(record.id, record.email ? { email: record.email } : undefined)
  }), [])

  // Exchange the shared-backend session for a native Landnam auth token.
  // pbLandnam never otherwise sees the shared session (players authenticate
  // against pbShared, not pbLandnam), so without this exchange, requests to
  // Landnam's own PocketBase carry no @request.auth and ownership-gated
  // collections (game_states, mission_log) can't be used. Retries with
  // backoff to survive Fly cold starts; on exhausted retries we still mark
  // the attempt done so the game_states load/persist effects below proceed
  // and fall back to their own existing offline-tolerant handling (their
  // calls will simply fail authorization and be treated like any other
  // network/availability error). Unlike landnamAuthAttempted, landnamSynced
  // stays false on failure — the background re-sync effect below picks up
  // from there instead of giving up permanently for this session.
  useEffect(() => {
    if (isPreview || !authUserId) return
    if (landnamAuthAttemptedFor.current === authUserId) return
    if (!pbShared.authStore.isValid || !pbShared.authStore.token) return
    if (pbLandnam.authStore.isValid && pbLandnam.authStore.record?.id === authUserId) {
      landnamAuthAttemptedFor.current = authUserId
      setLandnamAuthAttempted(true)
      setLandnamSynced(true)
      return
    }

    let active = true
    const sharedToken = pbShared.authStore.token
    const delays = [1000, 3000, 5000]

    function finish(success: boolean) {
      if (!active) return
      landnamAuthAttemptedFor.current = authUserId
      setLandnamAuthAttempted(true)
      setLandnamSynced(success)
      if (!success) {
        addToast('Offline mode — progress saved on this device only', 'warn')
      }
    }

    function attempt(delayIndex: number) {
      exchangeLandnamAuth(sharedToken)
        .then(({ token, record }) => {
          if (!active) return
          pbLandnam.authStore.save(token, record)
          finish(true)
        })
        .catch(() => {
          if (!active) return
          if (delayIndex < delays.length) {
            setTimeout(() => attempt(delayIndex + 1), delays[delayIndex])
          } else {
            finish(false)
          }
        })
    }
    attempt(0)

    return () => { active = false }
  }, [addToast, authUserId, isPreview])

  // Background re-sync: the initial ladder above gives up after ~9s of
  // retries (covers a Fly cold start, not much more). Without this, a
  // slower cold start, a brief network blip, or the backend restarting
  // mid-session permanently strands the device in local-only mode for the
  // rest of the tab's life — there was previously no further attempt even
  // after the backend recovered (this is exactly how a stray
  // shared-backend guest account with no matching Landnam row happens).
  // Runs a slow backstop (starts at 60s, doubles up to a 10min cap on
  // repeated failure, resets on success) plus an immediate retry whenever
  // the tab regains focus.
  useEffect(() => {
    if (isPreview || !authUserId || landnamSynced) return
    if (!landnamAuthAttempted) return // let the initial ladder above finish first
    if (!pbShared.authStore.isValid || !pbShared.authStore.token) return

    let active = true
    let timer: ReturnType<typeof setTimeout> | null = null

    async function retry() {
      if (!active || landnamRetryInFlight.current) return
      landnamRetryInFlight.current = true
      try {
        const { token, record } = await exchangeLandnamAuth(pbShared.authStore.token!)
        if (!active) return
        pbLandnam.authStore.save(token, record)
        landnamRetryDelay.current = 60_000
        setLandnamSynced(true)
      } catch {
        if (!active) return
        landnamRetryDelay.current = Math.min(landnamRetryDelay.current * 2, 600_000)
        schedule()
      } finally {
        landnamRetryInFlight.current = false
      }
    }

    function schedule() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(retry, landnamRetryDelay.current)
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') retry()
    }

    schedule()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      active = false
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [authUserId, isPreview, landnamAuthAttempted, landnamSynced])

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

  // If background guest/session restoration succeeds after the gate was
  // opened, close it. This can happen on route bridges and fast local loads
  // where the "brand-new user" check wins the race by a render.
  useEffect(() => {
    if (authUserId) setAuthGateOpen(false)
  }, [authUserId])

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
    if (!hydrated || isPreview || !authUserId || !landnamAuthAttempted || backendLoadedFor.current === authUserId) return
    let active = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyRecord(record: any) {
      backendRecordId.current = record.id
      backendLoadedFor.current = authUserId!
      // Precedence rules (and why they exist) live in mergeRemoteState so they
      // can be unit-tested without PocketBase/React — see game-state.test.ts.
      // updatedAt (STS-635) reuses PocketBase's own `updated` autodate field
      // (set automatically on every write to this record) as the remote-side
      // tie-breaker signal, rather than adding a duplicate custom field —
      // record.updated is a string like "2026-07-31 12:00:00.000Z".
      const parsedUpdatedAt = typeof record.updated === 'string' ? new Date(record.updated).getTime() : NaN
      const remoteUpdatedAt = Number.isFinite(parsedUpdatedAt) ? parsedUpdatedAt : undefined
      const remoteState: PartialSave = { ...(record.state as PartialSave), updatedAt: remoteUpdatedAt }
      setState(current => mergeRemoteState(current, remoteState))
      setBackendReady(true)
    }

    function handleLoadFailure(err: unknown) {
      if (!active) return
      if (typeof err === 'object' && err && 'status' in err && (err as { status: number }).status === 404) {
        // Confirmed no record. If this device already has a local save, create
        // immediately instead of waiting for the debounced persist effect; the
        // first-sync path is the one most likely to be interrupted by route
        // redirects or test remounts.
        backendLoadedFor.current = authUserId!
        setBackendReady(true)
        if (localStorage.getItem(storageKey)) {
          saveRemoteState(authUserId!, stateRef.current).catch(() => {})
        }
        return
      }
      // Network / availability error (Fly cold-start, timeout, etc.)
      // Only unblock persisting if the device already has local state — otherwise we
      // risk overwriting a real backend record with a blank slate from a new device.
      const hasLocalState = !!localStorage.getItem(storageKey)
      if (hasLocalState) {
        backendLoadedFor.current = authUserId!
        setBackendReady(true)
      }
      // Devices with no local state remain in awaitingRemoteState so the user
      // sees a loading indicator rather than playing from empty state.
    }

    pbLandnam.collection('game_states')
      .getFirstListItem(`user = "${authUserId}"`)
      .then(record => { if (active) applyRecord(record) })
      .catch(error => {
        if (!active) return
        if (responseStatus(error) === 404) {
          handleLoadFailure(error)
          return
        }
        // Retry with escalating backoff — Fly cold-start can take 10-15s
        const delays = [4000, 12000, 25000]
        let attempt = 0
        function retry() {
          if (!active) return
          pbLandnam.collection('game_states')
            .getFirstListItem(`user = "${authUserId}"`)
            .then(record => { if (active) applyRecord(record) })
            .catch(err => {
              if (!active) return
              if (responseStatus(err) === 404) {
                handleLoadFailure(err)
                return
              }
              attempt++
              if (attempt < delays.length) {
                setTimeout(retry, delays[attempt])
              } else {
                handleLoadFailure(err)
              }
            })
        }
        setTimeout(retry, delays[0])
      })

    return () => { active = false }
  }, [authUserId, hydrated, isPreview, landnamAuthAttempted, setState, normalizeAndRepair, saveRemoteState, stateRef, storageKey])

  // Persist state to backend. Debounced 400ms for ordinary state churn, but
  // flushed immediately (0ms) whenever missionsDone or tutorial changes — an
  // onboarding-stage transition (M1/M2/M3 debrief) must not sit in the
  // debounce window, since a refresh in that window lets a stale remote
  // record regress the player back onto an earlier onboarding stage (see the
  // monotonic guard in applyRecord above, which is the second line of
  // defense if this flush is ever missed, e.g. offline at the exact moment).
  useEffect(() => {
    if (!hydrated || isPreview || !authUserId || !backendReady || backendLoadedFor.current !== authUserId) return
    const isProgressionTransition = lastPersistedMissionsDone.current !== null
      && (lastPersistedMissionsDone.current !== state.player.missionsDone || lastPersistedTutorial.current !== state.tutorial)
    const delay = isProgressionTransition ? 0 : 400
    const timer = window.setTimeout(async () => {
      try {
        await saveRemoteState(authUserId, state)
        lastPersistedMissionsDone.current = state.player.missionsDone
        lastPersistedTutorial.current = state.tutorial
      } catch {
        // Local storage remains the offline source of truth until the data link recovers.
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [authUserId, hydrated, isPreview, backendReady, state, saveRemoteState])

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
      const msg = authErrorMessage(e, 'Sign in failed')
      setAuthGateError(msg)
      throw new Error(msg)
    }
  }, [])

  const createAccountFromGate = useCallback(async (email: string, password: string) => {
    setAuthGateError(null)
    try {
      await pbShared.collection('users').create({ email, password, passwordConfirm: password, name: '' })
      const authResult = await pbShared.collection('users').authWithPassword(email, password)
      // Brand-new account: discard any local guest/dev state so the player
      // starts from scratch with the intro tutorial.
      localStorage.removeItem(storageKey)
      setState(DEFAULT_STATE)
      // Exchange for a native Landnam auth token before touching game_states —
      // ownership rules require @request.auth to be populated (see
      // pb-landnam.ts / landnam_auth.go), and this synchronous flow can't
      // wait for the background exchange effect to catch up.
      const { token, record: landnamRecord } = await exchangeLandnamAuth(pbShared.authStore.token)
      pbLandnam.authStore.save(token, landnamRecord)
      // Create the Landnam game_states record synchronously here, before the
      // gate closes — otherwise it only exists once the debounced persist
      // effect fires, and closing the tab before then leaves no record at all.
      await saveRemoteState(authResult.record.id, DEFAULT_STATE)
      backendLoadedFor.current = authResult.record.id
      landnamAuthAttemptedFor.current = authResult.record.id
      setLandnamAuthAttempted(true)
      setBackendReady(true)
      setAuthGateOpen(false)
    } catch (e) {
      const msg = authErrorMessage(e, 'Account creation failed')
      setAuthGateError(msg)
      throw new Error(msg)
    }
  }, [saveRemoteState, setState, storageKey])

  const skipAuthGate = useCallback(() => {
    authGateDismissed.current = true
    setAuthGateOpen(false)
    ensureGuestAuth().catch(() => {
      addToast('Offline mode — progress saved on this device only', 'warn')
      setAwaitingRemoteState(false)
    })
  }, [addToast])

  const resetGame = useCallback(async (defaultState: GameState) => {
    setState(defaultState)
    localStorage.removeItem(storageKey)

    // Stand the remote-sync machinery back down before touching the record.
    // backendReady / backendLoadedFor used to survive a reset, so the persist
    // effect below still considered itself live and re-wrote DEFAULT_STATE to
    // the backend on its next 400ms tick — racing, and usually beating, the
    // delete we're about to issue. The net effect was a "reset" that left a
    // full remote row behind carrying default state, which then re-hydrated
    // the next session instead of the account starting genuinely clean.
    setBackendReady(false)
    backendLoadedFor.current = null
    lastPersistedMissionsDone.current = null
    lastPersistedTutorial.current = null

    const recordId = backendRecordId.current
    backendRecordId.current = null
    if (!authUserId || !recordId) return

    try {
      await pbLandnam.collection('game_states').delete(recordId)
    } catch (err) {
      // Previously `.catch(() => {})`. A silently-swallowed failure here is
      // exactly how a reset appears to work while the server copy survives —
      // the player is told nothing and cannot tell local from remote state.
      if (responseStatus(err) !== 404) {
        addToast('Reset cleared this device, but your saved data on the server could not be deleted', 'warn')
      }
    }
  }, [addToast, authUserId, setState, storageKey])

  const signOut = useCallback(async () => {
    const signedOutUserId = authUserId
    const shouldFlush = signedOutUserId
      && backendReady
      && backendLoadedFor.current === signedOutUserId
      && !isPreview

    if (shouldFlush) {
      try {
        await saveRemoteState(signedOutUserId, stateRef.current)
      } catch {
        addToast('Could not sync latest progress before sign out', 'warn')
      }
    }

    pbShared.authStore.clear()
    pbLandnam.authStore.clear()
    localStorage.removeItem(storageKey)
    setState(DEFAULT_STATE)
    setAwaitingRemoteState(false)
    setUpgradePromptOpen(false)
    setAuthGateError(null)
    authGateDismissed.current = false
    if (!isPreview) setAuthGateOpen(true)
  }, [addToast, authUserId, backendReady, isPreview, saveRemoteState, setState, stateRef, storageKey])

  return {
    authUserId, backendReady,
    landnamSynced,
    upgradePromptOpen, dismissUpgradePrompt, upgradeAccount,
    awaitingRemoteState,
    authGateOpen, authGateError, signInFromGate, createAccountFromGate, skipAuthGate,
    resetGame, signOut,
  }
}
