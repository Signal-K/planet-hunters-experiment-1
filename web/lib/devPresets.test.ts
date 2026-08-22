import { describe, it, expect } from 'vitest'
import { resolvePreset, DEV_GROUPS } from './devPresets'
import { presetForMissionRoute, presetForUiRoute } from './devRoutes'
import { MISSIONS } from './data'

// Every key listed in DEV_GROUPS must resolve to a valid preset
const ALL_KEYS = DEV_GROUPS.flatMap(g => g.shots.map(s => s.key))
const FIRST_MISSION = MISSIONS.find(m => m.sequence === 1)!
const SECOND_MISSION = MISSIONS.find(m => m.sequence === 2)!
const THIRD_MISSION = MISSIONS.find(m => m.id === 'lnm_m3_relay_bennu_vesta')!

describe('DEV_GROUPS', () => {
  it('has groups for the currently active onboarding missions', () => {
    const labels = DEV_GROUPS.map(g => g.label)
    expect(labels).toContain('Mission 1')
    expect(labels).toContain('Mission 2')
    // M3 (the two-leg "mine then deliver" client pick) shipped this
    // sprint, so it must be replayable via the DEV panel like M1/M2.
    expect(labels).toContain('Mission 3')
    // Post-onboarding story mission (telescope launch) — replayable once
    // free ops + the transit telescope are built.
    expect(labels).toContain('First Satellite Launch')
    expect(labels).toContain('Recent UI')
    expect(labels).toHaveLength(5)
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

describe('resolvePreset — Mission 2 arc', () => {
  it('m2-hub: missionsDone=1, hub screen, all M1 steps done, tutorial on', () => {
    const p = resolvePreset('m2-hub')!
    expect(p.screen).toBe('hub')
    expect(p.player!.missionsDone).toBe(1)
    expect(p.tutorial).toBe(true)
    // All M1 coach steps should be marked done
    for (const id of [0, 1, 2, 3, 4, 5, 6, 9]) {
      expect(p.doneSteps![id], `step ${id} should be done`).toBe(true)
    }
    // M2 step 20 not yet done (coach should show)
    expect(p.doneSteps![20]).toBeUndefined()
  })

  it('m2-rocket-buy: missionsDone=1, rocket purchase screen, M2 mission + eros', () => {
    const p = resolvePreset('m2-rocket-buy')!
    expect(p.screen).toBe('rocket-buy')
    expect(p.player!.missionsDone).toBe(1)
    expect(p.missionId).toBe(SECOND_MISSION.id)
    expect(p.targetId).toBe('eros')
    expect(p.rocket!.chassis).toBe('hull-mk1')
    expect(p.rocket!.propulsion).toBe('ion-a1')
    expect(p.rocket!.drill).toBe('hand-drill')
    expect(p.doneSteps![20]).toBe(true)
    expect(p.doneSteps![21]).toBeUndefined()
  })

  it('m2-fab: missionsDone=1, fab screen after Prospector purchase, M2 mission + eros', () => {
    const p = resolvePreset('m2-fab')!
    expect(p.screen).toBe('fab')
    expect(p.player!.missionsDone).toBe(1)
    expect(p.missionId).toBe(SECOND_MISSION.id)
    expect(p.targetId).toBe('eros')
    expect(p.rocket!.chassis).toBe('hull-mk2')
    expect(p.rocket!.propulsion).toBe('fusion-b2')
    expect(p.rocket!.drill).toBe('laser-t2')
    // Steps 20 and 21 are done before arriving at the post-purchase fab screen.
    expect(p.doneSteps![20]).toBe(true)
    expect(p.doneSteps![21]).toBe(true)
  })

  it('m2-mining: missionsDone=1, mining screen with active M2 mission', () => {
    const p = resolvePreset('m2-mining')!
    expect(p.screen).toBe('mining')
    expect(p.missionId).toBe(SECOND_MISSION.id)
    expect(p.player!.activeMission?.id).toBe(SECOND_MISSION.id)
  })

  it('m2-post-debrief: hub screen with second mission cargo retained in stash', () => {
    const p = resolvePreset('m2-post-debrief')!
    expect(p.screen).toBe('hub')
    expect(p.player!.stash).toEqual(SECOND_MISSION.requires.minerals)
    expect(p.lastCargo).toEqual(SECOND_MISSION.requires.minerals)
    expect(p.player!.missionsDone).toBe(1)
  })
})

describe('resolvePreset — Mission 3 arc (two-leg mine-then-deliver)', () => {
  it('m3-hub: missionsDone=2, hub screen, all M1+M2 steps done, tutorial on', () => {
    const p = resolvePreset('m3-hub')!
    expect(p.screen).toBe('hub')
    expect(p.player!.missionsDone).toBe(2)
    expect(p.tutorial).toBe(true)
    for (const id of [0, 1, 2, 3, 4, 5, 6, 9, 20, 21]) {
      expect(p.doneSteps![id], `step ${id} should be done`).toBe(true)
    }
    // M3 step 30 not yet done (coach should show)
    expect(p.doneSteps![30]).toBeUndefined()
    expect(p.missionId).toBeNull()
    expect(p.deliveryTargetId).toBeNull()
  })

  it('m3-fab: missionsDone=2, fab screen, Belt Courier Run accepted with delivery target set', () => {
    const p = resolvePreset('m3-fab')!
    expect(p.screen).toBe('fab')
    expect(p.player!.missionsDone).toBe(2)
    expect(p.missionId).toBe(THIRD_MISSION.id)
    expect(p.targetId).toBe(THIRD_MISSION.targetId)
    expect(p.deliveryTargetId).toBe(THIRD_MISSION.deliveryTargetId)
    expect(p.rocket!.chassis).toBe('hull-mk2')
  })

  it('m3-mining: missionsDone=2, mining screen with active two-leg mission', () => {
    const p = resolvePreset('m3-mining')!
    expect(p.screen).toBe('mining')
    expect(p.missionId).toBe(THIRD_MISSION.id)
    expect(p.deliveryTargetId).toBe(THIRD_MISSION.deliveryTargetId)
    expect(p.player!.activeMission?.id).toBe(THIRD_MISSION.id)
  })

  it('m3-debrief: debrief screen with two-leg mission cargo and delivery target set', () => {
    const p = resolvePreset('m3-debrief')!
    expect(p.screen).toBe('debrief')
    expect(p.missionId).toBe(THIRD_MISSION.id)
    expect(p.targetId).toBe(THIRD_MISSION.targetId)
    expect(p.deliveryTargetId).toBe(THIRD_MISSION.deliveryTargetId)
    expect(p.lastCargo).toEqual(THIRD_MISSION.requires.minerals)
    expect(p.player!.missionsDone).toBe(2)
  })
})

describe('resolvePreset — ship customizer', () => {
  it('opens hangar with the ship customizer unlocked independent of profile state', () => {
    const p = resolvePreset('ship-customizer')!
    expect(p.screen).toBe('hangar')
    expect(p.tutorial).toBe(false)
    expect(p.player!.placed).toContain('launchpad')
    expect(p.player!.unlockedSkillNodes).toContain('ship-customizer-1')
    expect(p.missionId).toBe(SECOND_MISSION.id)
    expect(p.targetId).toBe('eros')
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
    expect(p.missionId).toBe(THIRD_MISSION.id)
    expect(p.targetId).toBeNull()
  })

  it('opens the TESS discovery console with the satellite built and launched', () => {
    const p = resolvePreset('ui-tess-discovery')!
    expect(p.screen).toBe('galaxy')
    expect(p.player!.transitSatelliteLaunchedAt).not.toBeNull()
  })

  it('opens rover mining with an active mission and timer state', () => {
    const p = resolvePreset('ui-rover-mining')!
    expect(p.screen).toBe('rover-mining')
    expect(p.player!.activeMission).not.toBeNull()
    expect(p.player!.roverMiningStartedAt).toBeGreaterThan(0)
    expect(p.player!.roverTerrainClassifications).toBeDefined()
  })
})

describe('dev shortcut routes', () => {
  it('maps dedicated mission URLs to preset keys', () => {
    expect(presetForMissionRoute(['m1'])).toBe('m1-hub')
    expect(presetForMissionRoute(['m2', 'rocket'])).toBe('m2-rocket-buy')
    expect(presetForMissionRoute(['m3', 'mining'])).toBe('m3-mining')
    expect(presetForMissionRoute(['telescope', 'transit'])).toBe('telescope-transit')
  })

  it('maps dedicated UI URLs to recent UI preset keys', () => {
    expect(presetForUiRoute(['mission-board'])).toBe('ui-mission-board')
    expect(presetForUiRoute(['skill-tree'])).toBe('ui-skill-tree')
    expect(presetForUiRoute(['ship-customizer'])).toBe('ship-customizer')
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
