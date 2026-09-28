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
    assertion: () => cy.contains('h1', /^(Base|Earth Base)$/).should('be.visible'),
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
      cy.contains('h1', /^(Base|Earth Base)$/).should('be.visible')
    },
  },
  {
    key: 'transport-fab',
    assertion: () => {
      cy.location('pathname').should('eq', '/game/missions')
      cy.get('[data-testid="assembly-selected-rocket"]').should('contain', 'Prospector')
    },
  },
  {
    // SSL-332: after both guided missions the Hub offers the silo build.
    key: 'storage-hub',
    assertion: () => {
      cy.get('[data-testid="progression-card-storage-silo"]').should('be.visible')
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
    cy.contains('h1', /^(Base|Earth Base)$/).should('be.visible')
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
    // ui-tess-discovery is listed in two groups, so 25 presets render 26 buttons.
    cy.get('[data-testid^="dev-shot-"]').should('have.length', 26)
  })

  it('clicking Transport Hub lands on the two-leg client pick with the Transport coach', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shot-transport-hub"]').click()
    // Compact coach on the Hub: title plus the action.
    cy.contains('Tap the Launchpad').should('be.visible')
    cy.contains(/^transport$/i).should('be.visible')
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

  it('clicking Storage Hub shows the Storage coach and silo card, and placing the silo opens Free Ops', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shot-storage-hub"]').click()
    cy.contains('Build a Storage Silo').should('be.visible')
    // scrollBehavior:false — the hub's sliding world is taller than the
    // viewport, and Cypress's default scroll-to-top tucks the card under the
    // fixed top bar (same pattern as earth-base-redesign.cy.ts).
    cy.get('[data-testid="progression-card-storage-silo"]').click({ scrollBehavior: false })
    cy.location('pathname').should('eq', '/game/build')
    cy.get('[data-coach-id="build-plot-open"]').first().parents('button').first().click()
    cy.get('[data-coach-id="build-confirm"]').click()
    cy.get('[data-testid="tutorial-complete-sheet"]').should('be.visible')
    cy.get('[data-testid="free-ops-activity-client-work"]').should('be.visible')
    cy.get('[data-testid="free-ops-activity-space-telescope"]').should('be.visible')
    cy.get('[data-testid="free-ops-activity-build-refinery"]').should('be.visible')
  })

  it('closes panel when DEV button clicked again', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shortcuts-panel"]').should('be.visible')
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shortcuts-panel"]').should('not.exist')
  })
})
