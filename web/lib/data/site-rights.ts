import type { ClientTerritory, PredefinedSite } from '@/lib/systems/SiteRightsSystem'
import { SURFACE_SITES } from './surface-ops'

/**
 * The first site-right catalogue deliberately mirrors the live Surface Ops
 * locations. A right grants access to this predefined place only; it never
 * creates a claim map, parcel editor, or freeform settlement layer.
 */
const SITE_OWNERS: Record<string, { targetId: string; clientId: string }> = {
  'moon-south-pole': { targetId: 'moon', clientId: 'atlas-aggregate' },
  'mars-arcadia': { targetId: 'mars', clientId: 'ferrum-orbital-construction' },
  'europa-chaos': { targetId: 'europa', clientId: 'ceres-volatiles-collective' },
}

export const PREDEFINED_SITE_RIGHTS: readonly PredefinedSite[] = SURFACE_SITES.map(site => {
  const owner = SITE_OWNERS[site.id]
  return {
    id: site.id,
    targetId: owner.targetId,
    clientId: owner.clientId,
    offers: [
      { mode: 'purchase', activities: ['build', 'mine'], deedPriceFrancs: site.accessFee },
      { mode: 'lease', activities: ['mine'], deedPriceFrancs: Math.max(1, Math.round(site.accessFee * 0.3)), leaseDurationMs: 7 * 24 * 60 * 60 * 1000 },
    ],
  }
})

export const CLIENT_TERRITORIES: readonly ClientTerritory[] = PREDEFINED_SITE_RIGHTS.map(site => ({
  id: `territory:${site.clientId}:${site.targetId}`,
  clientId: site.clientId,
  targetId: site.targetId,
  predefinedSiteIds: [site.id],
}))

export function predefinedSiteRightById(siteId: string): PredefinedSite | undefined {
  return PREDEFINED_SITE_RIGHTS.find(site => site.id === siteId)
}
