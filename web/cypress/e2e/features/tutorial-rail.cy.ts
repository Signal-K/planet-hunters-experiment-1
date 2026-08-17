import type { GameState } from '@/game-context'

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

function visitWithState(state: GameState) {
  cy.visit('/game', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({
        email: 'e2e@landnam.guest',
        password: 'e2e-guest-test',
      }))
    },
  })
}

function rectsIntersect(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function assertGameplayButtonsAvoidCoachBlock() {
  cy.get('[data-testid="tutorial-coach-block"]').should('be.visible').then($coach => {
    const coachRect = $coach[0].getBoundingClientRect()

    cy.get('.portrait-canvas button').each($button => {
      const button = $button[0] as HTMLButtonElement
      if ($button.closest('[data-testid="tutorial-coach-overlay"]').length > 0) return

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

        cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Open a Mission')

        // On mobile the bottom tab bar's Missions tab is always visible. The
        // old always-on desktop sidebar nav (`.desktop-sidebar`,
        // `sidebar-nav-missions`) was retired in favour of screen-embedded
        // navigation (`.hub-desktop-nav`, clicking the Launchpad itself,
        // the progression card's "View Missions" CTA) — at this exact
        // tutorial step ("Click the Launchpad") there is no persistent
        // missions-nav element on desktop by design, so just confirm the
        // retired sidebar and the mobile-only bottom tab bar both stay
        // hidden rather than asserting a stand-in that doesn't exist here.
        cy.window().then(win => {
          if (win.innerWidth >= 1024) {
            cy.get('[data-testid="sidebar-nav-missions"]').should('not.be.visible')
            cy.get('[data-testid="bottom-tab-missions"]').should('not.be.visible')
          } else {
            cy.get('[data-testid="bottom-tab-missions"]').should('be.visible')
          }
        })

        assertGameplayButtonsAvoidCoachBlock()
      })

      it('keeps mission board actions below the tutorial rail', () => {
        visitWithState(fullState({
          screen: 'missions',
          tutorial: true,
          doneSteps: { 0: true, 1: true },
        }))

        cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Lock a Contract')
        cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').should('be.visible')
        assertGameplayButtonsAvoidCoachBlock()
      })

      it('keeps target picker and continue actions below the tutorial rail', () => {
        visitWithState(fullState({
          screen: 'targets',
          missionId: 'generated-s1-starter-bulk-1',
          tutorial: true,
          doneSteps: { 0: true, 1: true, 2: true },
        }))

        cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Choose a Destination')
        cy.contains('Continue · Build').should('be.visible')
        assertGameplayButtonsAvoidCoachBlock()
      })

      // KES-192: TutorialHighlight (.coach-glow-ring) wraps whole content
      // panels — the map card here, the rocket-assembly card on 'fab', the
      // launch-authorization card on 'fab' step 5, Debrief's summary card —
      // whenever hasCoach is true. That makes its border color a panel
      // accent on every onboarding screen, which the standing amber rule
      // (CLAUDE.md / design-language doc) explicitly forbids ("never a panel
      // accent... or generic UI chrome"). Was hardcoded amber
      // (rgb(245, 166, 35)) until this ticket; must stay cyan.
      it('highlights the target picker map with cyan, never amber (KES-192)', () => {
        visitWithState(fullState({
          screen: 'targets',
          missionId: 'generated-s1-starter-bulk-1',
          tutorial: true,
          doneSteps: { 0: true, 1: true, 2: true },
        }))

        cy.get('[data-testid="tutorial-coach-highlight"]').should('be.visible').then($ring => {
          const borderColor = getComputedStyle($ring[0]).borderTopColor
          expect(borderColor).to.equal('rgb(112, 217, 234)')
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

        cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Assemble the Rocket')
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

        cy.get('[data-testid="tutorial-coach-block"]').should('contain', 'Build a Launchpad')
        cy.contains('[data-testid="tutorial-coach-overlay"] button', 'Skip').click()
        cy.get('[data-testid="tutorial-coach-overlay"]').should('not.exist')
        cy.get('[data-testid="building-launchpad"]').should('be.visible')
        cy.window().then(win => {
          if (win.innerWidth >= 1024) {
            // No standing sidebar nav on desktop (see the retirement note
            // above). At Ops 0 with nothing in flight, HubScreen shows the
            // launchpad's "Choose your first contract" callout instead of
            // ProgressionCard (the two are deliberately mutually exclusive
            // — see HubScreen.tsx) — its "View Missions" CTA is the current
            // path once a mission is actionable.
            cy.contains('button', 'View Missions', { timeout: 10000 }).click()
          } else {
            cy.get('[data-testid="bottom-tab-missions"]').click()
          }
        })
        cy.get('[data-testid="mission-card-generated-s1-starter-bulk-1"]').should('be.visible').click()
        cy.contains('Continue · Build').should('be.visible')
      })
    })
  }
})
