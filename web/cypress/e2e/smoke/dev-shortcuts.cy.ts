import { assertOnHome } from '../../support/home-helpers'
import { seedFixtureSession } from '../../support/authenticated-fixture'

// Tests for the ?preset= URL param and the DEV panel one-shots.
// Runs in the offline profile (no PocketBase required).

const presetCases: Array<{ key: string; assertion: () => void }> = [
  {
    key: 'm1-intro',
    assertion: () => cy.contains('BEGIN OPERATIONS').should('be.visible'),
  },
  {
    key: 'm1-hub',
    assertion: () => assertOnHome(),
  },
  {
    // Mission setup owns one route: target, vehicle and launch review are
    // internal steps of /game/missions (canonicalGameRoute), not /game/fab.
    key: 'm1-fab',
    assertion: () => {
      cy.location('pathname').should('eq', '/game/missions')
      cy.get('[data-testid="mission-launch-review"]').should('be.visible')
    },
  },
  {
    key: 'transport-hub',
    assertion: () => {
      assertOnHome()
    },
  },
  {
    key: 'transport-fab',
    assertion: () => {
      cy.location('pathname').should('eq', '/game/missions')
      cy.get('[data-testid="mission-launch-review"]').should('contain', 'Prospector')
    },
  },
  {
    // SSL-405: the three-try Flight Plan replaced the Storage Silo lesson,
    // so the Hub no longer offers a silo card; the Flight Plan leads instead.
    key: 'storage-hub',
    assertion: () => {
      assertOnHome()
      cy.get('[data-testid="flight-plan"]').should('be.visible').and('contain', 'Open client contracts')
      cy.get('[data-testid="hub-build-storage-silo"]').should('not.exist')
    },
  },
  {
    key: 'transport-debrief',
    assertion: () => {
      cy.contains(/^debrief$/i).should('be.visible')
    },
  },
]

describe('Dev preset URL param (?preset=)', () => {
  presetCases.forEach(({ key, assertion }) => {
    it(`?preset=${key} loads correct screen without Save Progress prompt`, () => {
      cy.visit(`/game?preset=${key}`)
      cy.contains('Create a free account').should('not.exist')
      assertion()
    })
  })

  it('unknown preset falls back to normal load (Earth Base)', () => {
    // resolvePreset() returns null for an unrecognized key, so this device
    // takes the ordinary (non-preview) hydration path — which, same as any
    // other fresh session, opens the auth gate before gameplay (STS-624).
    // Seed a signed-in session so the fallback path reaches gameplay; a
    // signed-in player always lands on Earth Base (initial-route.ts).
    cy.visit('/game?preset=does-not-exist', {
      onBeforeLoad(win) {
        seedFixtureSession(win)
      },
    })
    cy.location('pathname').should('eq', '/game/hub')
    assertOnHome()
  })

  it('preset param is stripped from URL after load', () => {
    cy.visit('/game?preset=m1-hub')
    cy.url().should('not.include', 'preset=')
  })
})

describe('DEV panel UI', () => {
  beforeEach(() => {
    cy.visit('/game')
  })

  it('renders the DEV toggle button', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').should('be.visible')
  })

  it('opens panel with all mission groups on click', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shortcuts-panel"]').should('be.visible')
    cy.get('[data-testid="dev-return-to-game"]').should('be.visible')
    cy.get('[data-testid="dev-group-extraction"]').should('exist')
    cy.get('[data-testid="dev-group-transport"]').should('exist')
    cy.get('[data-testid="dev-group-storage-silo"]').should('exist')
    cy.get('[data-testid="dev-group-first-satellite-launch"]').should('exist')
    cy.get('[data-testid^="dev-group-"]').should('have.length', 5)
  })

  it('each mission group has the expected shot buttons', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    // M1 shots
    cy.get('[data-testid="dev-shot-m1-hub"]').should('exist')
    cy.get('[data-testid="dev-shot-m1-fab"]').should('exist')
    // Transport shots
    cy.get('[data-testid="dev-shot-transport-hub"]').should('exist')
    cy.get('[data-testid="dev-shot-transport-fab"]').should('exist')
    cy.get('[data-testid="dev-shot-transport-mining"]').should('exist')
    cy.get('[data-testid="dev-shot-transport-debrief"]').should('exist')
    // Storage Silo shots
    cy.get('[data-testid="dev-shot-storage-hub"]').should('exist')
    cy.get('[data-testid="dev-shot-storage-build"]').should('exist')
    // First Satellite Launch shots
    cy.get('[data-testid="dev-shot-telescope-hub"]').should('exist')
    cy.get('[data-testid="dev-shot-telescope-fab"]').should('exist')
    cy.get('[data-testid="dev-shot-telescope-transit"]').should('exist')
    cy.get('[data-testid="dev-shot-telescope-debrief"]').should('exist')
    cy.get('[data-testid="dev-shot-ui-tess-discovery"]').should('exist')
    // Recent UI shots
    cy.get('[data-testid="dev-shot-ui-mission-board"]').should('exist')
    cy.get('[data-testid="dev-shot-ui-skill-tree"]').should('exist')
    cy.get('[data-testid="dev-shot-ui-target-picker"]').should('exist')
    cy.get('[data-testid="dev-shot-ui-rover-mining"]').should('exist')
    cy.get('[data-testid="dev-shot-ship-customizer"]').should('exist')
    cy.get('[data-testid="dev-shot-ui-asteroid-discovery"]').should('exist')
    cy.get('[data-testid="dev-shot-ui-academy"]').should('exist')
    cy.get('[data-testid="dev-shot-ui-hangar-assembly"]').should('exist')
    cy.get('[data-testid="dev-shot-ui-instrument-hub"]').should('exist')
    // ui-tess-discovery is listed in two groups, so 26 presets render 27 buttons.
    cy.get('[data-testid^="dev-shot-"]').should('have.length', 27)
  })

  it('clicking Transport Hub lands on the Hub with the Flight Plan objective', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shot-transport-hub"]').click()
    // SSL-405: the Flight Plan strip names the active try and its objective.
    cy.get('[data-testid="flight-plan"]').should('be.visible')
      .and('contain', 'Open client contracts')
      .and('contain', 'mining')
    cy.contains('Create a free account').should('not.exist')
  })

  it('clicking Transport Fab shows fab screen with the Prospector staged', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shot-transport-fab"]').click()
    cy.contains('Prospector').should('be.visible')
    cy.contains('LAUNCH').should('be.visible')
  })

  it('clicking Transport Debrief shows the two-leg mission attributed to the delivery target', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shot-transport-debrief"]').click()
    // The ship returns from the delivery stop; the route chip still names the
    // mining site first (KES-352).
    cy.contains('span', 'RETURNED FROM').next().should('have.text', '4 Vesta')
  })

  it('clicking Storage Hub shows the Flight Plan and no retired silo card, with Free Ops still locked', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shot-storage-hub"]').click()
    assertOnHome()
    cy.get('[data-testid="flight-plan"]').should('be.visible').and('contain', 'Open client contracts')
    cy.get('[data-testid="hub-build-storage-silo"]').should('not.exist')
    cy.get('[data-testid="tutorial-complete-sheet"]').should('not.exist')
    cy.get('[data-testid="free-ops-activity-client-work"]').should('not.exist')
  })

  it('closes panel when DEV button clicked again', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shortcuts-panel"]').should('be.visible')
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shortcuts-panel"]').should('not.exist')
  })
})
