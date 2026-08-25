import {
  SETTLEMENT_LAUNCHPAD,
  SURFACE_FERRY_DURATION_MS,
  SURFACE_STORAGE_CAPACITY,
  surfaceSiteById,
} from '@/lib/data'
import type {
  FieldOperation,
  GameState,
  Player,
  SettlementFerryRecord,
  SettlementLaunchpadRecord,
  SurfaceOpsState,
  SurfaceSiteProgress,
} from '@/lib/game-types'
import type { RoverSpec } from '@takeon/engine'

export type SettlementLaunchpadStatus =
  | 'unavailable'
  | 'locked'
  | 'building'
  | 'ready'

const EMPTY_SITE: SurfaceSiteProgress = { storage: {} }

function stableSeed(siteId: string): number {
  let hash = 2166136261
  for (const char of siteId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

function cleanFieldOperation(value: unknown, siteId: string): FieldOperation | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const operation = value as Partial<FieldOperation>
  if (
    typeof operation.id !== 'string'
    || typeof operation.bodyId !== 'string'
    || typeof operation.seed !== 'number'
    || !Number.isFinite(operation.seed)
    || !operation.rover
    || typeof operation.rover !== 'object'
    || typeof operation.startedAt !== 'number'
    || !Number.isFinite(operation.startedAt)
  ) return undefined
  return {
    id: operation.id,
    missionId: typeof operation.missionId === 'string' ? operation.missionId : operation.id,
    targetId: typeof operation.targetId === 'string' ? operation.targetId : siteId,
    siteId,
    bodyId: operation.bodyId,
    seed: operation.seed,
    rover: operation.rover,
    label: typeof operation.label === 'string' ? operation.label : 'Surface operation',
    cargo: operation.cargo && typeof operation.cargo === 'object'
      ? operation.cargo
      : { requirements: {}, capacity: 0 },
    objective: operation.objective && typeof operation.objective === 'object'
      ? operation.objective
      : { kind: 'prospecting', description: 'Operate the surface site.' },
    returnPolicy: operation.returnPolicy && typeof operation.returnPolicy === 'object'
      ? operation.returnPolicy
      : { owner: 'landnam', reconcileAt: 'field-return' },
    startedAt: Math.max(0, operation.startedAt),
  }
}

function cleanManifest(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, number] =>
        typeof entry[0] === 'string'
        && typeof entry[1] === 'number'
        && Number.isFinite(entry[1])
        && entry[1] > 0
      )
      .map(([id, amount]) => [id, Math.floor(amount)])
  )
}

function cleanLaunchpad(value: unknown): SettlementLaunchpadRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Partial<SettlementLaunchpadRecord>
  const pad = record.pad === 1 || record.pad === 2 ? record.pad : 0
  if (!Number.isFinite(record.startedAt) || !Number.isFinite(record.completesAt)) {
    return undefined
  }
  return {
    pad,
    startedAt: Math.max(0, record.startedAt ?? 0),
    completesAt: Math.max(record.startedAt ?? 0, record.completesAt ?? 0),
  }
}

function cleanFerry(value: unknown): SettlementFerryRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Partial<SettlementFerryRecord>
  if (
    typeof record.id !== 'string'
    || !['in-flight', 'delivered', 'failed'].includes(record.status ?? '')
    || !Number.isFinite(record.dispatchedAt)
    || !Number.isFinite(record.arrivesAt)
  ) {
    return undefined
  }
  return {
    id: record.id,
    status: record.status as SettlementFerryRecord['status'],
    manifest: cleanManifest(record.manifest),
    dispatchedAt: Math.max(0, record.dispatchedAt ?? 0),
    arrivesAt: Math.max(record.dispatchedAt ?? 0, record.arrivesAt ?? 0),
    attempts: Math.max(1, Math.floor(record.attempts ?? 1)),
    ...(Number.isFinite(record.deliveredAt)
      ? { deliveredAt: Math.max(0, record.deliveredAt ?? 0) }
      : {}),
    ...(Number.isFinite(record.reconciledAt)
      ? { reconciledAt: Math.max(0, record.reconciledAt ?? 0) }
      : {}),
    ...(typeof record.failureReason === 'string'
      ? { failureReason: record.failureReason }
      : {}),
  }
}

export function normalizeSurfaceOps(value: unknown): SurfaceOpsState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { sites: {} }
  }
  const source = (value as Partial<SurfaceOpsState>).sites
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return { sites: {} }
  }

  const sites: Record<string, SurfaceSiteProgress> = {}
  for (const [siteId, raw] of Object.entries(source)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const record = raw as Partial<SurfaceSiteProgress> & { rightsPurchasedAt?: unknown }
    const accessPurchasedAt = typeof record.siteAccessPurchasedAt === 'number'
      ? record.siteAccessPurchasedAt
      : typeof record.rightsPurchasedAt === 'number'
        ? record.rightsPurchasedAt
        : undefined
    sites[siteId] = {
      storage: cleanManifest(record.storage),
      ...(Number.isFinite(accessPurchasedAt)
        ? { siteAccessPurchasedAt: Math.max(0, accessPurchasedAt ?? 0) }
        : {}),
      ...(cleanLaunchpad(record.launchpad)
        ? { launchpad: cleanLaunchpad(record.launchpad) }
        : {}),
      ...(cleanFerry(record.ferry)
        ? { ferry: cleanFerry(record.ferry) }
        : {}),
      ...(cleanFieldOperation(record.fieldOperation, siteId)
        ? { fieldOperation: cleanFieldOperation(record.fieldOperation, siteId) }
        : {}),
    }
  }
  return { sites }
}

export function surfaceSiteProgress(
  player: Pick<Player, 'surfaceOps'>,
  siteId: string
): SurfaceSiteProgress {
  return player.surfaceOps?.sites[siteId] ?? EMPTY_SITE
}

function updateSite(
  state: GameState,
  siteId: string,
  update: (site: SurfaceSiteProgress) => SurfaceSiteProgress
): GameState {
  const surfaceOps = normalizeSurfaceOps(state.player.surfaceOps)
  const current = surfaceOps.sites[siteId] ?? EMPTY_SITE
  return {
    ...state,
    player: {
      ...state.player,
      surfaceOps: {
        sites: {
          ...surfaceOps.sites,
          [siteId]: update(current),
        },
      },
    },
  }
}

export function surfaceStorageTotal(site: SurfaceSiteProgress): number {
  return Object.values(site.storage).reduce((sum, amount) => sum + amount, 0)
}

export function surfaceCargoReady(site: SurfaceSiteProgress): boolean {
  return surfaceStorageTotal(site) >= SURFACE_STORAGE_CAPACITY
}

export function settlementLaunchpadStatus(
  player: Pick<Player, 'freeOperations' | 'surfaceOps'>,
  siteId: string,
  now: number = Date.now()
): SettlementLaunchpadStatus {
  const definition = surfaceSiteById(siteId)
  if (!definition || definition.availability !== 'available' || !player.freeOperations) {
    return 'unavailable'
  }
  const site = surfaceSiteProgress(player, siteId)
  if (!site.siteAccessPurchasedAt || !site.launchpad) return 'locked'
  return now >= site.launchpad.completesAt ? 'ready' : 'building'
}

export function applyPurchaseSiteAccess(
  state: GameState,
  siteId: string,
  now: number = Date.now()
): GameState {
  const definition = surfaceSiteById(siteId)
  const current = surfaceSiteProgress(state.player, siteId)
  if (
    !definition
    || definition.availability !== 'available'
    || !state.player.freeOperations
    || current.siteAccessPurchasedAt
    || state.player.francs < definition.accessFee
  ) {
    return state
  }
  const next = updateSite(state, siteId, site => ({
    ...site,
    siteAccessPurchasedAt: now,
  }))
  return {
    ...next,
    player: {
      ...next.player,
      francs: next.player.francs - definition.accessFee,
    },
  }
}

/**
 * Start exactly one resumable field operation per accessed site. Landnam owns
 * this contract; TakeOn receives it as body + rover + seed and never chooses
 * programme identity or economics itself.
 */
export function applyStartFieldOperation(
  state: GameState,
  siteId: string,
  now: number = Date.now()
): GameState {
  const definition = surfaceSiteById(siteId)
  const site = surfaceSiteProgress(state.player, siteId)
  if (!definition || !site.siteAccessPurchasedAt || site.fieldOperation) return state
  const seed = stableSeed(`${siteId}:${site.siteAccessPurchasedAt}`)
  const rover: RoverSpec = {
    id: `prospector-${siteId}`,
    name: 'Prospector',
    chassis: 'chassis-lab',
    wheels: 'wheels-rocker',
    power: 'power-solar-xl',
    battery: 'batt-stack',
    modules: ['tool-drill', 'cam-pano', 'cargo-crate'],
    color: '#f6c96a',
  }
  return updateSite(state, siteId, current => ({
    ...current,
    fieldOperation: {
      id: `surface-${siteId}-${site.siteAccessPurchasedAt}`,
      missionId: `surface-site-${siteId}`,
      targetId: siteId,
      siteId,
      bodyId: definition.bodyId,
      seed,
      rover,
      label: `${definition.name} · Prospector deployment`,
      cargo: { requirements: {}, capacity: 0 },
      objective: {
        kind: 'settlement',
        description: `Operate the ${definition.name} field site.`,
      },
      returnPolicy: { owner: 'landnam', reconcileAt: 'field-return' },
      startedAt: now,
    },
  }))
}

function hasLaunchpadMaterials(player: Player): boolean {
  return Object.entries(SETTLEMENT_LAUNCHPAD.costMaterials)
    .every(([id, amount]) => (player.stash?.[id] ?? 0) >= amount)
}

export function canBuildSettlementLaunchpad(
  state: GameState,
  siteId: string
): boolean {
  const site = surfaceSiteProgress(state.player, siteId)
  return !!site.siteAccessPurchasedAt
    && !site.launchpad
    && state.player.freeOperations
    && state.player.francs >= SETTLEMENT_LAUNCHPAD.costFrancs
    && hasLaunchpadMaterials(state.player)
}

export function applyBuildSettlementLaunchpad(
  state: GameState,
  siteId: string,
  pad: 0 | 1 | 2,
  now: number = Date.now()
): GameState {
  if (!canBuildSettlementLaunchpad(state, siteId)) return state
  const stash = { ...(state.player.stash ?? {}) }
  for (const [id, amount] of Object.entries(SETTLEMENT_LAUNCHPAD.costMaterials)) {
    stash[id] = Math.max(0, (stash[id] ?? 0) - amount)
    if (stash[id] === 0) delete stash[id]
  }
  const next = updateSite(state, siteId, site => ({
    ...site,
    launchpad: {
      pad,
      startedAt: now,
      completesAt: now + SETTLEMENT_LAUNCHPAD.buildTimeMs,
    },
  }))
  return {
    ...next,
    player: {
      ...next.player,
      francs: next.player.francs - SETTLEMENT_LAUNCHPAD.costFrancs,
      stash,
    },
  }
}

export function applyRecordSurfaceMined(
  state: GameState,
  siteId: string,
  mineralId: string,
  amount: number
): GameState {
  const site = surfaceSiteProgress(state.player, siteId)
  if (!site.siteAccessPurchasedAt || amount <= 0 || !Number.isFinite(amount)) return state
  const room = Math.max(0, SURFACE_STORAGE_CAPACITY - surfaceStorageTotal(site))
  const accepted = Math.min(room, Math.floor(amount))
  if (accepted <= 0) return state
  return updateSite(state, siteId, current => ({
    ...current,
    storage: {
      ...current.storage,
      [mineralId]: (current.storage[mineralId] ?? 0) + accepted,
    },
  }))
}

export function applyDispatchSurfaceFerry(
  state: GameState,
  siteId: string,
  now: number = Date.now(),
  batchId: string = `surface-${siteId}-${now}`
): GameState {
  const site = surfaceSiteProgress(state.player, siteId)
  if (
    settlementLaunchpadStatus(state.player, siteId, now) !== 'ready'
    || !surfaceCargoReady(site)
    || site.ferry
  ) {
    return state
  }
  const manifest = { ...site.storage }
  return updateSite(state, siteId, current => ({
    ...current,
    storage: {},
    ferry: {
      id: batchId,
      status: 'in-flight',
      manifest,
      dispatchedAt: now,
      arrivesAt: now + SURFACE_FERRY_DURATION_MS,
      attempts: 1,
    },
  }))
}

export function applyFailSurfaceFerry(
  state: GameState,
  siteId: string,
  ferryId: string,
  reason: string
): GameState {
  const site = surfaceSiteProgress(state.player, siteId)
  if (!site.ferry || site.ferry.id !== ferryId || site.ferry.status !== 'in-flight') {
    return state
  }
  return updateSite(state, siteId, current => ({
    ...current,
    ferry: current.ferry
      ? { ...current.ferry, status: 'failed', failureReason: reason }
      : undefined,
  }))
}

export function applyRetrySurfaceFerry(
  state: GameState,
  siteId: string,
  now: number = Date.now()
): GameState {
  const site = surfaceSiteProgress(state.player, siteId)
  if (!site.ferry || site.ferry.status !== 'failed') return state
  return updateSite(state, siteId, current => ({
    ...current,
    ferry: current.ferry
      ? {
        ...current.ferry,
        status: 'in-flight',
        dispatchedAt: now,
        arrivesAt: now + SURFACE_FERRY_DURATION_MS,
        attempts: current.ferry.attempts + 1,
        failureReason: undefined,
      }
      : undefined,
  }))
}

export function applyReconcileSurfaceFerry(
  state: GameState,
  siteId: string,
  now: number = Date.now()
): GameState {
  const site = surfaceSiteProgress(state.player, siteId)
  const ferry = site.ferry
  if (
    !ferry
    || ferry.status !== 'in-flight'
    || now < ferry.arrivesAt
    || ferry.reconciledAt
  ) {
    return state
  }

  const stash = { ...(state.player.stash ?? {}) }
  for (const [id, amount] of Object.entries(ferry.manifest)) {
    stash[id] = (stash[id] ?? 0) + amount
  }
  const next = updateSite(state, siteId, current => ({
    ...current,
    ferry: current.ferry
      ? {
        ...current.ferry,
        status: 'delivered',
        deliveredAt: now,
        reconciledAt: now,
      }
      : undefined,
  }))
  return { ...next, player: { ...next.player, stash } }
}

export function applyAcknowledgeSurfaceFerry(
  state: GameState,
  siteId: string
): GameState {
  const site = surfaceSiteProgress(state.player, siteId)
  if (!site.ferry || site.ferry.status !== 'delivered') return state
  return updateSite(state, siteId, current => ({
    ...current,
    ferry: undefined,
  }))
}
