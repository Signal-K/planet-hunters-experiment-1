import { PRODUCT_NAME } from '@/lib/brand'
import { captureGameEvent } from '@/lib/posthog'
import { enqueueSurvey } from '@/lib/surveys'

// Same URL and wording as native (native/App/Screens/SkyEventChip.swift).
export const SHARE_SITE_URL = 'https://playlandnam.space/?utm_source=badge_share&utm_medium=share&utm_campaign=sky_event_badge'

export function badgeShareText(eventName: string, tier: 'gold' | 'silver'): string {
  return `I earned the ${tier === 'gold' ? 'Gold' : 'Silver'} ${eventName} badge in ${PRODUCT_NAME}.`
}

export type ShareResult = 'shared' | 'copied' | 'failed'

export async function shareBadge(eventName: string, tier: 'gold' | 'silver'): Promise<ShareResult> {
  const text = badgeShareText(eventName, tier)
  let result: ShareResult = 'failed'
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title: PRODUCT_NAME, text, url: SHARE_SITE_URL })
      result = 'shared'
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${text} ${SHARE_SITE_URL}`)
      result = 'copied'
    }
  } catch {
    // Dismissing the share sheet rejects with AbortError; that is not a share.
    result = 'failed'
  }
  if (result !== 'failed') {
    captureGameEvent('badge_shared', { method: result, tier })
    enqueueSurvey('lnm_badge_shared', 2500)
  }
  return result
}
