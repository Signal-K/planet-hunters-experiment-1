import { describe, expect, it } from 'vitest'
import { createOutbox, memoryStore, newRecordId } from './outbox'
import { executeOnPocketBase } from './pbOutbox'
import type { PassportResponse } from '@/lib/research/passport'
import { pbLandnam } from '@/lib/pb-landnam'

// Opt-in, local PocketBase only (SSL-554): LANDNAM_LIVE_PB / LANDNAM_LIVE_EMAIL / LANDNAM_LIVE_PASSWORD.
// Plays a run's receipts and save offline, reconnects, and checks PocketBase matches.
const live = process.env.LANDNAM_LIVE_PB
describe.skipIf(!live)('web outbox against a local PocketBase', () => {
  it('replays an offline launch, mine and settle once online, idempotently', async () => {
    const base = new URL(live!)
    expect(['localhost', '127.0.0.1']).toContain(base.hostname)
    pbLandnam.baseURL = live!
    const auth = await pbLandnam.collection('users').authWithPassword(process.env.LANDNAM_LIVE_EMAIL!, process.env.LANDNAM_LIVE_PASSWORD!)
    const user = auth.record.id
    const day = new Date().toISOString().slice(0, 10)
    const before = await pbLandnam.send<PassportResponse>('/api/community/research/passport', { method: 'GET' })
    expect(before.confirmedStamps?.[day]).toBeUndefined()
    // Offline = the server is unreachable (the browser's network drop), so every write must wait.
    let online = false
    pbLandnam.baseURL = 'http://127.0.0.1:1'
    const box = createOutbox({ store: memoryStore(), execute: executeOnPocketBase, isOnline: () => online })
    const runId = newRecordId()
    await box.enqueue({ type: 'create', collection: 'mission_runs', id: runId, data: { user, mission_id: 'web-offline', target_id: 'moon', status: 'in_progress', phase: 'transit', cargo: {}, launched_at: new Date().toISOString() } })
    await box.enqueue({ type: 'update', collection: 'mission_runs', id: runId, data: { status: 'in_progress', phase: 'debrief', cargo: { platinum: 5 } } })
    await box.enqueue({ type: 'update', collection: 'mission_runs', id: runId, data: { status: 'completed', phase: 'debrief', payout_francs: 1200, completed_at: new Date().toISOString() } })
    await box.enqueue({ type: 'upsert', collection: 'game_states', id: newRecordId(), filter: `user = "${user}"`, data: { user, state: { player: { missionsDone: 9, francs: 4321, researchFragments: 17, researchStamps: { [day]: ['probe-observation', 'classification'] } } }, missions_done: 9 } })
    await box.flush()
    expect(box.pending()).toHaveLength(4)

    online = true
    pbLandnam.baseURL = live!
    await box.flush()
    expect(box.pending()).toHaveLength(0)
    await box.enqueue({ type: 'create', collection: 'mission_runs', id: runId, data: { user, mission_id: 'web-offline', status: 'in_progress' } })
    await box.flush()
    expect(box.pending()).toHaveLength(0)

    const run = await pbLandnam.collection('mission_runs').getOne(runId)
    expect(run).toMatchObject({ user, status: 'completed', payout_francs: 1200, cargo: { platinum: 5 } })
    const save = await pbLandnam.collection('game_states').getFirstListItem(`user = "${user}"`)
    expect(save.missions_done).toBe(9)
    expect(save.state.player.researchFragments).toBe(17)
    const receipt = await pbLandnam.send<PassportResponse>('/api/community/research/passport', { method: 'GET' })
    expect(receipt.confirmedStamps?.[day]).toEqual(['probe-observation', 'classification'])
    expect(receipt.weeks[0].mine).toBe(1)
    await box.flush()
    const replay = await pbLandnam.send<PassportResponse>('/api/community/research/passport', { method: 'GET' })
    expect(replay).toEqual(receipt)
  })
})
