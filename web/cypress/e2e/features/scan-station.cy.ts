// E2E coverage for the Scan Station (KES-129, part of the post-tutorial
// mechanic audit in KES-126): the mechanic was fully implemented
// (ScanSystem.ts) but shipped flag-off (NEXT_PUBLIC_FEATURE_SCAN_STATION,
// STS-618) with zero e2e coverage and no in-game rationale copy. Decided
// 2026-08-07 (Liam) to ship this sprint. This spec covers the build-gate
// unlock, the start-scan -> collect-scan loop, and the new ScanStationCoach.

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const COACH_KEY = 'landnam_scan_station_coach_seen_v1'

function basePlayer(overrides: Partial<GameState['player']> = {}): GameState['player'] {
  return {
    francs: 9_000_000_000,
    activeMission: null,
    missionCount: 4,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 0 },
    controlBuilt: false,
    missionsDone: 4,
    freeOperations: true,
    clientMissions: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    ...overrides,
  } as GameState['player']
}

function visitWithState(path: string, screen: GameState['screen'], playerOverrides: Partial<GameState['player']>) {
  const full: GameState = {
    screen,
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    player: basePlayer(playerOverrides),
  } as GameState

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
      // Player already crossed the M1-M3 -> Free Ops threshold in this
      // fixture — acknowledge the one-time "Program Online" interstitial
      // so it doesn't cover the screen under test (see TutorialCompleteSheet.tsx).
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
    },
  })
}

describe('Scan Station', () => {
  it('is buildable from Earth Base once Free Operations is reached (feature flag on)', () => {
    visitWithState('/game/build', 'build-place', { placed: ['launchpad'] })
    cy.contains('Scanning Station', { timeout: 10000 }).should('be.visible')
  })

  it('shows the rationale copy, scan counter, and the ScanStationCoach on first visit', () => {
    cy.visit('/game/scan-station', {
      onBeforeLoad(win) {
        const full: GameState = {
          screen: 'scan-station',
          missionId: null, targetId: null,
          rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
          lastCargo: null, tutorial: false, doneSteps: {}, popup: null, menuOpen: false,
          player: basePlayer({
            placed: ['launchpad', 'scan-station'],
            placementPlots: { launchpad: 0, 'scan-station': 1 },
            scannerBuilt: true,
          }),
        } as GameState
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
        win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
        win.localStorage.setItem('ln_tutorial_complete_ack', '1')
        win.localStorage.removeItem(COACH_KEY)
      },
    })

    cy.get('[data-testid="scan-station-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('Remote Target Scanner').should('be.visible')
    cy.contains('Scouting from orbit before you launch').should('be.visible')
    cy.contains('SCANS TODAY').should('be.visible')

    // Coach fires on first visit, walks all 3 steps, then dismisses and persists.
    cy.get('[data-testid="scan-station-coach"]').should('be.visible')
    cy.contains('SCOUT BEFORE YOU LAND').should('be.visible')
    cy.get('[data-testid="scan-station-coach-next"]').click()
    cy.contains('THREE SCANS TO MAP').should('be.visible')
    cy.get('[data-testid="scan-station-coach-next"]').click()
    cy.contains('A LIMITED DAILY RESOURCE').should('be.visible')
    cy.get('[data-testid="scan-station-coach-next"]').click()
    cy.get('[data-testid="scan-station-coach"]').should('not.exist')
    cy.window().then(win => {
      expect(win.localStorage.getItem(COACH_KEY)).to.eq('1')
    })
  })

  it('does not show the coach again on a second visit once dismissed', () => {
    cy.visit('/game/scan-station', {
      onBeforeLoad(win) {
        const full: GameState = {
          screen: 'scan-station',
          missionId: null, targetId: null,
          rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
          lastCargo: null, tutorial: false, doneSteps: {}, popup: null, menuOpen: false,
          player: basePlayer({
            placed: ['launchpad', 'scan-station'],
            placementPlots: { launchpad: 0, 'scan-station': 1 },
            scannerBuilt: true,
          }),
        } as GameState
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
        win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
        win.localStorage.setItem('ln_tutorial_complete_ack', '1')
        win.localStorage.setItem(COACH_KEY, '1')
      },
    })
    cy.get('[data-testid="scan-station-screen"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="scan-station-coach"]').should('not.exist')
  })

  it('starts a scan on an unmapped target', () => {
    cy.visit('/game/scan-station', {
      onBeforeLoad(win) {
        const full: GameState = {
          screen: 'scan-station',
          missionId: null, targetId: null,
          rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
          lastCargo: null, tutorial: false, doneSteps: {}, popup: null, menuOpen: false,
          player: basePlayer({
            placed: ['launchpad', 'scan-station'],
            placementPlots: { launchpad: 0, 'scan-station': 1 },
            scannerBuilt: true,
          }),
        } as GameState
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
        win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
        win.localStorage.setItem('ln_tutorial_complete_ack', '1')
        win.localStorage.setItem(COACH_KEY, '1')
      },
    })

    cy.get('[data-testid="scan-station-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('433 Eros', { timeout: 10000 }).should('be.visible')
    // The target list re-renders once the async catalog fetch settles
    // (falls back to STATIC_CATALOG against this offline profile); clicking
    // before that swap lands on a node that's about to be replaced and the
    // click is lost. Give it a beat, matching this suite's existing tolerance
    // for catalog-hydration races elsewhere.
    cy.wait(1500)
    cy.get('[data-testid="scan-station-start-scan-eros"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'START SCAN')
      .click()
    cy.contains('SCANNING IN PROGRESS', { timeout: 10000 }).scrollIntoView().should('be.visible')
  })

  it('collects a completed scan and updates the target scan count', () => {
    cy.visit('/game/scan-station', {
      onBeforeLoad(win) {
        const full: GameState = {
          screen: 'scan-station',
          missionId: null, targetId: null,
          rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
          lastCargo: null, tutorial: false, doneSteps: {}, popup: null, menuOpen: false,
          player: basePlayer({
            placed: ['launchpad', 'scan-station'],
            placementPlots: { launchpad: 0, 'scan-station': 1 },
            scannerBuilt: true,
            activeScan: { targetId: 'eros', completesAt: Date.now() - 1000 },
          }),
        } as GameState
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
        win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
        win.localStorage.setItem('ln_tutorial_complete_ack', '1')
        win.localStorage.setItem(COACH_KEY, '1')
      },
    })

    cy.get('[data-testid="scan-station-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('SCAN COMPLETE', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="scan-station-collect-btn"]').click()
    cy.contains('1/3 SCANS', { timeout: 10000 }).should('be.visible')
  })
})
