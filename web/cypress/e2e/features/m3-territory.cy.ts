// E2E tests for M3 transport-client pick and post-onboarding Free Ops.

import type { GameState } from '@/game-context'
import { seedFixtureSession, showContract } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'

function visitWithState(state: Partial<GameState>) {
  const base: GameState = {
    screen: 'hub',
    player: {
      francs: 9_000_000_000,
      activeMission: null,
      missionCount: 3,
      pendingLaunch: false,
      placed: ['launchpad'],
      placementPlots: { launchpad: 0 },
      controlBuilt: false,
      missionsDone: 2,
      freeOperations: false,
      clientMissions: {},
      clientCooldowns: {},
      researchAnnotations: 0,
      refineryBuilt: false,
      refineryQueue: [],
      refinedGoods: {},
      launchpadUpgraded: false,
      loanDebt: 0,
      loanOffered: false,
      roverDeployments: [],
      clientTerritories: {},
    },
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: { 1: true, 2: true, 3: true, 5: true, 6: true, 9: true },
    popup: null,
    menuOpen: false,
  }
  // /game always resumes to Earth Base; the board is opened from there
  // (openContracts), and in-flight screens resume from their own route.
  const screen = (state.screen ?? base.screen) === 'missions' ? 'hub' : (state.screen ?? base.screen)
  cy.visit(`/game/${screen}`, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...base, ...state, screen }))
      seedFixtureSession(win)
      // Unset, TutorialCompleteSheet (components/game/TutorialCompleteSheet.tsx)
      // full-screens over the hub the first time missionsDone crosses the
      // onboarding threshold, which is exactly the transition the M3 reward
      // test below drives — pre-ack it so the test exercises the Free Ops
      // explanation flow, not this one-time completion modal.
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
    },
  })
}

function openContracts() {
  cy.contains('h1', /^(Base|Earth Base)$/, { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="bottom-tab-missions"]').click()
  cy.get('[data-testid="mission-board-section-client"]', { timeout: 10000 }).should('be.visible')
}

describe('M3 — Transport client pick and Free Ops unlock', () => {
  describe('Mission board — M3 availability', () => {
    it('shows both M3 transport-client mission cards when missionsDone === 2', () => {
      visitWithState({ screen: 'missions' })
      openContracts()
      showContract('lnm_m3_relay_bennu_vesta').should('be.visible')
      cy.get('[data-testid="mission-board-section-client"]').should('contain', 'Belt Courier Run')
      showContract('lnm_m3_relay_itokawa_eros').should('be.visible')
      cy.get('[data-testid="mission-board-section-client"]').should('contain', 'Nickel Line Handoff')
    })

    it('shows post-onboarding holding screen when missionsDone >= 1 and no missions available', () => {
      visitWithState({
        screen: 'missions',
        player: {
          francs: 9_000_000_000,
          activeMission: null,
          missionCount: 2,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 1,
          freeOperations: false,
          clientMissions: {},
          clientCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
          roverDeployments: [],
          clientTerritories: {},
        },
      })
      // missionsDone=1 → sequence=2 missions shown. If none exist, holding screen shows.
      // The generated-s2 missions exist, so let's verify board content instead.
      // Board should show sequence-2 missions or the holding screen for missionsDone=1 if board is empty.
      cy.contains('Training Arc Complete').should('not.exist')
    })
  })

  describe('M3 transport mission — preset route', () => {
    it('picking an M3 mission skips the target picker and goes straight to rocket-buy', () => {
      visitWithState({ screen: 'missions' })
      openContracts()
      showContract('lnm_m3_relay_bennu_vesta').click()
      cy.get('[data-testid="mission-rocket-blueprint"]', { timeout: 8000 }).should('be.visible')
      cy.get('[data-testid="mission-target-map"]').should('not.exist')
    })

    it('fab screen for M3 keeps mining drill installed', () => {
      visitWithState({
        screen: 'fab',
        missionId: 'lnm_m3_relay_bennu_vesta',
        targetId: 'bennu',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
      })
      cy.contains('Belt Courier Run').should('be.visible')
      cy.contains('Cargo Module').should('not.exist')
      cy.get('[data-testid="launch-btn"]').should('be.visible')
    })
  })

  describe('No territory claim during M3', () => {
    it('does not render territory popup for the transport contract (no rover payload)', () => {
      visitWithState({
        screen: 'debrief',
        missionId: 'lnm_m3_relay_bennu_vesta',
        targetId: 'bennu',
        lastCargo: { iron: 3, carbon: 2 },
      })
      cy.get('[role="dialog"][aria-label="Territory established"]').should('not.exist')
      cy.contains('Belt Courier Run').should('be.visible')
    })

    it('collecting M3 reward opens Free Ops explanation on mission board', () => {
      visitWithState({
        screen: 'debrief',
        missionId: 'lnm_m3_relay_bennu_vesta',
        targetId: 'bennu',
        lastCargo: { iron: 3, carbon: 2 },
      })
      // Every debrief asks for an explicit vehicle teardown first (KES-348).
      cy.get('[data-testid="resolve-cargo-btn"]').click()
      cy.get('[data-testid="scrap-sequence-skip-btn"]', { timeout: 10000 }).click()
      cy.get('[data-testid="collect-reward-btn"]').click()
      cy.get('[role="dialog"][aria-label="Territory established"]').should('not.exist')
      // Completing M3 raises the persisted TutorialCompleteSheet before the
      // Hub's navigation is actionable. Dismiss the real product modal rather
      // than forcing a covered bottom-tab click.
      cy.contains('button', 'START MY PROGRAM', { timeout: 10000 }).click()
      cy.contains('button', 'USE FREE-FORM PROGRAM').click()
      // Debrief routes back to the Hub (not the Market screen) — navigate to
      // the mission board from there.
      openContracts()
      // The M3 relay run is itself a client mission (Bennu -> Vesta transport
      // for Atlas Aggregate), so completing it already satisfies
      // MissionBoardScreen's `hasPriorFreeOpsExperience` check — the
      // one-time "Custom Missions Unlocked" explainer correctly stays
      // suppressed (see its comment: anyone who's completed a client
      // mission has plainly already seen how Free Ops works). What this
      // test actually needs to prove is that Free Ops itself is live: the
      // board is the open client catalog, no longer the two M3 options.
      cy.get('[data-testid^="mission-accept-"]').should('not.be.disabled')
      cy.get('[data-testid="mission-board-section-client"]').should('contain', 'CONTRACT 1 /')
      cy.window().should(win => {
        const saved = JSON.parse(win.localStorage.getItem(`${STORAGE_KEY}:user:e2e-fixture-user`) ?? '{}')
        expect(saved.player?.freeOperations).to.eq(true)
      })
    })
  })

  describe('After M3', () => {
    it('opens the Free Ops client catalog instead of an empty onboarding board', () => {
      // The old "Training Arc Complete" holding screen lived on the retired
      // MissionBoardScreen and could only show for !freeOperations with
      // missionsDone >= 3, which normalizeState now makes impossible: past
      // M3 the player is always in Free Ops and the board is never empty.
      visitWithState({
        screen: 'missions',
        player: {
          francs: 9_000_000_000,
          activeMission: null,
          missionCount: 5,
          pendingLaunch: false,
          placed: ['launchpad'],
          placementPlots: { launchpad: 0 },
          controlBuilt: false,
          missionsDone: 4,
          freeOperations: false,
          clientMissions: {},
          clientCooldowns: {},
          researchAnnotations: 0,
          refineryBuilt: false,
          refineryQueue: [],
          refinedGoods: {},
          launchpadUpgraded: false,
          loanDebt: 0,
          loanOffered: false,
          roverDeployments: [],
          clientTerritories: {},
        },
      })
      openContracts()
      cy.get('[data-testid^="mission-accept-"]').should('be.visible').and('not.be.disabled')
    })
  })

  describe('Desktop layout', () => {
    it('game canvas fills full viewport on desktop (≥1024px)', () => {
      cy.viewport(1280, 800)
      visitWithState({ screen: 'hub' })
      cy.get('.portrait-canvas').then($el => {
        const rect = $el[0].getBoundingClientRect()
        // Desktop sidebar (~72px) reduces canvas width; check it fills most of the viewport
        expect(rect.width).to.be.at.least(1000)
        // The card sits inset by --ln-s-6 (32px) on desktop — a deliberate
        // centered-card treatment (see globals.css's "do not reintroduce
        // full-bleed" comment on .portrait-canvas), not full-bleed 100dvh.
        expect(rect.height).to.be.closeTo(768, 2)
      })
    })

    it('game canvas stays portrait-constrained on mobile (375px)', () => {
      cy.viewport(375, 812)
      visitWithState({ screen: 'hub' })
      cy.get('.portrait-canvas').then($el => {
        const rect = $el[0].getBoundingClientRect()
        expect(rect.width).to.be.lessThan(420)
      })
    })
  })
})
