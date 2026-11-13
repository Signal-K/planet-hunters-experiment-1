'use client'

import { useEffect, useState } from 'react'
import { fetchSite } from './client'
import { buildSiteView, siteProjectKey, type SiteView } from './site'

export interface SiteState { site: SiteView | null; archived: SiteView | null }

/** Dev stage only: these fixtures show a fixed Community Site without an account. */
const FIXTURE_PRESETS = new Set(['ui-community-research-site'])

function fixture(now: number): SiteState | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null
  if (!FIXTURE_PRESETS.has(new URLSearchParams(window.location.search).get('preset') ?? '')) return null
  const last = new Date(now)
  last.setUTCDate(1); last.setUTCMonth(last.getUTCMonth() - 1)
  return {
    // A late joiner: the community is at the Frame stage and this player has added a little to each part.
    site: buildSiteView(siteProjectKey(now), 'spaceport-launch-site', { structure: 1630, systems: 410, instrument: 120, data: 655 }, { structure: 12, systems: 10, data: 5 }),
    archived: buildSiteView(siteProjectKey(last.getTime()), 'observatory-instrument', { structure: 1200, systems: 400, instrument: 380, data: 1200 }, { structure: 40 }, true),
  }
}

/** The month's Community Site, read once when the screen opens (one request, no polling). */
export function useSite(active: boolean): SiteState {
  const [state, setState] = useState<SiteState>({ site: null, archived: null })
  useEffect(() => {
    if (!active) return
    const demo = fixture(Date.now())
    if (demo) { setState(demo); return }
    let live = true
    fetchSite()
      .then(res => { if (live) setState({ site: res.site, archived: res.archived ?? null }) })
      .catch(() => { /* offline or signed out: the site simply does not show */ })
    return () => { live = false }
  }, [active])
  return state
}
