/**
 * Suite return rail (SSL-296): outbound hops from Landnam back to the SSC
 * garden hub and Spectra Outpost. Hop ids mirror the SSC hop catalog
 * (`ssc.hop.garden`, `ssc.hop.spectra`).
 *
 * No guest links: both destinations sit behind the same Clerk identity, so
 * the hop only carries a `from` marker, never credentials or user ids.
 */

export type SuiteHopId = 'ssc.hop.garden' | 'ssc.hop.spectra'

export interface SuiteHop {
  id: SuiteHopId
  label: string
  caption: string
  href: string
}

export const SUITE_GARDEN_URL = 'https://starsailors.space/game'

const SUITE_HOP_SOURCE = 'landnam'

function isHttpsUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function withHopSource(href: string, hopId: SuiteHopId): string {
  const url = new URL(href)
  url.searchParams.set('from', SUITE_HOP_SOURCE)
  url.searchParams.set('hop', hopId)
  return url.toString()
}

export function getSuiteHops(spectraUrl: string | undefined = process.env.NEXT_PUBLIC_SPECTRA_URL): SuiteHop[] {
  const hops: SuiteHop[] = [
    {
      id: 'ssc.hop.garden',
      label: 'GARDEN',
      caption: 'Back to your Star Sailors garden',
      href: withHopSource(SUITE_GARDEN_URL, 'ssc.hop.garden'),
    },
  ]
  if (isHttpsUrl(spectraUrl)) {
    hops.push({
      id: 'ssc.hop.spectra',
      label: 'SPECTRA',
      caption: 'Visit Spectra Outpost',
      href: withHopSource(spectraUrl, 'ssc.hop.spectra'),
    })
  }
  return hops
}

/** Light identity signal: informational only, no second economy. */
export function gardenCampLabel(signedIn: boolean): string | null {
  return signedIn ? 'SAME ACCOUNT' : null
}
