import type { GameState } from '../../../game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_KEY = 'landnam-surveys-shown'
const SNOOZE_KEY = 'landnam-upgrade-prompt-snooze-until'
const TUTORIAL_ACK_KEY = 'ln_tutorial_complete_ack'
const FAR_FUTURE = String(Date.now() + 365 * 24 * 60 * 60 * 1000)
const ALL_SURVEYS = [
  'lnm_first_launch', 'lnm_mining_feel', 'lnm_client_pick',
  'lnm_mission_friction', 'lnm_progression_feel', 'lnm_end_of_content',
  'lnm_return_visit', 'lnm_m1_complete', 'lnm_m2_mission_choice', 'lnm_m2_rocket_clarity', 'lnm_m2_rating', 'lnm_m2_freetext',
  'lnm_m3_transport_clarity', 'lnm_m3_client_choice', 'lnm_m3_rating', 'lnm_m3_freetext',
]

function interceptFeeds() {
  const tokenPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
  const e2eToken = `e30.${tokenPayload}.test`
  cy.intercept('POST', '**/api/collections/users/auth-refresh', {
    statusCode: 200,
    body: { token: e2eToken, record: { id: 'e2e-subject-user', email: 'e2e@example.com' } },
  })
  cy.intercept('GET', '**/api/collections/subjects/records*', {
    statusCode: 200,
    body: {
      page: 1,
      perPage: 500,
      totalItems: 1,
      totalPages: 1,
      items: [{
        id: 'subj-toi-1000',
        subject_type: 'transit',
        gold_label: '',
        consensus: '',
        toi_id: '1000.01',
        tic_id: '12345678',
        period_days: 4.2,
        depth_ppm: 1200,
        distance_ly: 150,
        constellation: 'Lyra',
        signal_to_noise: 18,
        planet_radius_earth: 1.4,
      }],
    },
  }).as('subjects')
  cy.intercept('GET', '**/api/collections/asteroid_candidates/records*', {
    statusCode: 200,
    body: {
      page: 1,
      perPage: 500,
      totalItems: 1,
      totalPages: 1,
      items: [{
        id: 'neo-1',
        tempDesig: 'K26A01',
        score: 88,
        discoveryDate: '2026-09-01',
        ra: 12.5,
        decl: -4.2,
        vMag: 20.1,
        hMag: 24.3,
        nObs: 6,
        arcDays: 0.4,
        lastSeenDays: 0.2,
        resolved: false,
      }],
    },
  }).as('asteroids')
}

function visitHub() {
  interceptFeeds()
  const state: Partial<GameState> = {
    screen: 'hub',
    tutorial: false,
    doneSteps: {},
    player: {
      francs: 11_580_000_000,
      activeMission: null,
      missionCount: 1,
      pendingLaunch: false,
      placed: ['launchpad'],
      placementPlots: { launchpad: 0 },
      controlBuilt: true,
      missionsDone: 3,
      skillPoints: 0,
      unlockedSkillNodes: [],
      freeOperations: true,
      clientMissions: {},
      clientCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: true,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
      transitSatelliteLaunchedAt: Date.now() - 1000,
      tessClassifications: {},
      deepSpaceTelescopeBuilt: true,
      asteroidClassifications: {},
    },
  }

  cy.visit('/game?preset=ui-instrument-hub', {
    onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem(SNOOZE_KEY, FAR_FUTURE)
      win.localStorage.setItem(SURVEY_KEY, JSON.stringify(ALL_SURVEYS))
      win.localStorage.setItem(TUTORIAL_ACK_KEY, '1')
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      seedFixtureSession(win, 'e2e-subject-user')
    },
  })
}

describe('instrument hub orbit downlink', () => {
  it('opens the inspector from the dedicated instrument hub route', () => {
    visitHub()
    cy.get('[data-testid="instrument-hub-screen"]', { timeout: 10_000 }).should('be.visible')
    cy.get('[data-testid="instrument-signal"]', { timeout: 15_000 }).should('exist')
    cy.get('[data-testid="instrument-signal-inspect"]').first().click()
    cy.get('[data-testid="tess-discovery-screen"], [data-testid="asteroid-discovery-screen"]', { timeout: 10_000 }).should('be.visible')
  })
})
