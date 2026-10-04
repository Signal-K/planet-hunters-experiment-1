import { describe, it, expect } from 'vitest'
import { resolvePreset, DEV_GROUPS } from './devPresets'
import { presetForMissionRoute, presetForUiRoute } from './devRoutes'
import { MISSIONS } from './data'

// Every key listed in DEV_GROUPS must resolve to a valid preset
const ALL_KEYS = DEV_GROUPS.flatMap(g => g.shots.map(s => s.key))
const FIRST_MISSION = MISSIONS.find(m => m.sequence === 1)!
const TRANSPORT_MISSION = MISSIONS.find(m => m.id === 'lnm_m3_relay_bennu_vesta')!

describe('DEV_GROUPS', () => {
  it('has groups for each agency training stage (SSL-332)', () => {
    const labels = DEV_GROUPS.map(g => g.label)
    expect(labels).toContain('Extraction')
    expect(labels).toContain('Transport')
    expect(labels).toContain('Storage Silo')
    // Post-onboarding story mission (telescope launch) — replayable once
    // free ops + the transit telescope are built.
    expect(labels).toContain('First Satellite Launch')
    expect(labels).toContain('Recent UI')
    expect(labels).toHaveLength(5)
    expect(labels).not.toContain('Mission 2')
  })

  it('every shot key resolves to a non-null preset', () => {
    for (const key of ALL_KEYS) {
      expect(resolvePreset(key), `preset "${key}" should resolve`).not.toBeNull()
    }
  })

  it('every group has a color and at least one shot', () => {
    for (const group of DEV_GROUPS) {
      expect(group.color).toMatch(/^#/)
      expect(group.shots.length).toBeGreaterThan(0)
    }
  })
})

describe('resolvePreset — unknown name', () => {
  it('returns null for unknown preset names', () => {
    expect(resolvePreset('does-not-exist')).toBeNull()
    expect(resolvePreset('')).toBeNull()
  })
})

describe('resolvePreset — Mission 1 arc', () => {
  it('m1-intro: intro screen, empty placed, tutorial on', () => {
    const p = resolvePreset('m1-intro')!
    expect(p.screen).toBe('intro')
    expect(p.player!.placed).toEqual([])
    expect(p.tutorial).toBe(true)
    expect(p.player!.missionsDone).toBe(0)
    expect(p.popup).toBeNull()
  })

  it('m1-hub: hub screen, launchpad placed, step 0 done', () => {
    const p = resolvePreset('m1-hub')!
    expect(p.screen).toBe('hub')
    expect(p.player!.placed).toContain('launchpad')
    expect(p.doneSteps![0]).toBe(true)
    expect(p.doneSteps![1]).toBeUndefined()
    expect(p.player!.missionsDone).toBe(0)
  })

  it('m1-fab: fab screen, generated mission, eros target, Explorer config', () => {
    const p = resolvePreset('m1-fab')!
    expect(p.screen).toBe('fab')
    expect(p.missionId).toBe(FIRST_MISSION.id)
    expect(p.targetId).toBe('eros')
    expect(p.rocket!.chassis).toBe('hull-mk1')
    expect(p.rocket!.propulsion).toBe('ion-a1')
    expect(p.player!.missionsDone).toBe(0)
  })

  it('m1-mining: mining screen with active M1 mission', () => {
    const p = resolvePreset('m1-mining')!
    expect(p.screen).toBe('mining')
    expect(p.missionId).toBe(FIRST_MISSION.id)
    expect(p.player!.activeMission).not.toBeNull()
  })

  it('m1-debrief: debrief screen with first mission cargo in stash and lastCargo', () => {
    const p = resolvePreset('m1-debrief')!
    expect(p.screen).toBe('debrief')
    expect(p.player!.stash).toEqual(FIRST_MISSION.requires.minerals)
    expect(p.lastCargo).toEqual(FIRST_MISSION.requires.minerals)
    expect(p.player!.missionsDone).toBe(0)
  })
})

describe('resolvePreset — Transport arc (two-leg mine-then-deliver)', () => {
  it('transport-hub: missionsDone=1, hub screen, all Extraction steps done, tutorial on', () => {
    const p = resolvePreset('transport-hub')!
    expect(p.screen).toBe('hub')
    expect(p.player!.missionsDone).toBe(1)
    expect(p.tutorial).toBe(true)
    for (const id of [0, 1, 2, 3, 4, 5, 6, 9]) {
      expect(p.doneSteps![id], `step ${id} should be done`).toBe(true)
    }
    // Transport step 30 not yet done (coach should show)
    expect(p.doneSteps![30]).toBeUndefined()
    expect(p.missionId).toBeNull()
    expect(p.deliveryTargetId).toBeNull()
  })

  it('transport-fab: missionsDone=1, fab screen, Belt Courier Run accepted with delivery target set', () => {
    const p = resolvePreset('transport-fab')!
    expect(p.screen).toBe('fab')
    expect(p.player!.missionsDone).toBe(1)
    expect(p.missionId).toBe(TRANSPORT_MISSION.id)
    expect(p.targetId).toBe(TRANSPORT_MISSION.targetId)
    expect(p.deliveryTargetId).toBe(TRANSPORT_MISSION.deliveryTargetId)
    expect(p.rocket!.chassis).toBe('hull-mk2')
  })

  it('transport-mining: missionsDone=1, mining screen with active two-leg mission', () => {
    const p = resolvePreset('transport-mining')!
    expect(p.screen).toBe('mining')
    expect(p.missionId).toBe(TRANSPORT_MISSION.id)
    expect(p.deliveryTargetId).toBe(TRANSPORT_MISSION.deliveryTargetId)
    expect(p.player!.activeMission?.id).toBe(TRANSPORT_MISSION.id)
  })

  it('transport-debrief: debrief screen with two-leg mission cargo and delivery target set', () => {
    const p = resolvePreset('transport-debrief')!
    expect(p.screen).toBe('debrief')
    expect(p.missionId).toBe(TRANSPORT_MISSION.id)
    expect(p.targetId).toBe(TRANSPORT_MISSION.targetId)
    expect(p.deliveryTargetId).toBe(TRANSPORT_MISSION.deliveryTargetId)
    expect(p.lastCargo).toEqual(TRANSPORT_MISSION.requires.minerals)
    expect(p.player!.missionsDone).toBe(1)
  })
})

describe('resolvePreset — Storage Silo arc', () => {
  it('storage-hub: both guided missions done, no silo, still in training', () => {
    const p = resolvePreset('storage-hub')!
    expect(p.screen).toBe('hub')
    expect(p.player!.missionsDone).toBe(2)
    expect(p.player!.placed).not.toContain('surface-silo')
    expect(p.player!.freeOperations).toBe(false)
    expect(p.tutorial).toBe(true)
    expect(p.doneSteps![40]).toBeUndefined()
  })

  it('storage-build: build screen with the hub silo step done', () => {
    const p = resolvePreset('storage-build')!
    expect(p.screen).toBe('build')
    expect(p.player!.missionsDone).toBe(2)
    expect(p.doneSteps![40]).toBe(true)
    expect(p.doneSteps![41]).toBeUndefined()
  })
})

describe('resolvePreset — ship customizer', () => {
  it('opens hangar with the ship customizer unlocked independent of profile state', () => {
    const p = resolvePreset('ship-customizer')!
    expect(p.screen).toBe('hangar')
    expect(p.tutorial).toBe(false)
    expect(p.player!.placed).toContain('launchpad')
    expect(p.player!.unlockedSkillNodes).toContain('ship-customizer-1')
    expect(p.missionId).toBe(TRANSPORT_MISSION.id)
    expect(p.targetId).toBe(TRANSPORT_MISSION.targetId)
  })
})

describe('resolvePreset — hangar assembly', () => {
  it('opens a staged Prospector transfer in the hangar independent of saved profile state', () => {
    const p = resolvePreset('ui-hangar-assembly')!
    expect(p.screen).toBe('hangar')
    expect(p.player!.pendingLaunch).toBe(true)
    expect(p.player!.missionsDone).toBe(1)
    expect(p.rocket!.chassis).toBe('hull-mk2')
  })
})

describe('resolvePreset — recent UI surfaces', () => {
  it('opens the live Mission Board restyle with Free Ops context', () => {
    const p = resolvePreset('ui-mission-board')!
    expect(p.screen).toBe('missions')
    expect(p.player!.freeOperations).toBe(true)
    expect(p.player!.missionsDone).toBe(2)
  })

  it('opens the new Skill Tree with research progress and unlocked nodes', () => {
    const p = resolvePreset('ui-skill-tree')!
    expect(p.screen).toBe('skills')
    expect(p.player!.researchXP).toBeGreaterThan(0)
    expect(p.player!.unlockedSkillNodes).toContain('ship-customizer-1')
  })

  it('opens Target Picker with a real mission loaded', () => {
    const p = resolvePreset('ui-target-picker')!
    expect(p.screen).toBe('targets')
    expect(p.missionId).toBe(TRANSPORT_MISSION.id)
    expect(p.targetId).toBeNull()
  })

  it('opens the TESS discovery console with the satellite built and launched', () => {
    const p = resolvePreset('ui-tess-discovery')!
    expect(p.screen).toBe('galaxy')
    expect(p.player!.transitSatelliteLaunchedAt).not.toBeNull()
  })

  it('opens rover mining with an active mission and live TakeOn state', () => {
    const p = resolvePreset('ui-rover-mining')!
    expect(p.screen).toBe('rover-mining')
    expect(p.player!.activeMission).not.toBeNull()
  })
})

describe('dev shortcut routes', () => {
  it('maps dedicated mission URLs to preset keys', () => {
    expect(presetForMissionRoute(['m1'])).toBe('m1-hub')
    expect(presetForMissionRoute(['m2'])).toBe('transport-hub')
    expect(presetForMissionRoute(['mission2', 'mining'])).toBe('transport-mining')
    expect(presetForMissionRoute(['transport', 'fab'])).toBe('transport-fab')
    expect(presetForMissionRoute(['storage', 'build'])).toBe('storage-build')
    expect(presetForMissionRoute(['m3'])).toBeNull()
    expect(presetForMissionRoute(['telescope', 'transit'])).toBe('telescope-transit')
  })

  it('maps dedicated UI URLs to recent UI preset keys', () => {
    expect(presetForUiRoute(['mission-board'])).toBe('ui-mission-board')
    expect(presetForUiRoute(['skill-tree'])).toBe('ui-skill-tree')
    expect(presetForUiRoute(['ship-customizer'])).toBe('ship-customizer')
    expect(presetForUiRoute(['hangar'])).toBe('ui-hangar-assembly')
  })
})

describe('resolvePreset — no popup leakage', () => {
  it('no preset returns a non-null popup', () => {
    for (const key of ALL_KEYS) {
      const p = resolvePreset(key)!
      expect(p.popup, `"${key}" should have null popup`).toBeNull()
    }
  })
})
