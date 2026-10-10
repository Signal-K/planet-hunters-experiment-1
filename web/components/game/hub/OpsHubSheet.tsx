'use client'

import { useEffect, useState } from 'react'
import type { Player, Screen } from '@/lib/game-types'
import { CRAFTING_RECIPES, REFINERY_RECIPES, STRUCTURES, TARGETS, surfaceSiteById } from '@/lib/data'
import { formatCountdown } from '@/lib/format'
import { missionResumeScreen } from '@/lib/mission-resume'
import { isUnderConstruction, structureBuildMs } from '@/lib/systems/HubConstructionSystem'
import styles from './OpsHubSheet.module.css'

type BuildingState = 'idle' | 'working' | 'upgrading' | 'broken'

interface OpsRow {
  id: string
  location: string
  name: string
  level: number
  state: BuildingState
  detail: string
  open: () => void
}

interface OpsProcess {
  id: string
  name: string
  detail: string
  open: () => void
}

function structureName(kind: string): string {
  return STRUCTURES.find(item => item.id === kind || item.kind === kind)?.name ?? kind.replace(/-/g, ' ')
}

function bodyName(id: string): string {
  return TARGETS.find(target => target.id === id)?.name ?? surfaceSiteById(id)?.name ?? id.replace(/-/g, ' ')
}

function remaining(ms: number): string {
  return ms > 0 ? formatCountdown(ms) : 'DUE'
}

export default function OpsHubSheet({
  player,
  downlinkCount = 0,
  onClose,
  onOpenScene,
  onFocusBuilding,
}: {
  player: Player
  downlinkCount?: number
  onClose: () => void
  onOpenScene: (screen: Screen) => void
  onFocusBuilding: (kind: string) => void
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const go = (screen: Screen) => onOpenScene(screen)
  const focus = (kind: string) => onFocusBuilding(kind)
  const rows: OpsRow[] = []
  const processes: OpsProcess[] = []

  const earthKinds = Array.from(new Set([...(player.placed ?? []), ...Object.keys(player.underConstruction ?? {})]))
  for (const kind of earthKinds) {
    const startedAt = player.underConstruction?.[kind]
    const upgrading = isUnderConstruction(startedAt, kind, now)
    const left = startedAt != null ? Math.max(0, structureBuildMs(kind) - (now - startedAt)) : 0
    rows.push({
      id: `earth-${kind}`,
      location: 'Earth',
      name: structureName(kind),
      level: kind === 'launchpad' && player.launchpadUpgraded ? 2 : 1,
      state: upgrading ? 'upgrading' : 'idle',
      detail: upgrading ? remaining(left) : 'Standing',
      open: () => (kind === 'refinery' ? go('refinery') : focus(kind)),
    })
    if (upgrading) {
      processes.push({
        id: `build-${kind}`,
        name: `Build · ${structureName(kind)}`,
        detail: remaining(left),
        open: () => focus(kind),
      })
    }
  }

  if (player.transitSatelliteLaunchedAt) {
    rows.push({ id: 'orbit-tess', location: 'Orbit', name: 'Transit telescope', level: 1, state: player.activeScan ? 'working' : 'idle', detail: 'Owned instrument', open: () => go('instrument-hub') })
  }
  if (player.deepSpaceTelescopeLaunchedAt || player.deepSpaceTelescopeBuilt) {
    rows.push({ id: 'orbit-deep', location: 'Orbit', name: 'Deep space telescope', level: 1, state: downlinkCount > 0 ? 'working' : 'idle', detail: 'Owned instrument', open: () => go('instrument-hub') })
  }
  if (player.saturnImagerLaunchedAt) {
    rows.push({ id: 'orbit-saturn', location: 'Orbit', name: 'Saturn imager', level: 1, state: 'idle', detail: 'Owned instrument', open: () => go('instrument-hub') })
  }

  for (const structure of player.clientStructures ?? []) {
    const state: BuildingState = structure.state === 'under-construction' ? 'upgrading' : 'idle'
    rows.push({
      id: `client-${structure.targetId}-${structure.structureKind}`,
      location: bodyName(structure.targetId),
      name: structureName(structure.structureKind),
      level: 1,
      state,
      detail: structure.state === 'operational' ? 'Operational' : structure.state.replace(/-/g, ' '),
      open: () => go('surface-ops'),
    })
  }

  for (const [targetId, structures] of Object.entries(player.fieldStructures ?? {})) {
    for (const structure of structures) {
      const recipe = CRAFTING_RECIPES.find(item => item.id === structure.recipeId)
      rows.push({
        id: `field-${structure.id}`,
        location: bodyName(targetId),
        name: recipe?.name ?? structure.type.replace(/-/g, ' '),
        level: 1,
        state: 'idle',
        detail: 'Field structure',
        open: () => go('surface-ops'),
      })
    }
  }

  for (const [siteId, site] of Object.entries(player.surfaceOps?.sites ?? {})) {
    const ferry = site.ferry
    const broken = ferry?.status === 'failed'
    const location = bodyName(siteId)
    if (site.launchpad || site.siteAccessPurchasedAt) {
      rows.push({
        id: `site-${siteId}`,
        location,
        name: surfaceSiteById(siteId)?.name ?? 'Surface site',
        level: site.launchpad ? 1 : 1,
        state: broken ? 'broken' : ferry?.status === 'in-flight' ? 'working' : 'idle',
        detail: broken ? 'Ferry failed' : site.launchpad ? 'Settlement' : 'Site access',
        open: () => go('surface-ops'),
      })
    }
    if (ferry?.status === 'in-flight') {
      processes.push({
        id: `ferry-${siteId}`,
        name: `Transport · ${location}`,
        detail: remaining(Math.max(0, ferry.arrivesAt - now)),
        open: () => go('surface-ops'),
      })
    }
  }

  if (player.activeMission) {
    const phase = player.missionPhase ?? 'transit'
    const eta = player.arrivalAt != null && phase === 'transit' ? remaining(Math.max(0, player.arrivalAt - now)) : phase
    processes.push({
      id: 'mission',
      name: player.activeMission.label,
      detail: eta,
      open: () => go(missionResumeScreen(player, now)),
    })
  }

  for (const job of player.refineryQueue ?? []) {
    const recipe = REFINERY_RECIPES.find(item => item.id === job.recipeId)
    const left = job.durationMs != null ? Math.max(0, job.startedAt + job.durationMs - now) : 0
    processes.push({
      id: `refine-${job.recipeId}-${job.startedAt}`,
      name: `Refining · ${recipe?.name ?? job.recipeId}`,
      detail: job.durationMs != null ? remaining(left) : 'In progress',
      open: () => go('refinery'),
    })
  }

  if (player.activeScan) {
    processes.push({
      id: 'scan',
      name: 'Telescope scan',
      detail: bodyName(player.activeScan.targetId),
      open: () => go('instrument-hub'),
    })
  }

  if (downlinkCount > 0) {
    processes.push({
      id: 'downlink',
      name: 'Telescope downlink',
      detail: `${downlinkCount} ready`,
      open: () => go('instrument-hub'),
    })
  }

  const locations = Array.from(new Set(rows.map(row => row.location)))

  return (
    <section className={`theme-light ${styles.sheet}`} data-testid="ops-hub-sheet" aria-label="Operations">
      <div className={styles.head}>
        <div>
          <div className={styles.kicker}>Menu · every site</div>
          <h2>Ops</h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose}>Close</button>
      </div>

      <div className={styles.group}>
        <h3>Processes</h3>
        {processes.length === 0 && <p className={styles.empty}>Nothing is running.</p>}
        {processes.map(process => (
          <button key={process.id} type="button" className={styles.row} onClick={process.open}>
            <i className={styles.mark} data-state="working" />
            <span className={styles.copy}><strong>{process.name}</strong><span>{process.detail}</span></span>
            <span className={styles.state} data-state="working">Open</span>
          </button>
        ))}
      </div>

      {locations.length === 0 && <p className={styles.empty}>No buildings yet. Build at the Base, or open a site from Free Ops.</p>}
      {locations.map(location => (
        <div key={location} className={styles.group}>
          <h3>{location}</h3>
          {rows.filter(row => row.location === location).map(row => (
            <button key={row.id} type="button" className={styles.row} onClick={row.open}>
              <i className={styles.mark} data-state={row.state} />
              <span className={styles.copy}>
                <strong>{row.name} · L{row.level}</strong>
                <span>{row.detail}</span>
              </span>
              <span className={styles.state} data-state={row.state}>{row.state}</span>
            </button>
          ))}
        </div>
      ))}
    </section>
  )
}
