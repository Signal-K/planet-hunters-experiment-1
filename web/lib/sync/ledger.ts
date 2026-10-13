/**
 * Conflict-free progress ledger (SSL-559). Mirrored 1:1 in native
 * LandnamCore/Sync/Ledger.swift — keep both in step (shared vectors in tests).
 *
 * Additive progress (francs, XP, skill points, missions done, stash and refined
 * goods per item) is a PN-counter CRDT stored inside the save:
 *
 *   value(key) = base[key] + Σ_device (plus[key] - minus[key])
 *
 * Each device only ever grows its own `plus`/`minus` and bumps its own `seq`,
 * so two devices playing offline at the same time both count: merging takes,
 * per device, the entry with the higher seq (never a sum, so replays and
 * re-merges cannot duplicate). Local changes are recorded by diffing the live
 * value against the ledger value (`stampLedger`), so every code path that
 * changes francs or cargo is captured without instrumenting it, and a state
 * produced by a merge records nothing.
 */

export const LEDGER_SCALARS = ['francs', 'researchXP', 'skillPoints', 'academyXP', 'researchAnnotations', 'missionsDone'] as const
export const LEDGER_RECORDS = ['stash', 'refinedGoods'] as const

export type Counters = Record<string, number>
export interface DeviceEntry { seq: number; plus: Counters; minus: Counters }
export interface SyncLedger { v: 1; base: Counters; devices: Record<string, DeviceEntry>; version: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlayerLike = any
type SaveLike = { player: PlayerLike; syncLedger?: SyncLedger | null }

export function readCounters(player: PlayerLike): Counters {
  const out: Counters = {}
  for (const k of LEDGER_SCALARS) {
    const v = player[k]
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  for (const r of LEDGER_RECORDS) {
    const rec = player[r]
    if (rec && typeof rec === 'object') {
      for (const [id, v] of Object.entries(rec as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) out[`${r}.${id}`] = v
      }
    }
  }
  return out
}

export function ledgerValues(ledger: SyncLedger): Counters {
  const out: Counters = { ...ledger.base }
  for (const d of Object.values(ledger.devices)) {
    for (const [k, v] of Object.entries(d.plus)) out[k] = (out[k] ?? 0) + v
    for (const [k, v] of Object.entries(d.minus)) out[k] = (out[k] ?? 0) - v
  }
  return out
}

function writeCounters<P extends PlayerLike>(player: P, values: Counters): P {
  const next: Record<string, unknown> = { ...(player as object) }
  for (const k of LEDGER_SCALARS) if (k in values) next[k] = values[k]
  for (const r of LEDGER_RECORDS) {
    const rec: Record<string, number> = {}
    for (const [k, v] of Object.entries(values)) {
      if (!k.startsWith(`${r}.`)) continue
      const n = Math.max(0, Math.round(v))
      if (n > 0) rec[k.slice(r.length + 1)] = n
    }
    next[r] = rec
  }
  return next as P
}

/** Records local changes (live value vs ledger value) on this device's entry. Idempotent. */
export function stampLedger<S extends SaveLike>(state: S, deviceId: string): S {
  const live = readCounters(state.player)
  const ledger = state.syncLedger
  if (!ledger) return { ...state, syncLedger: { v: 1, base: live, devices: {}, version: 0 } }
  const current = ledgerValues(ledger)
  let changed = false
  const mine: DeviceEntry = ledger.devices[deviceId]
    ? { seq: ledger.devices[deviceId].seq, plus: { ...ledger.devices[deviceId].plus }, minus: { ...ledger.devices[deviceId].minus } }
    : { seq: 0, plus: {}, minus: {} }
  for (const k of new Set([...Object.keys(live), ...Object.keys(current)])) {
    const d = (live[k] ?? 0) - (current[k] ?? 0)
    if (d === 0) continue
    changed = true
    if (d > 0) mine.plus[k] = (mine.plus[k] ?? 0) + d
    else mine.minus[k] = (mine.minus[k] ?? 0) - d
  }
  if (!changed) return state
  mine.seq += 1
  return { ...state, syncLedger: { ...ledger, devices: { ...ledger.devices, [deviceId]: mine } } }
}

/** Union of two ledgers: per device the higher seq wins; bases take the per-key max. */
export function mergeLedgers(a: SyncLedger | null | undefined, b: SyncLedger | null | undefined): SyncLedger | null {
  if (!a) return b ?? null
  if (!b) return a
  const base: Counters = { ...a.base }
  for (const [k, v] of Object.entries(b.base)) base[k] = Math.max(base[k] ?? 0, v)
  const devices: Record<string, DeviceEntry> = { ...a.devices }
  for (const [id, e] of Object.entries(b.devices)) {
    const mine = devices[id]
    if (!mine || e.seq > mine.seq) devices[id] = e
  }
  return { v: 1, base, devices, version: Math.max(a.version, b.version) }
}

/** Applies the merged ledger's totals to a merged save (the rest of the save is merged field by field elsewhere). */
export function applyMergedLedger<S extends SaveLike>(merged: S, local: SaveLike, remote: SaveLike): S {
  // An untouched save (fresh install / sign-in placeholder) contributes nothing, not even its starting base.
  if (isUntouched(remote) && !isUntouched(local)) return { ...merged, player: writeCounters(merged.player, local.syncLedger ? ledgerValues(local.syncLedger) : readCounters(local.player)), syncLedger: local.syncLedger ?? null }
  if (isUntouched(local) && !isUntouched(remote)) return { ...merged, player: writeCounters(merged.player, remote.syncLedger ? ledgerValues(remote.syncLedger) : readCounters(remote.player)), syncLedger: remote.syncLedger ?? null }
  const localLedger = local.syncLedger ?? { v: 1 as const, base: readCounters(local.player), devices: {}, version: 0 }
  const remoteLedger = remote.syncLedger ?? { v: 1 as const, base: readCounters(remote.player), devices: {}, version: 0 }
  const ledger = mergeLedgers(localLedger, remoteLedger)!
  return { ...merged, player: writeCounters(merged.player, ledgerValues(ledger)), syncLedger: ledger }
}

export function isUntouched(save: SaveLike): boolean {
  const p = save.player ?? {}
  return ledgerWeight(save) === 0 && !(p.missionsDone > 0) && !((p.placed?.length ?? 0) > 0)
}

/** Whether this save carries any progress worth protecting (an empty save never overwrites a richer one). */
export function ledgerWeight(save: SaveLike): number {
  const l = save.syncLedger
  return l ? Object.values(l.devices).reduce((n, d) => n + d.seq, 0) : 0
}
