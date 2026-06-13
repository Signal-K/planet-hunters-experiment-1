import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

function visitWithState(state: Partial<GameState>) {
  const defaults: GameState = {
    screen: 'intro',
    player: {
      francs: 10_000_000_000,
      activeMission: null,
      missionCount: 1,
      pendingLaunch: false,
      placed: [],
      placementPlots: {},
      controlBuilt: false,
      missionsDone: 0,
      freeOperations: false,
      contractorMissions: {},
      contractorCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: false,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    buildGate: false,
    menuOpen: false,
    classification: null,
    classificationError: null,
  }
  cy.visit('/game', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaults, ...state }))
    },
  })
}

// Dedicated "scene" presets — drop the player directly into a citizen-science
// screen without playing through the mission/build/launch loop.
const CLASSIFY_SCENE: Partial<GameState> = {
  screen: 'classify',
  missionId: 'm1-iron',
  doneSteps: { 1: true, 2: true },
}

const SATELLITE_SCENE: Partial<GameState> = {
  screen: 'satellite',
}

describe('Citizen Science — Classify Signal (transit lightcurve)', () => {
  it('loads the classify screen directly without the full game loop', () => {
    visitWithState(CLASSIFY_SCENE)
    cy.contains('Classify Signal').should('be.visible')
    cy.contains('TESS-451 b').should('be.visible')
    cy.get('[data-testid="classify-swipe-card"]').should('be.visible')
  })

  it('submit is disabled until a verdict is chosen', () => {
    visitWithState(CLASSIFY_SCENE)
    cy.get('[data-testid="classify-submit-btn"]').should('be.disabled')
  })

  it('tapping Planet selects the verdict and enables submit', () => {
    visitWithState(CLASSIFY_SCENE)
    cy.get('[data-testid="classify-verdict-planet"]').click()
    cy.get('[data-testid="classify-verdict-planet"]').should('have.class', 'selected')
    cy.get('[data-testid="classify-verdict-ready"]').should('contain.text', 'Candidate Confirmed')
    cy.get('[data-testid="classify-submit-btn"]').should('not.be.disabled')
  })

  it('tapping Not Planet selects the negative verdict', () => {
    visitWithState(CLASSIFY_SCENE)
    cy.get('[data-testid="classify-verdict-not-planet"]').click()
    cy.get('[data-testid="classify-verdict-not-planet"]').should('have.class', 'selected negative')
    cy.get('[data-testid="classify-verdict-ready"]').should('contain.text', 'False Positive Flagged')
  })

  it('swiping the lightcurve card right selects Planet', () => {
    visitWithState(CLASSIFY_SCENE)
    cy.get('[data-testid="classify-swipe-card"]')
      .trigger('pointerdown', { pointerId: 1, clientX: 50, clientY: 100, isPrimary: true, button: 0 })
      .trigger('pointermove', { pointerId: 1, clientX: 200, clientY: 100, isPrimary: true, button: 0 })
      .trigger('pointerup', { pointerId: 1, clientX: 200, clientY: 100, isPrimary: true, button: 0 })

    cy.get('[data-testid="classify-verdict-planet"]').should('have.class', 'selected')
  })

  it('swiping the lightcurve card left selects Not Planet', () => {
    visitWithState(CLASSIFY_SCENE)
    cy.get('[data-testid="classify-swipe-card"]')
      .trigger('pointerdown', { pointerId: 1, clientX: 200, clientY: 100, isPrimary: true, button: 0 })
      .trigger('pointermove', { pointerId: 1, clientX: 50, clientY: 100, isPrimary: true, button: 0 })
      .trigger('pointerup', { pointerId: 1, clientX: 50, clientY: 100, isPrimary: true, button: 0 })

    cy.get('[data-testid="classify-verdict-not-planet"]').should('have.class', 'selected negative')
  })

  it('submitting a verdict returns to the assembly screen', () => {
    visitWithState(CLASSIFY_SCENE)
    cy.get('[data-testid="classify-verdict-planet"]').click()
    cy.get('[data-testid="classify-submit-btn"]').click()
    cy.contains('Hull MK1').should('be.visible')
  })
})

describe('Citizen Science — Satellite Uplink (recurring classification minigame)', () => {
  it('loads the satellite uplink screen directly without the full game loop', () => {
    visitWithState(SATELLITE_SCENE)
    cy.get('[data-testid="satellite-screen"]').should('be.visible')
    cy.contains('Satellite Uplink').should('be.visible')
    cy.get('[data-testid="satellite-scan-btn"]').should('be.visible')
  })

  it('scanning reveals a candidate with period/depth/likelihood', () => {
    visitWithState(SATELLITE_SCENE)
    cy.get('[data-testid="satellite-scan-btn"]').click()
    cy.get('[data-testid="satellite-candidate"]').should('be.visible')
    cy.get('[data-testid="satellite-confirm-planet-btn"]').should('be.visible')
    cy.get('[data-testid="satellite-false-positive-btn"]').should('be.visible')
  })

  it('confirming a planet records a research annotation', () => {
    visitWithState(SATELLITE_SCENE)
    cy.get('[data-testid="satellite-scan-btn"]').click()
    cy.get('[data-testid="satellite-confirm-planet-btn"]').click()
    cy.get('[data-testid="satellite-result"]').should('contain.text', 'PLANET CONFIRMED')
    cy.get('[data-testid="satellite-annotations"]').should('contain.text', '1 ANNOTATIONS')
  })

  it('flagging a false positive does not add a research annotation', () => {
    visitWithState(SATELLITE_SCENE)
    cy.get('[data-testid="satellite-scan-btn"]').click()
    cy.get('[data-testid="satellite-false-positive-btn"]').click()
    cy.get('[data-testid="satellite-result"]').should('contain.text', 'NO SIGNAL')
    cy.get('[data-testid="satellite-annotations"]').should('contain.text', '0 ANNOTATIONS')
  })

  it('can scan again after a result', () => {
    visitWithState(SATELLITE_SCENE)
    cy.get('[data-testid="satellite-scan-btn"]').click()
    cy.get('[data-testid="satellite-false-positive-btn"]').click()
    cy.get('[data-testid="satellite-scan-again-btn"]').click()
    cy.get('[data-testid="satellite-candidate"]').should('be.visible')
  })
})
