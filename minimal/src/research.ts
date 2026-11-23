import type { GameState, Player } from '@landnam/lib/game-types'
import { gameStateStorageKey, GAME_STATE_STORAGE_KEY } from '@landnam/lib/game-state-storage'
import { addStamp, stampDayKey } from '@landnam/lib/research/stamps'
import { dataSiteCredit, missionSiteCredit, queueSiteContribution } from '@landnam/lib/community/site'
import { pbLandnam, exchangeLandnamAuth } from '@landnam/lib/pb-landnam'
import { getOutbox, queueUpsert } from '@landnam/lib/offline/pbOutbox'
import { addShowerCatches } from '@landnam/lib/orionids/shower-ledger'
import { completeChainRun, getShowerChain } from '@landnam/lib/orionids/chain'
import { grantBadge, grantBadgesForActivity } from '@landnam/lib/data/sky-events'
import { showerForRunMission, ORIONIDS_SHOWER_ID } from '@landnam/lib/data/showers'
import { recordAgencyLaunch } from '@landnam/lib/agency/fleet'
import { placeProbe } from '@landnam/lib/probes/survey-probe'
import type { Chapter } from './chapters'
import { DEFAULT_STATE } from '@landnam/lib/game-state'
import { currentPilot, authToken } from './auth'

const key = (id: string) => gameStateStorageKey(GAME_STATE_STORAGE_KEY, id)
function snapshot(id: string): { player?: Player } {
  try {
    return JSON.parse(localStorage.getItem(key(id)) || '{}')
  } catch {
    return {}
  }
}
export const researchPlayer = (id: string) => snapshot(id).player

export async function connectResearch(id: string) {
  const token = authToken()
  if (!token || id === 'stage') return
  const auth = await exchangeLandnamAuth(token)
  if (currentPilot()?.id !== id || token !== authToken()) return
  pbLandnam.authStore.save(auth.token, auth.record)
  if (!snapshot(id).player) {
    try {
      const row = await pbLandnam.collection('game_states').getFirstListItem(`user = "${id}"`)
      if (currentPilot()?.id !== id) return
      if (row.state?.player && !snapshot(id).player) localStorage.setItem(key(id), JSON.stringify(row.state))
    } catch (error) {
      if ((error as { status?: number }).status !== 404) throw error
      if (!snapshot(id).player) localStorage.setItem(key(id), JSON.stringify(DEFAULT_STATE))
    }
  }
  drainPending(id)
  await getOutbox().flush()
}

interface Receipt {
  runId: string
  chapter: Chapter
  cargo: Record<string, number>
  now: number
}
const pendingKey = (id: string) => 'landnam-minimal:research:' + id
function pending(id: string): Receipt[] {
  try {
    return JSON.parse(localStorage.getItem(pendingKey(id)) || '[]')
  } catch {
    return []
  }
}
export function recordFlight(id: string, chapter: Chapter, cargo: Record<string, number>, runId: string) {
  const receipt = { chapter, cargo, runId, now: Date.now() }
  if (id === 'stage') {
    if (!snapshot(id).player) localStorage.setItem(key(id), JSON.stringify(DEFAULT_STATE))
    applyFlight(id, receipt)
    return
  }
  localStorage.setItem(pendingKey(id), JSON.stringify([...pending(id), receipt]))
  drainPending(id)
}
function drainPending(id: string) {
  if (pbLandnam.authStore.record?.id !== id || !snapshot(id).player) return
  const receipts = pending(id)
  for (const receipt of receipts) applyFlight(id, receipt)
  localStorage.removeItem(pendingKey(id))
}
function applyFlight(id: string, { chapter, cargo, runId, now }: Receipt) {
  const shower = showerForRunMission(chapter.mission?.id)
  const survey = chapter.verb === 'survey'
  const raw = snapshot(id)
  if (raw.player && !raw.player.completedMissions?.some((record) => record.runId === runId)) {
    let player = addStamp(
      raw.player,
      shower ? 'event' : survey ? 'survey' : chapter.type === 'satellite' ? 'launch' : 'contract-run',
      now,
    )
    if (shower) {
      player = addShowerCatches(player, shower.id, cargo[shower.resourceId] || 0)
      const chain = getShowerChain(shower.id)
      player = chain ? completeChainRun(player, chain, now) : grantBadge(player, shower.id, now)
      if (shower.id === ORIONIDS_SHOWER_ID) player = { ...player, orionidsEventStage: 3 }
    }
    if (chapter.verb === 'deploy' || chapter.verb === 'survey')
      player = grantBadgesForActivity(player, 'launch', now).player
    if (chapter.eventId && !shower) player = grantBadge(player, chapter.eventId, now)
    if (chapter.type === 'satellite') {
      player = recordAgencyLaunch(player, 'space-telescope', runId, now)
      player = { ...player, transitSatelliteLaunchedAt: player.transitSatelliteLaunchedAt || now }
    }
    player = {
      ...player,
      completedMissions: [
        ...(player.completedMissions || []),
        {
          id: chapter.mission?.id || String(chapter.number),
          title: chapter.name,
          runId,
          completedAt: now,
          targetId: chapter.target?.id,
          targetName: chapter.target?.name,
          kind: 'program',
        },
      ],
    }
    if (chapter.type === 'survey-flight') player = addStamp(player, 'discovery-mission', now)
    if (chapter.type === 'survey-probe' && chapter.target) player = placeProbe(player, chapter.target.id, now)
    const state = { ...raw, player } as GameState
    localStorage.setItem(key(id), JSON.stringify(state))
    if (id !== 'stage')
      void queueUpsert(
        'game_states',
        `user = "${id}"`,
        { user: id, state, missions_done: player.missionsDone },
        id,
      )
  }
  if (id === 'stage' || pbLandnam.authStore.record?.id !== id) return
  const credit = missionSiteCredit(chapter.mission, cargo)
  if (credit) queueSiteContribution(runId, credit, now)
  if (survey) queueSiteContribution('data:survey:' + stampDayKey(now), dataSiteCredit(), now)
}
