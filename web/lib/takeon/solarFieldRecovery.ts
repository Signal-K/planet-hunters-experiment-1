import type { OutboxItem } from '@/lib/offline/outbox'
import { readSolarFieldIdentity } from './solarFieldIdentity'
import { solarFieldId } from './SolarFieldSync'

/** All queued revisions are kept in the backup, not just the first conflict. */
export function queuedSolarField(items: OutboxItem[], user: string, site: string): OutboxItem[] {
  return items.filter(item => item.op.type === 'solar-field' && item.op.user === user && item.op.site === site)
}

export function hasSolarFieldConflict(items: OutboxItem[]): boolean {
  return items.some(item => item.op.type === 'solar-field' && /\b409\b/.test(item.lastError ?? ''))
}

/** Refuse to discard local changes unless the account has a readable matching field. */
export function validAccountSolarField(result: { revision: number; state: { id?: string; coreSnapshot?: string } | null }, site: string): boolean {
  try {
    if (!Number.isSafeInteger(result.revision) || result.revision < 1 || result.state?.id !== site) return false
    const identity = readSolarFieldIdentity(result.state.coreSnapshot)
    return !!identity && solarFieldId(identity.bodyId, identity.zone) === site
  } catch { return false }
}
