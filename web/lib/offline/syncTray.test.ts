import { describe, expect, it } from 'vitest'
import { ageLabel, describeChange, syncState, syncTrayCopy } from './syncTray'
import type { OutboxItem } from './outbox'

const item = (op: OutboxItem['op']): OutboxItem => ({ id: 'x', op, createdAt: 0, attempts: 0, nextAttemptAt: 0, failed: false })

describe('sync tray (SSL-729)', () => {
  it('says where progress is', () => {
    expect(syncState(true, { waiting: 2, failed: 0, flushing: false }, false)).toBe('offline')
    expect(syncState(true, { waiting: 2, failed: 0, flushing: true }, true)).toBe('uploading')
    expect(syncState(true, { waiting: 1, failed: 1, flushing: false }, true)).toBe('problem')
    expect(syncState(true, { waiting: 0, failed: 0, flushing: false }, true)).toBe('synced')
    expect(syncTrayCopy('offline', 3).body).toContain('3 changes are saved on this device')
    expect(syncTrayCopy('offline', 1).body).toContain('1 change is saved')
  })

  it('names each waiting change in plain words', () => {
    expect(describeChange(item({ type: 'upsert', collection: 'game_states', id: 'a', filter: '', data: {} }))).toBe('Base and progress')
    expect(describeChange(item({ type: 'create', collection: 'mission_runs', id: 'a', data: {} }))).toBe('Mission started')
    expect(describeChange(item({ type: 'http', path: '/api/landnam/community/research', method: 'POST', body: {} }))).toBe('Community research')
    expect(ageLabel(0, 30_000)).toBe('just now')
    expect(ageLabel(0, 5 * 60_000)).toBe('5 min ago')
  })
})
