import { describe, expect, it } from 'vitest'
import {
  SETTLEMENT_LAUNCHPAD,
  SURFACE_FERRY_DURATION_MS,
  SURFACE_STORAGE_CAPACITY,
  SURFACE_SITES,
} from '@/lib/data'
import { DEFAULT_STATE, normalizeState } from '@/lib/game-state'
import {
  normalizeSurfaceOps,
  applyAcknowledgeSurfaceFerry,
  applyBuildSettlementLaunchpad,
  applyDispatchSurfaceFerry,
  applyFailSurfaceFerry,
  applyPurchaseSiteAccess,
  applyReconcileSurfaceFerry,
  applyRecordSurfaceMined,
  applyRetrySurfaceFerry,
  applyStartFieldOperation,
  settlementLaunchpadStatus,
  surfaceCargoReady,
  surfaceSiteProgress,
  surfaceStorageTotal,
} from './SurfaceOpsSystem'

const SITE_ID = 'moon-south-pole'
const NOW = 10_000_000

function freeOpsState() {
  return {
    ...DEFAULT_STATE,
    screen: 'surface-ops' as const,
    tutorial: false,
    player: {
      ...DEFAULT_STATE.player,
      freeOperations: true,
      missionsDone: 4,
      francs: 30_000_000,
      stash: { aluminium: 20, silicon: 20 },
    },
  }
}

function readyLaunchpadState() {
  const buildStartedAt = NOW - SETTLEMENT_LAUNCHPAD.buildTimeMs
  let state = applyPurchaseSiteAccess(freeOpsState(), SITE_ID, buildStartedAt)
  state = applyBuildSettlementLaunchpad(state, SITE_ID, 1, buildStartedAt)
  return state
}

describe('Surface Ops site access', () => {
  it('prices solo site access on the current economy scale and only opens the Moon in v0', () => {
    expect(SURFACE_SITES.map(site => site.accessFee))
      .toEqual([4_000_000, 5_500_000, 7_500_000])
    expect(SURFACE_SITES.filter(site => site.availability === 'available').map(site => site.bodyId))
      .toEqual(['moon'])
  })

  it('purchases one solo access permit exactly once', () => {
    const initial = freeOpsState()
    const bought = applyPurchaseSiteAccess(initial, SITE_ID, NOW)
    const boughtAgain = applyPurchaseSiteAccess(bought, SITE_ID, NOW + 1)

    expect(bought.player.francs).toBe(initial.player.francs - 4_000_000)
    expect(surfaceSiteProgress(bought.player, SITE_ID).siteAccessPurchasedAt).toBe(NOW)
    expect(boughtAgain).toBe(bought)
  })

  it('rejects locked targets and players outside Free Operations', () => {
    const state = freeOpsState()
    expect(applyPurchaseSiteAccess(state, 'mars-arcadia', NOW)).toBe(state)
    const locked = { ...state, player: { ...state.player, freeOperations: false } }
    expect(applyPurchaseSiteAccess(locked, SITE_ID, NOW)).toBe(locked)
  })
})

describe('Settlement launchpad', () => {
  it('deducts the build cost and persists the selected target pad', () => {
    const access = applyPurchaseSiteAccess(freeOpsState(), SITE_ID, NOW)
    const built = applyBuildSettlementLaunchpad(access, SITE_ID, 2, NOW)
    const launchpad = surfaceSiteProgress(built.player, SITE_ID).launchpad

    expect(built.player.francs)
      .toBe(access.player.francs - SETTLEMENT_LAUNCHPAD.costFrancs)
    expect(built.player.stash).toEqual({ aluminium: 16, silicon: 14 })
    expect(launchpad).toEqual({
      pad: 2,
      startedAt: NOW,
      completesAt: NOW + SETTLEMENT_LAUNCHPAD.buildTimeMs,
    })
    expect(settlementLaunchpadStatus(built.player, SITE_ID, NOW)).toBe('building')
    expect(settlementLaunchpadStatus(
      built.player,
      SITE_ID,
      NOW + SETTLEMENT_LAUNCHPAD.buildTimeMs
    )).toBe('ready')
  })

  it('round-trips launchpad and site state through save normalization', () => {
    const state = readyLaunchpadState()
    const normalized = normalizeState(JSON.parse(JSON.stringify(state)))
    expect(normalized.player.surfaceOps).toEqual(state.player.surfaceOps)
  })

  it('migrates legacy terrain-rights saves to the solo site-access field', () => {
    const legacy = normalizeSurfaceOps({
      sites: {
        [SITE_ID]: {
          rightsPurchasedAt: NOW,
          storage: { iron: 2 },
        },
      },
    })
    expect(legacy.sites[SITE_ID]).toEqual({
      siteAccessPurchasedAt: NOW,
      storage: { iron: 2 },
    })
  })
})

describe('Field operation contract', () => {
  it('creates one stable Prospector operation only after site access', () => {
    const initial = freeOpsState()
    expect(applyStartFieldOperation(initial, SITE_ID, NOW)).toBe(initial)

    const accessed = applyPurchaseSiteAccess(initial, SITE_ID, NOW)
    const started = applyStartFieldOperation(accessed, SITE_ID, NOW + 1)
    const operation = surfaceSiteProgress(started.player, SITE_ID).fieldOperation
    const startedAgain = applyStartFieldOperation(started, SITE_ID, NOW + 2)

    expect(operation).toMatchObject({
      id: `surface-${SITE_ID}-${NOW}`,
      siteId: SITE_ID,
      bodyId: 'moon',
      label: expect.stringContaining('Prospector'),
      rover: { id: `prospector-${SITE_ID}`, chassis: 'chassis-lab', wheels: 'wheels-rocker' },
    })
    expect(startedAgain).toBe(started)
    expect(normalizeState(JSON.parse(JSON.stringify(started))).player.surfaceOps)
      .toEqual(started.player.surfaceOps)
  })
})

describe('Automated cargo ferry', () => {
  it('caps mining-station storage and creates cargo-ready state at capacity', () => {
    let state = readyLaunchpadState()
    state = applyRecordSurfaceMined(state, SITE_ID, 'iron', 12)
    state = applyRecordSurfaceMined(state, SITE_ID, 'silicon', 20)
    const site = surfaceSiteProgress(state.player, SITE_ID)

    expect(surfaceStorageTotal(site)).toBe(SURFACE_STORAGE_CAPACITY)
    expect(site.storage).toEqual({ iron: 12, silicon: 8 })
    expect(surfaceCargoReady(site)).toBe(true)
  })

  it('dispatches one stable manifest and blocks duplicate dispatches', () => {
    let state = readyLaunchpadState()
    state = applyRecordSurfaceMined(state, SITE_ID, 'iron', SURFACE_STORAGE_CAPACITY)
    const dispatched = applyDispatchSurfaceFerry(state, SITE_ID, NOW + 2_000, 'cargo-batch-1')
    const duplicate = applyDispatchSurfaceFerry(dispatched, SITE_ID, NOW + 3_000, 'cargo-batch-2')
    const site = surfaceSiteProgress(dispatched.player, SITE_ID)

    expect(site.storage).toEqual({})
    expect(site.ferry).toMatchObject({
      id: 'cargo-batch-1',
      status: 'in-flight',
      manifest: { iron: SURFACE_STORAGE_CAPACITY },
    })
    expect(duplicate).toBe(dispatched)
  })

  it('credits delivered cargo exactly once across repeated reconciliation', () => {
    let state = readyLaunchpadState()
    state = applyRecordSurfaceMined(state, SITE_ID, 'iron', SURFACE_STORAGE_CAPACITY)
    state = applyDispatchSurfaceFerry(state, SITE_ID, NOW, 'cargo-batch-1')
    const arrival = NOW + SURFACE_FERRY_DURATION_MS
    const delivered = applyReconcileSurfaceFerry(state, SITE_ID, arrival)
    const reconciledAgain = applyReconcileSurfaceFerry(delivered, SITE_ID, arrival + 1)

    expect(delivered.player.stash?.iron).toBe(SURFACE_STORAGE_CAPACITY)
    expect(delivered.player.francs).toBe(state.player.francs)
    expect(surfaceSiteProgress(delivered.player, SITE_ID).ferry).toMatchObject({
      status: 'delivered',
      reconciledAt: arrival,
    })
    expect(reconciledAgain).toBe(delivered)
    expect(applyAcknowledgeSurfaceFerry(delivered, SITE_ID).player.surfaceOps?.sites[SITE_ID].ferry)
      .toBeUndefined()
  })

  it('keeps a failed manifest recoverable without changing its batch id', () => {
    let state = readyLaunchpadState()
    state = applyRecordSurfaceMined(state, SITE_ID, 'iron', SURFACE_STORAGE_CAPACITY)
    state = applyDispatchSurfaceFerry(state, SITE_ID, NOW, 'cargo-batch-1')
    state = applyFailSurfaceFerry(state, SITE_ID, 'cargo-batch-1', 'telemetry')
    const retried = applyRetrySurfaceFerry(state, SITE_ID, NOW + 5_000)
    const ferry = surfaceSiteProgress(retried.player, SITE_ID).ferry

    expect(ferry).toMatchObject({
      id: 'cargo-batch-1',
      status: 'in-flight',
      attempts: 2,
      manifest: { iron: SURFACE_STORAGE_CAPACITY },
    })
  })
})
