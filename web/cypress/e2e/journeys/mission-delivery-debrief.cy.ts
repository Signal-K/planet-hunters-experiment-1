// E2E regression coverage for a bug reported in play: two-leg "mine then
// deliver" missions (mine at targetId, drop cargo at deliveryTargetId, then
// fly home) were correctly wired mechanically, but the Debrief screen always
// attributed the Earth-return leg to the original mining site instead of the
// delivery target — so the entire delivery leg silently vanished from the
// player-facing summary, making the courier mechanic feel like it never
// happened. Fixed in GameApp.tsx / app/game/(main)/[screen]/page.tsx by
// resolving the debrief "From X" text from mission.deliveryTargetId when set.

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

function basePlayer(overrides: Partial<GameState['player']> = {}): GameState['player'] {
  return {
    francs: 9_000_000_000,
    activeMission: null,
    missionCount: 3,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 2,
    freeOperations: false,
    clientMissions: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    ...overrides,
  } as GameState['player']
}

function visitDebriefWithState(state: Partial<GameState>) {
  const full: GameState = {
    screen: 'debrief',
    missionId: null,
    targetId: null,
    deliveryTargetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    player: basePlayer(),
    ...state,
  } as GameState

  cy.visit('/game/debrief', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
    },
  })
}

describe('Debrief screen origin attribution for two-leg delivery missions', () => {
  it('attributes the return leg to the delivery target, not the mining site, for a two-leg mission', () => {
    visitDebriefWithState({
      missionId: 'lnm_m3_relay_bennu_vesta',
      targetId: 'bennu',
      deliveryTargetId: 'vesta',
      lastCargo: { iron: 3, carbon: 2 },
    })
    cy.contains('From 4 Vesta', { timeout: 10000 }).should('be.visible')
    cy.contains('From 101955 Bennu').should('not.exist')
  })

  it('resolves the debrief origin from the mission definition, not the injected top-level state field', () => {
    // Deliberately leave top-level deliveryTargetId unset (null) — the fix
    // reads mission.deliveryTargetId via the catalog lookup, so this must
    // still correctly show the delivery target (Eros), not the mining site
    // (Itokawa), proving the origin isn't just echoing back injected state.
    visitDebriefWithState({
      missionId: 'lnm_m3_relay_itokawa_eros',
      targetId: 'itokawa',
      deliveryTargetId: null,
      lastCargo: { nickel: 3 },
    })
    cy.contains('From 433 Eros', { timeout: 10000 }).should('be.visible')
    cy.contains('From 25143 Itokawa').should('not.exist')
  })
})
