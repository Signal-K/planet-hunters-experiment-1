// SSL-729: what the sync tray says. Liam could not tell whether his changes
// would reach his account, so the tray names each waiting change in plain words
// and says where progress is right now.

import type { OutboxItem, OutboxSnapshot } from './outbox'

export type SyncState = 'offline' | 'uploading' | 'waiting' | 'problem' | 'synced'

export function syncState(landnamSynced: boolean, outbox: OutboxSnapshot, online: boolean): SyncState {
  if (!online) return 'offline'
  if (outbox.flushing && outbox.waiting > 0) return 'uploading'
  if (outbox.failed > 0 || !landnamSynced) return 'problem'
  if (outbox.waiting > 0) return 'waiting'
  return 'synced'
}

export function syncTrayCopy(state: SyncState, waiting: number): { title: string; body: string } {
  const changes = `${waiting} ${waiting === 1 ? 'change' : 'changes'}`
  switch (state) {
    case 'offline': return {
      title: 'Offline',
      body: waiting > 0
        ? `Keep playing. ${changes} ${waiting === 1 ? 'is' : 'are'} saved on this device and upload to your account when you reconnect.`
        : 'Keep playing. Everything is saved on this device and uploads to your account when you reconnect.',
    }
    case 'uploading': return { title: 'Uploading', body: `Sending ${changes} to your account.` }
    case 'waiting': return { title: 'Waiting to upload', body: `${changes} saved on this device ${waiting === 1 ? 'is' : 'are'} queued for your account.` }
    case 'problem': return {
      title: 'Not synced yet',
      body: 'Your progress is safe on this device. The server has not accepted it yet; it keeps retrying, or tap Upload now.',
    }
    case 'synced': return { title: 'All synced', body: 'Everything you have done is saved to your account.' }
  }
}

/** One waiting change in plain words. */
export function describeChange(item: OutboxItem): string {
  const op = item.op
  if (op.type === 'http') return op.path.includes('community') ? 'Community research' : 'Shared record'
  switch (op.collection) {
    case 'game_states': return 'Base and progress'
    case 'mission_runs': return op.type === 'create' ? 'Mission started' : 'Mission record'
    case 'voxel_worlds': return 'Rover terrain'
    case 'onboarding_feedback': return 'Feedback'
    case 'community_contributions': return 'Community Site'
    default: return 'Game change'
  }
}

export function ageLabel(createdAt: number, now: number): string {
  const s = Math.max(0, Math.round((now - createdAt) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86_400)} d ago`
}
