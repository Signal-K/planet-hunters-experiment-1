// SSL-746: the consensus area. The server (pocketbase/consensus.go) owns requests, votes
// and the verification threshold. This file holds the shared shapes and small pure helpers.

export type ConsensusProject = 'tess' | 'asteroid' | 'saturn'
export type ConsensusVerdict = 'support' | 'dispute' | 'unsure'
export type ConsensusState = 'open' | 'verified' | 'disputed'

/** The requester's instrument readout, as the classify scene shows it. Opaque to the server. */
export interface ConsensusReadout {
  verdict: string
  rows: { label: string; value: string }[]
}

export interface ConsensusReview {
  verdict: ConsensusVerdict
  reason?: string
}

/** One of the player's own requests, with the tally only a requester sees. */
export interface ConsensusRequest {
  id: string
  project: ConsensusProject
  subjectId: string
  state: ConsensusState
  supports: number
  disputes: number
  unsure: number
  /** Supports needed to verify, which grows with the number of regular players. */
  required: number
  readout: ConsensusReadout | null
  reviews: ConsensusReview[]
  createdAt: string
}

/** What a reviewer sees first: the subject only, never the readout or a tally. */
export interface ConsensusQueueItem {
  id: string
  project: ConsensusProject
  subjectId: string
  createdAt: string
  /** The reviewer already did their own work and unlocked the readout. */
  revealed: boolean
}

export interface ConsensusOverview {
  required: number
  activePlayers: number
  mine: ConsensusRequest[]
  queue: ConsensusQueueItem[]
}

export const PROJECT_LABEL: Record<ConsensusProject, string> = {
  tess: 'Transit',
  asteroid: 'Asteroid',
  saturn: 'Saturn storm',
}

export function stateLabel(request: Pick<ConsensusRequest, 'state' | 'supports' | 'disputes' | 'required'>): string {
  if (request.state === 'verified') return 'Verified'
  if (request.state === 'disputed') return 'Disputed'
  if (request.supports + request.disputes === 0) return 'Waiting for reviewers'
  return `${request.supports} of ${request.required} supports`
}
