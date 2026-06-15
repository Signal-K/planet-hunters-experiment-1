import { describe, it, expect } from 'vitest'
import { resolvePreset, DEV_GROUPS } from './devPresets'

// Every key listed in DEV_GROUPS must resolve to a valid preset
const ALL_KEYS = DEV_GROUPS.flatMap(g => g.shots.map(s => s.key))

describe('DEV_GROUPS', () => {
  it('has at least one group per tutorial mission plus free ops', () => {
    const labels = DEV_GROUPS.map(g => g.label)
    expect(labels).toContain('Mission 1')
    expect(labels).toContain('Mission 2')
    expect(labels).toContain('Mission 3')
    expect(labels).toContain('Free Ops')
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

  it('m1-fab: fab screen, m1-iron mission, eros target, SR1 config', () => {
    const p = resolvePreset('m1-fab')!
    expect(p.screen).toBe('fab')
    expect(p.missionId).toBe('m1-iron')
    expect(p.targetId).toBe('eros')
    expect(p.rocket!.chassis).toBe('hull-mk1')
    expect(p.rocket!.propulsion).toBe('ion-a1')
    expect(p.player!.missionsDone).toBe(0)
  })

  it('m1-mining: mining screen with active M1 mission', () => {
    const p = resolvePreset('m1-mining')!
    expect(p.screen).toBe('mining')
    expect(p.missionId).toBe('m1-iron')
    expect(p.player!.activeMission).not.toBeNull()
  })

  it('m1-debrief: debrief screen with 6 iron in stash and lastCargo', () => {
    const p = resolvePreset('m1-debrief')!
    expect(p.screen).toBe('debrief')
    expect(p.player!.stash).toEqual({ iron: 6 })
    expect(p.lastCargo).toEqual({ iron: 6 })
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

  it('m2-fab: missionsDone=1, fab screen, SR2 config, M2 mission + eros', () => {
    const p = resolvePreset('m2-fab')!
    expect(p.screen).toBe('fab')
    expect(p.player!.missionsDone).toBe(1)
    expect(p.missionId).toBe('m2-silicon')
    expect(p.targetId).toBe('eros')
    expect(p.rocket!.chassis).toBe('hull-mk2')
    expect(p.rocket!.propulsion).toBe('fusion-b2')
    expect(p.rocket!.drill).toBe('laser-t2')
    // Step 20 done (hub coach seen), step 21 not yet (fab coach should show)
    expect(p.doneSteps![20]).toBe(true)
    expect(p.doneSteps![21]).toBeUndefined()
  })

  it('m2-mining: missionsDone=1, mining screen with active M2 mission', () => {
    const p = resolvePreset('m2-mining')!
    expect(p.screen).toBe('mining')
    expect(p.missionId).toBe('m2-silicon')
    expect(p.player!.activeMission?.id).toBe('m2-silicon')
  })

  it('m2-market: market screen with 8 silicon in stash', () => {
    const p = resolvePreset('m2-market')!
    expect(p.screen).toBe('market')
    expect(p.player!.stash).toEqual({ silicon: 8 })
    expect(p.lastCargo).toEqual({ silicon: 8 })
    expect(p.player!.missionsDone).toBe(1)
  })
})

describe('resolvePreset — Mission 3 arc', () => {
  it('m3-hub: missionsDone=2, hub, control station built', () => {
    const p = resolvePreset('m3-hub')!
    expect(p.screen).toBe('hub')
    expect(p.player!.missionsDone).toBe(2)
    expect(p.player!.controlBuilt).toBe(true)
    expect(p.player!.placed).toContain('control')
  })

  it('m3-fab: missionsDone=2, fab, M3 mission', () => {
    const p = resolvePreset('m3-fab')!
    expect(p.screen).toBe('fab')
    expect(p.player!.missionsDone).toBe(2)
    expect(p.missionId).toBe('m3-nickel-cobalt')
    expect(p.targetId).toBe('belt')
  })
})

describe('resolvePreset — Free Ops', () => {
  it('freeops: missionsDone=3, freeOperations=true, all buildings', () => {
    const p = resolvePreset('freeops')!
    expect(p.screen).toBe('hub')
    expect(p.player!.missionsDone).toBe(3)
    expect(p.player!.freeOperations).toBe(true)
    expect(p.player!.placed).toContain('satellite')
    expect(p.player!.placed).toContain('refinery')
    expect(p.tutorial).toBe(false)
  })
})

describe('resolvePreset — no popup or buildGate leakage', () => {
  it('no preset returns a non-null popup', () => {
    for (const key of ALL_KEYS) {
      const p = resolvePreset(key)!
      expect(p.popup, `"${key}" should have null popup`).toBeNull()
    }
  })
})
