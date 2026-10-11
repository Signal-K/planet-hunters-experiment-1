import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/posthog', () => ({ captureGameEvent: vi.fn() }))
vi.mock('@/lib/surveys', () => ({ enqueueSurvey: vi.fn() }))

import { badgeShareText, shareBadge, SHARE_SITE_URL } from './share'
import { enqueueSurvey } from '@/lib/surveys'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('shareBadge', () => {
  it('tags the shared link with UTM parameters', () => {
    const url = new URL(SHARE_SITE_URL)
    expect(url.origin).toBe('https://playlandnam.space')
    expect(url.searchParams.get('utm_source')).toBe('badge_share')
    expect(url.searchParams.get('utm_medium')).toBe('share')
    expect(url.searchParams.get('utm_campaign')).toBe('sky_event_badge')
  })

  it('uses navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })
    expect(await shareBadge('Orionids', 'gold')).toBe('shared')
    expect(share).toHaveBeenCalledWith({ title: 'Landnam: Space Program', text: badgeShareText('Orionids', 'gold'), url: SHARE_SITE_URL })
    expect(enqueueSurvey).toHaveBeenCalledWith('lnm_badge_shared', 2500)
  })

  it('falls back to copying text and link to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await shareBadge('Orionids', 'silver')).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(`${badgeShareText('Orionids', 'silver')} ${SHARE_SITE_URL}`)
  })

  it('reports failure and asks no survey when the share sheet is dismissed', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')) })
    expect(await shareBadge('Orionids', 'gold')).toBe('failed')
    expect(enqueueSurvey).not.toHaveBeenCalled()
  })
})
