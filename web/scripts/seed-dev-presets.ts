#!/usr/bin/env node
// Seeds real, backend-persisted accounts for the DevShortcuts "DEV" panel
// (STS-627). Local dev only — every request is guarded to localhost so this
// can never accidentally write to the shared/deployed PocketBase.
//
// Reuses the actual `resolvePreset()` shot definitions from devPresets.ts as
// the single source of truth, rather than duplicating shot shapes here — a
// seeded account for `m2-fab` is built from exactly the same data the
// in-memory `?preset=m2-fab` flow uses, just persisted for real and merged
// through the same `normalizeAndRepair()` every other save goes through.
//
// Usage:
//   npx tsx scripts/seed-dev-presets.ts <shot-key>
//   npx tsx scripts/seed-dev-presets.ts all
//
// Requires both local PocketBase instances running (`make up` / `make pb-up`
// from the repo root) and the standard local superuser
// (liam@skinetics.tech / ThisIsATestPassword) already provisioned on both.
//
// `mission_log` rows carry a plausible backdated `completed_at` (a plain,
// client-settable DateField added in pocketbase/main.go specifically for
// this — mission_log's own `created`/`updated` have no autodate field and
// can't be backdated at all, see seedMissionLog below). In-flight presets
// also get plausible domain timestamps inside `game_states.state` —
// arrivalAt/transitStartedAt computed relative to Date.now() at seed time,
// exactly like the live `?preset=` flow already does — and completed-mission
// presets get a backdated `clientCooldowns` entry so the relevant client's
// cooldown reads as already expired rather than freshly started.

import { resolvePreset, DEV_GROUPS } from '../lib/devPresets.ts'
import { DEFAULT_STATE, normalizeAndRepair } from '../lib/game-state.ts'
import { MISSIONS } from '../lib/data.ts'
import type { GameState } from '../lib/game-types.ts'

const SHARED_URL = 'http://localhost:8090'
const LANDNAM_URL = process.env.LANDNAM_PB_URL_OVERRIDE ?? 'http://localhost:8091'
const SUPERUSER_EMAIL = 'liam@skinetics.tech'
const SUPERUSER_PASSWORD = 'ThisIsATestPassword'
// Distinct from player account credentials so a seeded dev preset
// account is never mistaken for (or interchangeable with) a real player's
// throwaway guest account.
const PRESET_PASSWORD = 'DevPreset123!'

function assertLocal(url: string) {
  const { hostname } = new URL(url)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new Error(
      `Refusing to seed a non-local PocketBase URL: ${url}. This tool is local-only by design ` +
      `(preview/staging deploys share the production PocketBase — see STS-627) and must never run against it.`
    )
  }
}

function presetEmail(key: string): string {
  return `dev-preset-${key}@example.com`
}

async function json(res: Response) {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

async function superuserToken(url: string): Promise<string> {
  assertLocal(url)
  const res = await fetch(`${url}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: SUPERUSER_EMAIL, password: SUPERUSER_PASSWORD }),
  })
  if (!res.ok) {
    throw new Error(`Superuser auth failed against ${url}: ${res.status} ${JSON.stringify(await json(res))}`)
  }
  const data = await res.json() as { token: string }
  return data.token
}

async function findUserByEmail(token: string, email: string): Promise<string | null> {
  const filter = encodeURIComponent(`email="${email}"`)
  const res = await fetch(`${SHARED_URL}/api/collections/users/records?filter=${filter}`, {
    headers: { Authorization: token },
  })
  if (!res.ok) throw new Error(`User lookup failed: ${res.status} ${JSON.stringify(await json(res))}`)
  const data = await res.json() as { items: { id: string }[] }
  return data.items[0]?.id ?? null
}

// Same field shape as an email account — a seeded preset
// account should be indistinguishable from a real throwaway guest account to
// every downstream consumer (auth exchange, mergeRemoteState, etc.).
async function ensureUser(token: string, key: string, label: string): Promise<string> {
  const email = presetEmail(key)
  const existing = await findUserByEmail(token, email)
  if (existing) return existing
  const res = await fetch(`${SHARED_URL}/api/collections/users/records`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password: PRESET_PASSWORD, passwordConfirm: PRESET_PASSWORD,
      name: `Dev Preset: ${label}`,
    }),
  })
  if (!res.ok) throw new Error(`Create user (${email}) failed: ${res.status} ${JSON.stringify(await json(res))}`)
  const data = await res.json() as { id: string }
  return data.id
}

async function upsertGameState(token: string, userId: string, state: GameState) {
  const body = JSON.stringify({ id: userId, user: userId, state, missions_done: state.player.missionsDone })
  const create = await fetch(`${LANDNAM_URL}/api/collections/game_states/records`, {
    method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body,
  })
  if (create.ok) return
  // 400/409 here means the deterministic id already exists (a re-run) —
  // fall through to update, mirroring saveRemoteState's own fallback.
  if (create.status === 400 || create.status === 409) {
    const update = await fetch(`${LANDNAM_URL}/api/collections/game_states/records/${userId}`, {
      method: 'PATCH', headers: { Authorization: token, 'Content-Type': 'application/json' }, body,
    })
    if (!update.ok) throw new Error(`game_states update failed: ${update.status} ${JSON.stringify(await json(update))}`)
    return
  }
  throw new Error(`game_states create failed: ${create.status} ${JSON.stringify(await json(create))}`)
}

async function clearMissionLog(token: string, userId: string) {
  const filter = encodeURIComponent(`user="${userId}"`)
  const res = await fetch(`${LANDNAM_URL}/api/collections/mission_log/records?filter=${filter}&perPage=200`, {
    headers: { Authorization: token },
  })
  if (!res.ok) return
  const data = await res.json() as { items: { id: string }[] }
  for (const item of data.items ?? []) {
    await fetch(`${LANDNAM_URL}/api/collections/mission_log/records/${item.id}`, {
      method: 'DELETE', headers: { Authorization: token },
    })
  }
}

// Mirrors devPresets.ts's own FIRST_MISSION/SECOND_MISSION/THIRD_MISSION
// picks so seeded mission_log rows reference the same missions the coached
// M1/M2/M3 flow actually assigns, rather than an arbitrary same-sequence
// mission that might not match what a real playthrough would have logged.
function missionForSequence(seq: number) {
  if (seq === 3) {
    return MISSIONS.find(m => m.id === 'lnm_m3_relay_bennu_vesta') ?? MISSIONS.find(m => m.sequence === 3)
  }
  return MISSIONS.find(m => m.sequence === seq)
}

async function seedMissionLog(token: string, userId: string, missionsDone: number) {
  await clearMissionLog(token, userId)
  for (let seq = 1; seq <= missionsDone; seq++) {
    const mission = missionForSequence(seq)
    if (!mission) continue
    // Spread completions back in time, most recent mission closest to now —
    // roughly a mission every ~1.1 days, so a save with several missions done
    // reads as "played over the last week or two", not "all in one instant".
    // Uses `completed_at` (a plain DateField, unlike mission_log's own
    // `created`/`updated`, which have no autodate field at all yet — see the
    // header comment) so this is a real, freely-settable backdated timestamp.
    const missionsAgo = missionsDone - seq
    const completedAt = new Date(Date.now() - (missionsAgo * 26 + 3) * 60 * 60 * 1000)
    const body = JSON.stringify({
      user: userId,
      mission_id: mission.id,
      target_id: mission.targetId ?? null,
      payout_francs: mission.payout?.francs ?? 0,
      minerals_delivered: mission.requires?.minerals ?? {},
      missions_done_after: seq,
      completed_at: completedAt.toISOString(),
    })
    const res = await fetch(`${LANDNAM_URL}/api/collections/mission_log/records`, {
      method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' }, body,
    })
    if (!res.ok) console.warn(`  ! mission_log seq ${seq} (${mission.id}) failed: ${res.status} ${JSON.stringify(await json(res))}`)
  }
}

// Backdate whichever client cooldown the shot's own mission touches, so a
// "just completed a mission" save doesn't read as though the client cooldown
// only just started — a real player who'd actually played through this would
// have that cooldown already partway (or fully) expired by the time they're
// looking at the Hub/Mission Board again.
function withPlausibleCooldowns(state: GameState): GameState {
  if (state.player.missionsDone < 1) return state
  const lastMission = missionForSequence(state.player.missionsDone)
  if (!lastMission?.client) return state
  const hoursAgo = 6 + state.player.missionsDone * 4
  return {
    ...state,
    player: {
      ...state.player,
      clientCooldowns: {
        ...state.player.clientCooldowns,
        [lastMission.client]: Date.now() - hoursAgo * 60 * 60 * 1000,
      },
    },
  }
}

async function seedShot(key: string, label: string, sharedToken: string, landnamToken: string) {
  const preset = resolvePreset(key)
  if (!preset) {
    console.warn(`⚠ ${key}: no resolvePreset() entry, skipped`)
    return
  }

  const merged = {
    ...DEFAULT_STATE,
    ...preset,
    player: { ...DEFAULT_STATE.player, ...preset.player },
  }
  const fullState = withPlausibleCooldowns(normalizeAndRepair(merged))

  const userId = await ensureUser(sharedToken, key, label)
  await upsertGameState(landnamToken, userId, fullState)
  await seedMissionLog(landnamToken, userId, fullState.player.missionsDone)

  console.log(`✓ ${key.padEnd(22)} screen=${fullState.screen.padEnd(10)} missionsDone=${fullState.player.missionsDone}  ${presetEmail(key)}`)
}

async function main() {
  const arg = process.argv[2]
  const allShots = DEV_GROUPS.flatMap(g => g.shots)
  // A few keys (e.g. ui-tess-discovery) are cross-listed in two groups —
  // dedupe by key so "all" doesn't seed the same account twice.
  const uniqueShots = Array.from(new Map(allShots.map(s => [s.key, s])).values())

  if (!arg) {
    console.error('Usage: npx tsx scripts/seed-dev-presets.ts <shot-key|all>')
    console.error('Shot keys:', uniqueShots.map(s => s.key).join(', '))
    process.exit(1)
  }

  assertLocal(SHARED_URL)
  assertLocal(LANDNAM_URL)

  const targets = arg === 'all' ? uniqueShots : uniqueShots.filter(s => s.key === arg)
  if (targets.length === 0) {
    console.error(`Unknown shot key: ${arg}`)
    console.error('Shot keys:', uniqueShots.map(s => s.key).join(', '))
    process.exit(1)
  }

  console.log(`Seeding against shared=${SHARED_URL} landnam=${LANDNAM_URL}`)
  const sharedToken = await superuserToken(SHARED_URL)
  const landnamToken = await superuserToken(LANDNAM_URL)

  let failed = 0
  for (const shot of targets) {
    try {
      await seedShot(shot.key, shot.label, sharedToken, landnamToken)
    } catch (err) {
      failed++
      console.error(`✗ ${shot.key}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`\nDone. ${targets.length - failed}/${targets.length} seeded. Password for every dev-preset account: ${PRESET_PASSWORD}`)
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
