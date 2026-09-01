export {}

/**
 * Screenshot pass for the Earth Base scene redesign (Open Design
 * `landnam-earth-base-v2.html`). Not an assertion suite — it seeds a base at
 * a few build states and captures the hub at portrait and desktop widths so
 * the ported scene can be eyeballed.
 *
 * Run: CYPRESS_PROFILE=earth-base npx cypress run --browser chrome
 */

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'

const ALL_SURVEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_mission_choice', 'lnm_m2_rocket_clarity', 'lnm_m2_rating', 'lnm_m2_freetext',
        'lnm_m3_transport_clarity', 'lnm_m3_client_choice', 'lnm_m3_rating', 'lnm_m3_freetext',
]

const BASE_PLAYER = {
  francs: 15_000_000_000,
  activeMission: null,
  missionCount: 1,
  pendingLaunch: false,
  placed: ['launchpad'],
  placementPlots: { launchpad: 0 },
  controlBuilt: false,
  missionsDone: 0,
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
}

function seed(win: Window, player: object) {
  win.localStorage.removeItem('pocketbase_auth')
  win.localStorage.setItem(SURVEY_KEY, JSON.stringify(ALL_SURVEYS))
  win.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
  // Keep visual specs isolated from any remote game state left by another
  // test in the same PocketBase-backed run.
  win.localStorage.setItem('landnam-account-credentials', JSON.stringify({
    email: `ci-seed-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'GuestPassword123!',
  }))
  // Suppress the onboarding-complete sheet, which otherwise covers the scene
  // on any preset with missionsDone past the Free Ops threshold.
  win.localStorage.setItem('ln_tutorial_complete_ack', '1')
  win.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    screen: 'hub',
    player: { ...BASE_PLAYER, ...player },
    tutorial: false,
    doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 9: true },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    popup: null,
  }))
}

function openHub(player: object) {
  cy.visit('/game/hub', { onBeforeLoad: win => seed(win, player) })
  cy.get('[data-testid="building-launchpad"]', { timeout: 20000 }).should('exist')
  // Let the ridge parallax, mote field and Pixi ticker settle, and give the
  // launchpad callout its 900ms auto-open delay.
  cy.wait(2500)
}

function assertNoHorizontalOverflow() {
  cy.window().then(win => {
    expect(win.document.documentElement.scrollWidth, 'document width').to.be.at.most(win.innerWidth)
  })
}

function assertInsideViewport(selector: string) {
  cy.window().then(win => cy.get(selector).then($element => {
    const rect = $element[0].getBoundingClientRect()
    expect(rect.left, `${selector} left edge`).to.be.at.least(0)
    expect(rect.right, `${selector} right edge`).to.be.at.most(win.innerWidth)
  }))
}

describe('Earth Base — redesigned scene', () => {
  Cypress.on('uncaught:exception', err => {
    if (err.message.includes('_cancelResize')) return false
    return undefined
  })

  it('portrait — launchpad only, Ops 0', () => {
    cy.viewport(390, 844)
    openHub({})
    cy.screenshot('earth-base-01-portrait-launchpad', { capture: 'viewport' })
  })

  it('portrait — full base, Free Ops', () => {
    cy.viewport(390, 844)
    openHub({
      missionsDone: 4,
      missionCount: 4,
      freeOperations: true,
      refineryBuilt: true,
      refineryUnlocked: true,
      scannerBuilt: true,
      placed: ['launchpad', 'refinery', 'scan-station', 'transit-telescope'],
      placementPlots: { launchpad: 0, refinery: 1, 'scan-station': 2, 'transit-telescope': 3 },
      stash: { iron: 12, silicon: 5, gold: 2 },
    })
    cy.screenshot('earth-base-02-portrait-full', { capture: 'viewport' })
  })

  it('desktop — full base', () => {
    cy.viewport(1280, 720)
    openHub({
      missionsDone: 4,
      missionCount: 4,
      freeOperations: true,
      refineryBuilt: true,
      refineryUnlocked: true,
      scannerBuilt: true,
      placed: ['launchpad', 'refinery', 'scan-station', 'transit-telescope'],
      placementPlots: { launchpad: 0, refinery: 1, 'scan-station': 2, 'transit-telescope': 3 },
      stash: { iron: 12, silicon: 5 },
    })
    assertNoHorizontalOverflow()
    assertInsideViewport('[data-testid="progression-card-transit-satellite"]')
    cy.screenshot('earth-base-03-desktop-full', { capture: 'viewport' })
  })

  it('narrow landscape — desktop composition stays inside the viewport', () => {
    cy.viewport(1024, 600)
    openHub({
      missionsDone: 4,
      missionCount: 4,
      freeOperations: true,
      refineryBuilt: true,
      refineryUnlocked: true,
      scannerBuilt: true,
      placed: ['launchpad', 'refinery', 'scan-station', 'transit-telescope'],
      placementPlots: { launchpad: 0, refinery: 1, 'scan-station': 2, 'transit-telescope': 3 },
    })
    assertNoHorizontalOverflow()
    assertInsideViewport('[data-testid="progression-card-transit-satellite"]')
    cy.screenshot('earth-base-08-narrow-landscape', { capture: 'viewport' })
  })

  it('portrait — below-soil storage and habitat cutaway', () => {
    cy.viewport(390, 844)
    openHub({
      missionsDone: 4,
      missionCount: 4,
      freeOperations: true,
      stash: { iron: 12, silicon: 5, gold: 2 },
      shipCustomizerParts: {
        engine: 'ion-thruster-t1',
        payload: 'cargo-payload-t1',
      },
      subsurfaceExcavated: true,
      subsurfaceBuilt: ['mineral-vault', 'parts-locker'],
    })
    cy.contains('button', 'Subsurface').click({ scrollBehavior: false })
    cy.get('[data-testid="subsurface-facility-cutaway"]', { timeout: 10000 })
      .should('be.visible')
    cy.contains('Storage & habitat deck').should('be.visible')
    cy.contains('Mineral Vault').should('be.visible')
    cy.contains('Parts Stores').should('be.visible')
    cy.contains('Habitat Training').should('be.visible')
    cy.contains('Commodity Exchange').should('not.exist')
    cy.screenshot('earth-base-04-portrait-subsurface', { capture: 'viewport' })
  })

  it('desktop — below-soil storage and habitat cutaway', () => {
    cy.viewport(1280, 720)
    openHub({
      missionsDone: 4,
      missionCount: 4,
      freeOperations: true,
      stash: { iron: 12, silicon: 5, gold: 2 },
      shipCustomizerParts: {
        engine: 'ion-thruster-t1',
        payload: 'cargo-payload-t1',
      },
      subsurfaceExcavated: true,
      subsurfaceBuilt: ['mineral-vault', 'parts-locker'],
    })
    cy.contains('button', 'Subsurface').click({ scrollBehavior: false })
    cy.get('[data-testid="subsurface-facility-cutaway"]', { timeout: 10000 })
      .should('be.visible')
    assertNoHorizontalOverflow()
    cy.screenshot('earth-base-05-desktop-subsurface', { capture: 'viewport' })
  })

  it('portrait — edit mode toolbar', () => {
    cy.viewport(390, 844)
    openHub({ missionsDone: 4, missionCount: 4, freeOperations: true })
    // scrollBehavior:false — the hub's sliding world is a 200%-tall child of an
    // overflow:hidden box, which is still programmatically scrollable, so
    // Cypress's default scrollIntoView drags the scene to the subsurface half
    // before clicking and the screenshot captures that instead of the surface.
    cy.get('[data-testid="hub-edit-build-btn"]').contains('Edit · Build').click({ scrollBehavior: false })
    cy.wait(600)
    cy.screenshot('earth-base-06-portrait-edit', { capture: 'viewport' })
  })

  it('portrait — build/place screen', () => {
    cy.viewport(390, 844)
    openHub({ missionsDone: 4, missionCount: 4, freeOperations: true })
    // Reach BuildPlaceScreen the way a player does — a bare visit to
    // /game/build bounces back to the hub.
    cy.get('[data-testid="hub-edit-build-btn"]', { timeout: 10000 })
      .contains('Edit · Build')
      .click({ scrollBehavior: false })
    cy.get('[data-testid="hub-edit-build-btn"]', { timeout: 10000 })
      .should('contain.text', 'Done')
    cy.get('[data-testid="hub-new-structure-btn"]', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true, scrollBehavior: false })
    cy.get('[data-testid="build-place-screen"][data-scene-loaded="true"]', { timeout: 20000 })
      .should('be.visible')
    cy.get('[data-testid="build-plot-1"]', { timeout: 20000 })
      .should('be.visible')
      .click({ force: true, scrollBehavior: false })
    cy.wait(1200)
    cy.screenshot('earth-base-07-portrait-build', { capture: 'viewport' })
  })
})
