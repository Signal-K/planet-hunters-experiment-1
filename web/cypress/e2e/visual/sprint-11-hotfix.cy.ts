import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

function stateFor(screen: GameState['screen']): GameState {
  return {
    screen,
    player: {
      francs: 11_580_000_000,
      activeMission: null,
      missionCount: 9,
      pendingLaunch: false,
      placed: ['launchpad', 'refinery'],
      placementPlots: { launchpad: 0, refinery: 1 },
      controlBuilt: true,
      missionsDone: 4,
      skillPoints: 3,
      unlockedSkillNodes: [],
      freeOperations: true,
      clientMissions: {},
      clientStreaks: {},
      clientCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: true,
      refineryUnlocked: true,
      refineryUnlockNotified: true,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
      seen_planets: [],
      roverDeployments: [],
      clientTerritories: {},
      satelliteMonitoringBuilt: false,
      satelliteMonitoringLevel: 0,
      transitSatelliteLaunchedAt: null,
      transitSatelliteLevel: 0,
      tessClassifications: {},
      stash: { iron: 12, silicon: 5, gold: 2 },
    },
    missionId: null,
    targetId: null,
    deliveryTargetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
  } as GameState
}

function visitGame(path: string, screen: GameState['screen']) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateFor(screen)))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({
        email: 'sprint-11-hotfix-invalid@landnam.guest',
        password: 'GuestPassword123!',
      }))
      win.localStorage.setItem('landnam-upgrade-prompt-snooze-until', String(Date.now() + 365 * 24 * 60 * 60 * 1000))
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
      win.localStorage.setItem('landnam-surveys-shown', JSON.stringify([
        'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
        'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
        'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete',
        'lnm_satellite_clarity', 'lnm_resume_mission', 'lnm_base_building', 'lnm_rover_clarity',
      ]))
    },
  })
}

function expectNoOverlap(a: DOMRect, b: DOMRect, label: string) {
  const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  expect(overlaps, label).to.eq(false)
}

function expectBackendsHealthy(attempts = 4): Cypress.Chainable<void> {
  return cy.request({ url: '/api/backend-health', failOnStatusCode: false }).then(response => {
    const healthy = response.status === 200
      && response.body?.ok === true
      && response.body?.backends?.shared?.ok === true
      && response.body?.backends?.landnam?.ok === true
    if (!healthy && attempts > 1) {
      return cy.wait(500).then(() => expectBackendsHealthy(attempts - 1))
    }
    expect(response.status, 'backend health response').to.eq(200)
    expect(response.body.ok, 'combined backend health').to.eq(true)
    expect(response.body.backends?.shared?.ok, 'shared PocketBase health').to.eq(true)
    expect(response.body.backends?.landnam?.ok, 'Landnam PocketBase health').to.eq(true)
  })
}

describe('Sprint 11 Launchpad and Earth Base hotfix — live browser QA', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    expectBackendsHealthy()
  })

  it('keeps every essential Launchpad control in one viewport and opens the monitoring build flow', () => {
    visitGame('/game/launchpad', 'launchpad')

    cy.contains('Your Program', { timeout: 15_000 }).should('be.visible')
    cy.get('[data-testid="launchpad-monitoring-structure"]').should('be.visible')
    cy.get('[data-testid="launchpad-satellite-orbit"]').should('be.visible')
    cy.get('[data-testid="launchpad-rocket-fleet"]').should('be.visible')
    cy.get('[data-testid="launchpad-build-monitoring-btn"]').should('be.visible')
    cy.get('[data-testid="launchpad-open-hangar-btn"]').should('be.visible')
    cy.get('[data-testid="launchpad-view-contracts-btn"]').should('be.visible')
    cy.get('[data-testid="launchpad-guide-open"]').should('be.visible')

    cy.get('[data-testid="launchpad-guide"]').should('be.visible').and('contain', 'Build the monitoring station')
    cy.get('[data-testid="launchpad-monitoring-structure"]').should('have.class', 'is-guided')
    cy.get('[data-testid="launchpad-guide-next"]').click()
    cy.get('[data-testid="launchpad-guide"]').should('contain', 'Launch from here')
    cy.get('[data-testid="launchpad-status-card"]').should('have.class', 'is-guided')
    cy.get('[data-testid="launchpad-guide-next"]').click()
    cy.get('[data-testid="launchpad-guide"]').should('contain', 'Prepare your vehicles')
    cy.get('[data-testid="launchpad-rocket-fleet"]').should('have.class', 'is-guided')
    cy.get('[data-testid="launchpad-guide-next"]').click()
    cy.get('[data-testid="launchpad-guide"]').should('contain', 'Choose what flies next')
    cy.get('[data-testid="launchpad-satellite-orbit"]').should('have.class', 'is-guided')
    cy.get('[data-testid="launchpad-guide-next"]').should('contain', 'DONE').click()
    cy.get('[data-testid="launchpad-guide"]').should('not.exist')
    cy.get('[data-testid="launchpad-guide-open"]').click()
    cy.get('[data-testid="launchpad-guide"]').should('be.visible')

    cy.get('.launchpad-visual-scene').then($scene => {
      const scene = $scene[0].getBoundingClientRect()
      cy.get('.launchpad-scene-rail').then($rail => {
        const rail = $rail[0].getBoundingClientRect()
        expect(scene.bottom, 'visual scene ends above command rail').to.be.at.most(rail.top + 1)
      })
    })
    cy.window().then(win => {
      expect(win.document.documentElement.scrollHeight, 'page does not vertically scroll').to.be.at.most(win.innerHeight)
      const viewport = win.document.querySelector('.launchpad-visual-scene') as HTMLElement
      expect(viewport.scrollHeight, 'Launchpad scene fits its viewport').to.be.at.most(viewport.clientHeight)
    })

    cy.screenshot('sprint-11-hotfix-launchpad-guide', { capture: 'viewport' })
    cy.get('[data-testid="launchpad-guide-close"]').click()
    cy.get('[data-testid="launchpad-build-monitoring-btn"]').click()
    cy.location('pathname', { timeout: 10_000 }).should('eq', '/game/build')
  })

  it('keeps the Earth Base HUD and progression controls in separate hit regions', () => {
    visitGame('/game/hub', 'hub')

    cy.get('h1', { timeout: 15_000 }).contains('Earth Base').should('be.visible')
    cy.get('[data-testid="hud-jobs-chip"]').should('be.visible')
    cy.get('[data-testid="progression-card-skills"]').should('be.visible')
    cy.get('[data-testid="progression-card-sms"]').should('be.visible')
    cy.get('[data-testid="progression-card-next-mission"]').should('be.visible')
    cy.contains('SCANNER').should('not.exist')
    cy.get('canvas').should('be.visible')

    cy.get('[data-testid="hud-jobs-chip"]').then($hud => {
      const hud = $hud[0].getBoundingClientRect()
      cy.get('[data-testid="progression-card-skills"]').then($skills => {
        expectNoOverlap(hud, $skills[0].getBoundingClientRect(), 'HUD does not overlap Skill Points card')
      })
    })
    cy.get('.hub-push-opt-in').then($prompt => {
      if ($prompt.is(':visible')) {
        const prompt = $prompt[0].getBoundingClientRect()
        cy.get('[data-testid="hud-jobs-chip"]').then($hud => {
          expectNoOverlap(prompt, $hud[0].getBoundingClientRect(), 'mission alerts do not overlap HUD')
        })
      }
    })

    cy.wait(750)
    cy.screenshot('sprint-11-hotfix-earth-base', { capture: 'viewport' })
    cy.get('[data-testid="building-launchpad-hit"]').should('be.visible').and('not.be.disabled')
  })

  it('does not restore the legacy sidebar on wide desktop viewports', () => {
    cy.viewport(1720, 1200)
    visitGame('/game/hub', 'hub')

    cy.get('h1', { timeout: 15_000 }).contains('Earth Base').should('be.visible')
    cy.get('[data-testid="building-launchpad-hit"]', { timeout: 15_000 }).should('be.visible')
    cy.get('[data-testid="progression-card-skills"]').should('be.visible')
    cy.get('[data-testid="progression-card-sms"]').should('be.visible')
    cy.get('canvas').should('be.visible')
    cy.get('.desktop-sidebar').should('not.exist')
    cy.get('[data-testid="settings-button"]')
      .should('be.visible')
      .and('have.attr', 'aria-label', 'Settings')
    cy.window().then(win => {
      expect(win.document.documentElement.scrollHeight, 'wide hub does not vertically scroll').to.be.at.most(win.innerHeight)
    })

    cy.wait(750)
    cy.screenshot('sprint-11-hotfix-earth-base-wide', { capture: 'viewport' })
  })
})
