// Tests for the ?preset= URL param and the DEV panel one-shots.
// Runs in the offline profile (no PocketBase required).

const presetCases: Array<{ key: string; assertion: () => void }> = [
  {
    key: 'm1-intro',
    assertion: () => cy.contains('BEGIN OPERATIONS').should('be.visible'),
  },
  {
    key: 'm1-hub',
    assertion: () => cy.contains('Earth Base').should('be.visible'),
  },
  {
    key: 'm1-fab',
    assertion: () => cy.contains('LAUNCH').should('be.visible'),
  },
  {
    key: 'm2-hub',
    assertion: () => {
      cy.contains('Earth Base').should('be.visible')
      cy.contains('Starter Rocket 2').should('be.visible')
    },
  },
  {
    key: 'm2-fab',
    assertion: () => {
      cy.contains('LAUNCH').should('be.visible')
      cy.contains('Hull MK2').should('be.visible')
    },
  },
  {
    key: 'm3-hub',
    assertion: () => cy.contains('Earth Base').should('be.visible'),
  },
  {
    key: 'freeops',
    assertion: () => cy.contains('Earth Base').should('be.visible'),
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

  it('unknown preset falls back to normal load (intro screen)', () => {
    cy.visit('/game?preset=does-not-exist')
    cy.contains('BEGIN OPERATIONS').should('be.visible')
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
    cy.get('[data-testid="dev-group-mission-1"]').should('exist')
    cy.get('[data-testid="dev-group-mission-2"]').should('exist')
    cy.get('[data-testid="dev-group-mission-3"]').should('exist')
    cy.get('[data-testid="dev-group-free-ops"]').should('exist')
  })

  it('each mission group has the expected shot buttons', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    // M1 shots
    cy.get('[data-testid="dev-shot-m1-hub"]').should('exist')
    cy.get('[data-testid="dev-shot-m1-fab"]').should('exist')
    // M2 shots
    cy.get('[data-testid="dev-shot-m2-hub"]').should('exist')
    cy.get('[data-testid="dev-shot-m2-fab"]').should('exist')
    // M3 shots
    cy.get('[data-testid="dev-shot-m3-hub"]').should('exist')
    // Free Ops
    cy.get('[data-testid="dev-shot-freeops"]').should('exist')
  })

  it('clicking M2 Hub navigates to hub with M2 coach, no Save Progress prompt', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shot-m2-hub"]').click()
    cy.contains('Starter Rocket 2').should('be.visible')
    cy.contains('Create a free account').should('not.exist')
  })

  it('clicking M2 Fab shows fab screen with SR2 hull', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shot-m2-fab"]').click()
    cy.contains('Hull MK2').should('be.visible')
    cy.contains('LAUNCH').should('be.visible')
  })

  it('closes panel when DEV button clicked again', () => {
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shortcuts-panel"]').should('be.visible')
    cy.get('[data-testid="dev-shortcuts-toggle"]').click()
    cy.get('[data-testid="dev-shortcuts-panel"]').should('not.exist')
  })
})
