import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'

const VIEWPORTS = [
  { label: 'mobile portrait', width: 390, height: 844 },
  { label: 'tablet portrait', width: 768, height: 1024 },
  { label: 'desktop', width: 1280, height: 800 },
] as const

function basePlayer(overrides: Partial<GameState['player']> = {}): GameState['player'] {
  return {
    francs: 15_000_000_000,
    activeMission: null,
    missionCount: 4,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 3,
    skillPoints: 2,
    unlockedSkillNodes: [],
    freeOperations: true,
    clientMissions: {},
    clientStreaks: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
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
    satelliteMonitoringBuilt: true,
    satelliteMonitoringLevel: 1,
    transitSatelliteLaunchedAt: Date.now() - 60_000,
    transitSatelliteLevel: 1,
    tessClassifications: {},
    ...overrides,
  } as GameState['player']
}

function stateWith(screen: GameState['screen'], overrides: Partial<GameState> = {}): GameState {
  const base: GameState = {
    screen,
    player: basePlayer(),
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

  return {
    ...base,
    ...overrides,
    player: { ...base.player, ...(overrides.player ?? {}) },
  } as GameState
}

function visit(path: string, state: GameState) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      win.localStorage.setItem(SURVEY_KEY, JSON.stringify([
        'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
        'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
        'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_complete', 'lnm_m3_complete',
        'lnm_satellite_clarity', 'lnm_resume_mission', 'lnm_base_building', 'lnm_rover_clarity',
      ]))
      win.localStorage.setItem('ln_missionboard_freeops_explainer_ack', '1')
      win.localStorage.setItem('ln_mining_freeops_first_entry_ack', '1')
      win.localStorage.setItem('ln_mining_freeops_first_success_ack', '1')
      // Fixtures below start post-onboarding (missionsDone >= FREE_OPS_START_MISSIONS_DONE),
      // which is exactly the condition that pops TutorialCompleteSheet (HubScreen.tsx) the
      // first time it's unacknowledged. Unset, it full-screens over the hub on short
      // viewports (mobile landscape) and silently fits beside content on tall ones — pre-ack
      // it so these are steady-state screen-contract checks, not incidental first-run coverage.
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
    },
  })
}

describe('C1–C4 screen contracts across viewport classes', () => {
  for (const viewport of VIEWPORTS) {
    describe(viewport.label, () => {
      beforeEach(() => cy.viewport(viewport.width, viewport.height))

      it('renders the Free Ops hub, client board, and own-program launchpad without losing primary actions', () => {
        visit('/game', stateWith('hub'))
        cy.contains('h1', 'Earth Base', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="progression-card-next-mission"]', { timeout: 10000 })
          .scrollIntoView().should('be.visible')

        visit('/game/missions', stateWith('missions'))
        cy.contains('Mission Board', { timeout: 10000 }).should('be.visible')
        cy.get('button[data-testid^="mission-card-"]', { timeout: 10000 })
          .first()
          .scrollIntoView().should('be.visible')

        visit('/game/launchpad', stateWith('launchpad'))
        cy.contains('Your Program', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="launchpad-program-operation-btn"]', { timeout: 10000 })
          .scrollIntoView().should('be.visible')
      })

      it('renders the core C4 economy and progression screens', () => {
        visit('/game/market', stateWith('market'))
        cy.contains('Commodity Exchange', { timeout: 10000 }).should('be.visible')

        visit('/game/refinery', stateWith('refinery'))
        cy.contains('Refinery', { timeout: 10000 }).should('be.visible')

        visit('/game/skills', stateWith('skills'))
        cy.contains('Skill Tree', { timeout: 10000 }).should('be.visible')
      })

      it('renders the infrastructure and surface-operation entry points', () => {
        visit('/game/scan-station', stateWith('scan-station', {
          player: basePlayer({ scannerBuilt: true, scansUsedToday: 0 }),
        }))
        cy.contains('Scanning Station', { timeout: 10000 }).should('be.visible')

        // 'freeops-rover-landing' is a mission-generator *template* id
        // (mission-generator.ts), never a real instantiated mission id — real
        // freeops missions are stamped `freeops-<client>-<template>-<n>` at
        // generation time. Use the always-present static M1 mission instead,
        // the same substitution regression/review-tickets.cy.ts's rover-pause
        // test already relies on to exercise this route.
        visit('/game/rover-mining', stateWith('rover-mining', {
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'eros',
          player: basePlayer({
            activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Rover landing -> Eros' },
            missionPhase: 'mining',
            roverMiningStartedAt: Date.now() - 30_000,
          }),
        }))
        cy.contains('Rover Mining', { timeout: 10000 }).should('be.visible')
      })

      it('keeps the satellite narrative gates explicit at each C4 stage', () => {
        visit('/game/galaxy', stateWith('galaxy', {
          player: basePlayer({ satelliteMonitoringBuilt: false, transitSatelliteLaunchedAt: null }),
        }))
        cy.contains('Place the Earth-base', { timeout: 10000 }).should('be.visible')

        visit('/game/galaxy', stateWith('galaxy', {
          player: basePlayer({ satelliteMonitoringBuilt: true, transitSatelliteLaunchedAt: null }),
        }))
        cy.contains('Launch Transit Telescope', { timeout: 10000 }).should('be.visible')

        visit('/game/galaxy', stateWith('galaxy', {
          player: basePlayer({ satelliteMonitoringBuilt: true, transitSatelliteLaunchedAt: Date.now() - 60_000 }),
        }))
        cy.contains('Satellite Monitoring Station', { timeout: 10000 }).should('be.visible')
      })

      it('keeps the Scene 4 setup borders above the fixed action bar', () => {
        visit('/game/fab', stateWith('fab', {
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'eros',
          player: basePlayer({ missionsDone: 0, freeOperations: false }),
        }))
        cy.contains('Confirm Rocket', { timeout: 10000 }).should('be.visible')
        // AssemblyScreen never passes a `step` prop to MissionSetupShell (it's
        // the last step in the flow — "Confirm Launch" is the CTA, not a "next"
        // step), so `[data-testid="step-footer"]` never renders here; the real
        // fixed bottom element on this screen is the sticky actions bar.
        cy.get('[data-ui-zone="bottom-actions"]').then($footer => {
          const footerTop = $footer[0].getBoundingClientRect().top
          cy.get('.assembly-frame, .assembly-card').each($container => {
            expect($container[0].getBoundingClientRect().bottom, 'setup border ends above footer')
              // Browser layout can produce fractional pixel positions in
              // landscape; allow a 2px rasterisation tolerance while still
              // asserting that the setup card cannot overlap the fixed bar.
              .to.be.at.most(footerTop + 2)
          })
        })
      })
    })
  }
})

describe('C1–C3 persisted mission edge states', () => {
  beforeEach(() => cy.viewport(390, 844))

  it('preserves an active mission when the player opens the mission board', () => {
    // missionId/targetId are the board's *new-selection* workflow state, separate
    // from player.activeMission (the in-flight run) — start with no selection so
    // the assertion below actually exercises onPickMission's active-mission guard
    // (lib/contexts/useGameLoop.ts) instead of trivially matching a pre-set value.
    visit('/game/missions', stateWith('missions', {
      missionId: null,
      targetId: null,
      player: basePlayer({
        missionsDone: 0,
        freeOperations: false,
        activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Starter bulk contract' },
        missionRunId: 'e2e-active-run',
        missionPhase: 'mining',
        miningCargoInProgress: { platinum: 2 },
      }),
    }))
    cy.contains('Mission Board', { timeout: 10000 }).should('be.visible')
    cy.get('button[data-testid^="mission-card-"]')
      .first()
      .scrollIntoView().click({ force: true })
    cy.window().then(win => {
      const saved = JSON.parse(win.localStorage.getItem(STORAGE_KEY) || '{}') as GameState
      expect(saved.player.activeMission?.id).to.eq('generated-s1-starter-bulk-1')
      expect(saved.missionId).to.eq(null)
    })
  })

  it('keeps a two-leg mission in delivery mode after pickup cargo is secured', () => {
    visit('/game/transit', stateWith('transit', {
      missionId: 'lnm_m3_relay_bennu_vesta',
      targetId: 'bennu',
      deliveryTargetId: 'vesta',
      player: basePlayer({
        headingToDelivery: true,
        missionRunId: 'e2e-delivery-run',
        missionPhase: 'transit',
        transitStartedAt: Date.now() - 10_000,
        arrivalAt: Date.now() + 90_000,
      }),
    }))
    cy.contains('Delivery', { timeout: 10000 }).should('be.visible')
    cy.contains('Vesta').should('be.visible')
  })

  it('shows an explicit zero payout when an incomplete run returns empty', () => {
    visit('/game/debrief', stateWith('debrief', {
      missionId: 'generated-s1-starter-bulk-1',
      targetId: 'eros',
      lastCargo: {},
      player: basePlayer({ missionsDone: 0, freeOperations: false }),
    }))
    cy.contains('Returned', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="resolve-cargo-btn"]').click()
    cy.contains('Francs Earned').should('be.visible')
    cy.contains('Contract bonus forfeited').should('be.visible')
  })
})
