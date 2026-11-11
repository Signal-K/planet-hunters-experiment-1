'use client'

import { useEffect } from 'react'
import type { Player } from '@/lib/game-types'
import type { SaturnCandidate } from '@/lib/data'
import { instrumentDigestDateKey, unresolvedSaturnInstrumentDigest } from '@/lib/systems/InstrumentFeedSystem'

/** Where the science images come from. The service worker keeps these in its own cache (public/sw.js). */
export const SCIENCE_IMAGE_HOST = 'panoptes-uploads.zooniverse.org'

/** Days of Saturn frames to keep on the device ahead of today. */
const DAYS_AHEAD = 7
/** Never ask for more than this many images at once. */
const MAX_IMAGES = 24

/**
 * SSL-828: the frames a Saturn player will open over the next week, so the satellite still works offline: the active
 * frame first, then each day's unanswered frame from today on. Science-host URLs only, no repeats.
 */
export function upcomingSaturnFrames(pool: readonly SaturnCandidate[], player: Pick<Player, 'saturnClassifications' | 'saturnActiveFrameId'>, now = new Date()): string[] {
  const out: string[] = []
  const add = (url: string | undefined) => {
    if (!url || out.includes(url) || out.length >= MAX_IMAGES) return
    try { if (new URL(url).hostname === SCIENCE_IMAGE_HOST) out.push(url) } catch { /* not a URL */ }
  }
  add(pool.find(item => item.id === player.saturnActiveFrameId)?.imageUrl)
  for (let day = 0; day <= DAYS_AHEAD; day++) {
    const key = instrumentDigestDateKey(new Date(now.getTime() + day * 86_400_000))
    for (const frame of unresolvedSaturnInstrumentDigest([...pool], player, key)) add(frame.imageUrl)
  }
  return out
}

/** Asks the service worker to download these images into its science cache. No worker, no request. */
export function precacheScienceImages(urls: readonly string[]): void {
  if (urls.length === 0 || typeof navigator === 'undefined') return
  navigator.serviceWorker?.controller?.postMessage({ type: 'CACHE_SCIENCE', urls })
}

/**
 * SSL-828: once a Saturn player is in the game and online, download the week's frames in the background. Runs again
 * when the satellite launches or a frame is finished, so the cache keeps a week ahead.
 */
export function useSaturnFramePrefetch(player: Player): void {
  const launched = !!player.freeOperations && !!player.saturnImagerLaunchedAt
  const done = Object.keys(player.saturnClassifications ?? {}).length
  useEffect(() => {
    if (!launched || typeof navigator === 'undefined' || !navigator.onLine || !navigator.serviceWorker?.controller) return
    let cancelled = false
    void import('@/lib/saturn-subjects').then(({ fetchReviewableSaturnCandidates }) => fetchReviewableSaturnCandidates()).then(pool => {
      if (!cancelled) precacheScienceImages(upcomingSaturnFrames(pool, player))
    }).catch(() => { /* optional warm-up; a later online visit tries again */ })
    return () => { cancelled = true }
    // Only launch and finished frames move the week's list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launched, done, player.saturnActiveFrameId])
}
