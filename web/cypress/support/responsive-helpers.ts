/**
 * Responsive testing helpers
 * Test the same flow across multiple viewports to catch layout breakage
 */

export const VIEWPORTS = {
  mobile: { name: 'mobile', width: 390, height: 844 },
  tablet: { name: 'tablet', width: 768, height: 1024 },
  desktop: { name: 'desktop', width: 1440, height: 900 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

/**
 * Test a URL/flow at multiple viewports
 * Usage:
 *   testAcrossViewports('/game', (vp) => {
 *     cy.get('[data-testid="hub-terrain"]').should('be.visible')
 *     cy.screenshot(`hub-${vp}`)
 *   })
 */
export function testAcrossViewports(
  url: string,
  testFn: (viewport: ViewportName) => void,
  viewportNames: ViewportName[] = ['mobile', 'tablet', 'desktop']
) {
  viewportNames.forEach(vpName => {
    const vp = VIEWPORTS[vpName];
    cy.viewport(vp.width, vp.height);
    cy.visit(url);
    testFn(vpName);
  });
}

/**
 * Assert that an element is visible at all viewports
 */
export function shouldBeVisibleAtAllViewports(selector: string) {
  Object.values(VIEWPORTS).forEach(vp => {
    cy.viewport(vp.width, vp.height);
    cy.get(selector, { timeout: 5000 }).should('be.visible');
  });
}

/**
 * Setup game state for responsive testing
 */
export function setupGameState(state: Record<string, any>) {
  cy.visit('/game', {
    onBeforeLoad(win) {
      win.localStorage.setItem('landnam-game-state-v1', JSON.stringify(state));
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({
        email: 'responsive-test@example.com',
        password: 'test-password',
      }));
      win.localStorage.setItem('landnam-surveys-shown', JSON.stringify([
        'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
        'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
      ]));
      win.localStorage.setItem('landnam-upgrade-prompt-snooze-until',
        String(Date.now() + 365 * 24 * 60 * 60 * 1000));
    },
  });
}

/**
 * Base player state for responsive tests
 */
export const BASE_RESPONSIVE_STATE = {
  screen: 'hub',
  player: {
    francs: 10_000_000_000,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 2,
    skillPoints: 0,
    unlockedSkillNodes: [],
    freeOperations: false,
    clientMissions: {},
    clientStreaks: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryUnlocked: false,
    refineryUnlockNotified: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    seen_planets: [],
    roverDeployments: [],
    clientTerritories: {},
  },
  missionId: null,
  targetId: null,
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  lastCargo: null,
  tutorial: false,
  doneSteps: {},
  popup: null,
  menuOpen: false,
};
