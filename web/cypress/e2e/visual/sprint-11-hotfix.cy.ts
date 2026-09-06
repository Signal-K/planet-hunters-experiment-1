import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const AUTHENTICATED_STORAGE_KEY = `${STORAGE_KEY}:user:e2e-user`

function stateFor(screen: GameState['screen']): GameState {
  return {
    screen,
    player: {
      francs: 11_580_000_000,
      activeMission: null,
      missionCount: 9,
      pendingLaunch: false,
      placed: ['launchpad', 'refinery', 'scan-station'],
      placementPlots: { launchpad: 0, refinery: 1, 'scan-station': 2 },
      scannerBuilt: true,
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
      const serialized = JSON.stringify(stateFor(screen))
      win.localStorage.setItem(STORAGE_KEY, serialized)
      win.localStorage.setItem(AUTHENTICATED_STORAGE_KEY, serialized)
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({
        email: 'sprint-11-hotfix-invalid@example.com',
        password: 'GuestPassword123!',
      }))
      win.localStorage.setItem('landnam-upgrade-prompt-snooze-until', String(Date.now() + 365 * 24 * 60 * 60 * 1000))
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
      win.localStorage.setItem('landnam-surveys-shown', JSON.stringify([
        'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
        'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
        'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_mission_choice', 'lnm_m2_rocket_clarity', 'lnm_m2_rating', 'lnm_m2_freetext',
        'lnm_m3_transport_clarity', 'lnm_m3_client_choice', 'lnm_m3_rating', 'lnm_m3_freetext',
        'lnm_satellite_clarity', 'lnm_resume_mission', 'lnm_base_building', 'lnm_rover_clarity',
      ]))
    },
  })
}

function expectNoOverlap(a: DOMRect, b: DOMRect, label: string) {
  const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  expect(overlaps, label).to.eq(false)
}

describe('Sprint 11 Launchpad and Earth Base hotfix — live browser QA', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    // The backend URLs vary by topology (Docker Compose reaches the host via
    // host.docker.internal; CI and bare `npm run dev` use 127.0.0.1/localhost
    // directly) — assert reachability, not a specific hostname, or this hook
    // fails outside the one dev setup it was written against.
    cy.request('/api/backend-health').then(res => {
      expect(res.body.ok, 'overall health').to.eq(true)
      expect(res.body.backends.shared.ok, 'shared backend reachable').to.eq(true)
      expect(res.body.backends.landnam.ok, 'landnam backend reachable').to.eq(true)
    })
  })

  it('keeps every essential Launchpad control in one viewport and opens the monitoring build flow', () => {
    visitGame('/game/launchpad', 'launchpad')

    cy.contains('Your Program', { timeout: 15_000 }).should('be.visible')
    cy.get('[data-testid="launchpad-monitoring-structure"]').should('be.visible')
    cy.get('[data-testid="launchpad-satellite-orbit"]').should('be.visible')
    cy.get('[data-testid="launchpad-rocket-fleet"]').should('be.visible')
    // Station construction is owned by Earth Base build flow; Launchpad only
    // exposes the already-built monitoring structure (KES-177).
    cy.get('[data-testid="launchpad-build-monitoring-btn"]').should('not.exist')
    cy.get('[data-testid="launchpad-open-hangar-btn"]').should('be.visible')
    cy.get('[data-testid="launchpad-view-contracts-btn"]').should('be.visible')
    cy.get('[data-testid="launchpad-guide-open"]').should('not.exist')
    cy.get('.launchpad-available-actions').should('not.exist')
    cy.get('[data-testid="launchpad-build-monitoring-btn"]').should('not.exist')

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

    cy.screenshot('sprint-11-hotfix-launchpad-actions', { capture: 'viewport' })
    cy.get('[data-testid="launchpad-open-hangar-btn"]').should('be.visible')
  })

  it('keeps the Earth Base HUD and progression controls in separate hit regions', () => {
    visitGame('/game/hub', 'hub')

    cy.get('h1', { timeout: 15_000 }).contains('Earth Base').should('be.visible')
    cy.get('[data-testid="hud-subsurface-chip"]').should('be.visible')
    cy.get('[data-testid="progression-card-skills"]').should('be.visible')
    cy.get('[data-testid="progression-card-transit-satellite"]').should('be.visible')
    cy.get('[data-testid="progression-card-next-mission"]').should('be.visible')
    cy.get('body').then($body => {
      if ($body.text().includes('SCANNER')) cy.contains('SCANNER').should('be.visible')
    })

    cy.get('[data-testid="hud-subsurface-chip"]').then($hud => {
      const hud = $hud[0].getBoundingClientRect()
      cy.get('[data-testid="progression-card-skills"]').then($skills => {
        expectNoOverlap(hud, $skills[0].getBoundingClientRect(), 'HUD does not overlap Skill Points card')
      })
    })
    cy.get('.hub-push-opt-in').then($prompt => {
      if ($prompt.is(':visible')) {
        const prompt = $prompt[0].getBoundingClientRect()
        cy.get('[data-testid="hud-subsurface-chip"]').then($hud => {
          expectNoOverlap(prompt, $hud[0].getBoundingClientRect(), 'mission alerts do not overlap HUD')
        })
      }
    })

    cy.screenshot('sprint-11-hotfix-earth-base', { capture: 'viewport' })
    cy.get('[data-testid="building-launchpad-hit"]').click({ scrollBehavior: false })
    cy.location('pathname', { timeout: 10_000 }).should('eq', '/game/launchpad')
    cy.get('[data-testid="launchpad-monitoring-structure"]').should('be.visible')
    cy.get('[data-testid="launchpad-build-monitoring-btn"]').should('not.exist')
  })
})
