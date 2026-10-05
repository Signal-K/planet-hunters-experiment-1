import { assertOnHome } from '../../support/home-helpers'
import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'

const VIEWPORTS = [
  { name: 'compact portrait', width: 375, height: 667 },
  { name: 'standard portrait', width: 390, height: 844 },
  { name: 'tablet portrait', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
] as const

type StateOverride = Omit<Partial<GameState>, 'player'> & {
  player?: Partial<GameState['player']>
}

function fullState(overrides: StateOverride = {}): GameState {
  const player: GameState['player'] = {
    francs: 10_000_000_000,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 1 },
    controlBuilt: false,
    missionsDone: 0,
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
    ...overrides.player,
  }

  return {
    screen: 'hub',
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: true,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    ...overrides,
    player,
  }
}

/** /game resumes signed-in players to Earth Base; in-flight mission screens
 *  are opened from their own route. */
function visitWithState(state: GameState) {
  cy.visit(state.screen === 'fab' ? '/game/fab' : '/game', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      seedFixtureSession(win)
    },
  })
}

function rectsIntersect(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function assertGameplayButtonsAvoidCoachBlock() {
  cy.get('[data-testid="flight-plan"]').should('be.visible').then($coach => {
    const coachRect = $coach[0].getBoundingClientRect()

    cy.get('.portrait-canvas button').each($button => {
      const button = $button[0] as HTMLButtonElement
      if ($button.closest('[data-testid="flight-plan"]').length > 0) return

      const style = getComputedStyle(button)
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return

      const rect = button.getBoundingClientRect()
      const label = button.dataset.testid ?? button.textContent?.trim() ?? button.outerHTML
      expect(
        rectsIntersect(rect, coachRect),
        `${label} must stay out of tutorial rail (${Math.round(coachRect.top)}-${Math.round(coachRect.bottom)})`
      ).to.equal(false)
    })
  })
}

function openContracts() {
  assertOnHome(10000)
  // The shared loop switch is the contracts entry at every width. The
  // launchpad's "View Missions" callout is hidden while the Flight Plan is up.
  cy.get('[data-testid="home-bar-switch"]').click()
  cy.get('[data-testid="mission-board-section-client"]', { timeout: 10000 }).should('be.visible')
}

describe('Tutorial rail regression', () => {
  for (const viewport of VIEWPORTS) {
    describe(viewport.name, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height)
      })

      it('keeps missions nav and other gameplay buttons out of the tutorial rail', () => {
        visitWithState(fullState({
          screen: 'hub',
          tutorial: true,
          doneSteps: { 0: true },
        }))

        cy.get('[data-testid="flight-plan"]').should('contain', 'Open client contracts')

        // The retired desktop sidebar must stay gone; the shared loop switch
        // action is the one persistent way into Missions at every width.
        cy.get('[data-testid="sidebar-nav-missions"]').should('not.exist')
        cy.get('[data-testid="home-bar-switch"]').should('be.visible')

        assertGameplayButtonsAvoidCoachBlock()
      })

      it('keeps mission board actions below the tutorial rail', () => {
        visitWithState(fullState({
          screen: 'hub',
          tutorial: true,
          doneSteps: { 0: true, 1: true },
        }))
        openContracts()

        cy.get('[data-testid="flight-plan"]').should('contain', 'Accept a mining contract')
        cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').should('be.visible')
        assertGameplayButtonsAvoidCoachBlock()
      })

      it('keeps target picker and continue actions below the tutorial rail', () => {
        visitWithState(fullState({
          screen: 'hub',
          tutorial: true,
          doneSteps: { 0: true, 1: true },
        }))
        openContracts()
        cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').click()

        cy.get('[data-testid="prepare-launch-btn"], [data-testid="launch-btn"]').should('be.visible')
        assertGameplayButtonsAvoidCoachBlock()
      })

      // KES-192: onboarding coaching must never use amber as a panel accent
      // (CLAUDE.md / design-language doc: "never a panel accent... or generic
      // UI chrome"). The target map no longer wraps the map in a
      // Flight Plan is the only onboarding accent and must not be amber.
      it('coaches the target map without an amber accent (KES-192)', () => {
        visitWithState(fullState({
          screen: 'hub',
          tutorial: true,
          doneSteps: { 0: true, 1: true },
        }))
        openContracts()
        cy.get('[data-testid="mission-accept-generated-s1-starter-bulk-1"]').click()

        cy.get('[data-testid="flight-plan"]').should('be.visible').then($coach => {
          const style = getComputedStyle($coach[0])
          expect(style.borderTopColor).not.to.equal('rgb(245, 166, 35)')
          expect(style.outlineColor).not.to.equal('rgb(245, 166, 35)')
        })
      })

      it('keeps manual rocket assembly onboarding out of launch controls', () => {
        visitWithState(fullState({
          screen: 'fab',
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'mars',
          tutorial: true,
          doneSteps: { 0: true, 1: true, 2: true, 3: true },
        }))

        cy.get('[data-testid="flight-plan"]').should('contain', 'Open client contracts')
        cy.get('[data-testid="launch-btn"]').should('be.visible')
        assertGameplayButtonsAvoidCoachBlock()
      })

      it('skip from build leaves missions selectable and the starter launchpad available', () => {
        visitWithState(fullState({
          screen: 'build',
          tutorial: true,
          doneSteps: {},
          player: {
            placed: [],
            placementPlots: {},
          },
        }))

        cy.get('[data-testid="flight-plan"]').should('contain', 'Open client contracts')
        cy.get('[data-testid="flight-plan-objective"]').click()
        cy.get('[data-testid="flight-plan-skip"]').click()
        cy.get('[data-testid="flight-plan"]').should('not.exist')
        // Skipping does not place anything: the player stays on Build and can
        // still place the starter launchpad themselves.
        cy.get('[data-testid="build-place-screen"]').should('be.visible')
        cy.get('[data-testid="build-plot-0"]').click()
        cy.get('[data-testid="build-place-confirm"]').click()
        cy.get('[data-testid="building-launchpad"]', { timeout: 15000 }).should('be.visible')
        // The shared loop switch is the way into contracts at every width.
        cy.get('[data-testid="home-bar-switch"]').click()
        cy.get('[data-testid^="mission-accept-"]').first().should('be.visible').click()
        cy.get('[data-testid="prepare-launch-btn"], [data-testid="launch-btn"]').should('be.visible')
      })
    })
  }
})
