import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'

const KNOWN_ZONES = [
  'top-chrome',
  'tutorial-rail',
  'screen-content',
  'bottom-actions',
  'bottom-nav',
  'toast-stack',
  'feedback-launcher',
  'ambient-prompt',
  'status-utility',
  'modal-overlay',
]

const VIEWPORTS = [
  { name: 'compact portrait', width: 375, height: 667 },
  { name: 'standard portrait', width: 390, height: 844 },
  { name: 'mobile landscape', width: 844, height: 390 },
  { name: 'tablet portrait', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
] as const

type StateOverride = Omit<Partial<GameState>, 'player'> & {
  player?: Partial<GameState['player']>
}

function fullState(overrides: StateOverride = {}): GameState {
  const player: GameState['player'] = {
    francs: 10_000_000_000,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 1 },
    controlBuilt: false,
    missionsDone: 3,
    skillPoints: 0,
    unlockedSkillNodes: [],
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
    seen_planets: [],
    roverDeployments: [],
    clientTerritories: {},
    ...overrides.player,
  }

  return {
    screen: 'hub',
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
    lastCargo: null,
    tutorial: false,
    doneSteps: {},
    popup: null,
    menuOpen: false,
    ...overrides,
    player,
  }
}

function visitWithState(state: StateOverride) {
  cy.intercept('GET', '**/api/collections/game_states/records*', {
    statusCode: 404,
    body: { message: 'not found' },
  })
  cy.intercept('POST', '**/api/collections/game_states/records', {
    statusCode: 200,
    body: { id: 'ui-zone-state', user: 'e2e-user', state: {} },
  })
  cy.intercept('PATCH', '**/api/collections/game_states/records/*', {
    statusCode: 200,
    body: { id: 'ui-zone-state', user: 'e2e-user', state: {} },
  })
  cy.visit('/game', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState(state)))
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({
        email: 'e2e@landnam.guest',
        password: 'e2e-guest-test',
      }))
    },
  })
}

function rectsIntersect(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function visibleZoneRects(zone: string) {
  return cy.get(`[data-ui-zone="${zone}"]`).then($zones => {
    return [...$zones].flatMap(el => {
      const style = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return []
      return [{ el, rect }]
    })
  })
}

function assertNoZone(zone: string) {
  cy.get(`[data-ui-zone="${zone}"]`).should('not.exist')
}

function assertZoneAvoids(zone: string, forbidden: string) {
  visibleZoneRects(zone).then(subjects => {
    visibleZoneRects(forbidden).then(blockers => {
      for (const subject of subjects) {
        for (const blocker of blockers) {
          const label = `${zone} must not overlap ${forbidden}`
          expect(rectsIntersect(subject.rect, blocker.rect), label).to.equal(false)
        }
      }
    })
  })
}

function assertTransactionalScreenZones() {
  cy.get('[data-ui-zone="bottom-actions"]').should('be.visible')
  assertKnownZonesOnly()
  assertNoZone('bottom-nav')
  assertNoZone('ambient-prompt')
  assertNoZone('feedback-launcher')
  assertZoneAvoids('toast-stack', 'bottom-actions')
}

function assertKnownZonesOnly() {
  cy.get('[data-ui-zone]').each($el => {
    const zone = $el.attr('data-ui-zone')
    expect(KNOWN_ZONES, `known data-ui-zone for ${$el.prop('tagName')}`).to.include(zone)
  })
}

function controlLabel(el: Element) {
  const html = el as HTMLElement
  return html.dataset.testid
    ?? html.getAttribute('aria-label')
    ?? html.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
    ?? html.tagName
}

function assertVisibleControlsAreTopmost() {
  cy.document().then(doc => {
    const controls = [...doc.querySelectorAll<HTMLElement>('button, [role="button"], a[href], input, select, textarea')]
      .filter(el => {
        const style = getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false
        if (Number(style.opacity) < 0.05 || rect.width < 2 || rect.height < 2) return false
        if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight) return false
        return true
      })

    for (const control of controls) {
      const rect = control.getBoundingClientRect()
      const points = [
        { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, name: 'center' },
        { x: rect.left + Math.min(12, rect.width / 2), y: rect.top + rect.height / 2, name: 'left-mid' },
        { x: rect.right - Math.min(12, rect.width / 2), y: rect.top + rect.height / 2, name: 'right-mid' },
      ]

      for (const point of points) {
        if (point.x < 0 || point.y < 0 || point.x >= window.innerWidth || point.y >= window.innerHeight) continue
        const top = doc.elementFromPoint(point.x, point.y)
        const owned = !!top && (control === top || control.contains(top))
        expect(
          owned,
          `${controlLabel(control)} must be topmost at ${point.name}; found ${top ? controlLabel(top) : 'nothing'}`
        ).to.equal(true)
      }
    }
  })
}

describe('UI zone contract', () => {
  for (const viewport of VIEWPORTS) {
    describe(viewport.name, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height)
      })

      it('uses named zones for global UI on the hub without overlapping tutorial space', () => {
        visitWithState({
          screen: 'hub',
          tutorial: true,
          doneSteps: { 0: true },
          player: { freeOperations: true, missionsDone: 0 },
        })

        cy.get('[data-ui-zone="tutorial-rail"]').should('be.visible')
        cy.get('[data-ui-zone="ambient-prompt"]').should('be.visible')
        // Desktop (>=1024px) deliberately has no bottom tab bar — its destinations
        // hang off the hub's own action rail instead (see `.hub-desktop-nav` /
        // `.bottom-tab-bar { display: none }` in HubScreen.tsx / globals.css).
        if (viewport.width >= 1024) {
          // Present in the DOM but CSS-hidden (`.bottom-tab-bar { display: none }`
          // at >=1024px) rather than unmounted, so assertNoZone (DOM-absence)
          // doesn't fit here the way it does for genuinely-unrendered zones.
          cy.get('[data-ui-zone="bottom-nav"]').should('not.be.visible')
        } else {
          cy.get('[data-ui-zone="bottom-nav"]').should('be.visible')
          assertZoneAvoids('bottom-nav', 'tutorial-rail')
        }
        assertKnownZonesOnly()
        assertZoneAvoids('ambient-prompt', 'tutorial-rail')
        assertNoZone('feedback-launcher')
      })

      it('keeps target picker continue actions free of global nav, prompts, and feedback', () => {
        visitWithState({
          screen: 'targets',
          missionId: 'generated-s1-starter-bulk-1',
          targetId: null,
          player: { missionsDone: 0 },
        })

        cy.contains('Continue · Build').should('be.visible')
        assertTransactionalScreenZones()
      })

      it('keeps rocket purchase actions free of global nav, prompts, and feedback', () => {
        visitWithState({
          screen: 'rocket-buy',
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'mars',
          player: { missionsDone: 0 },
        })

        cy.contains('Select Rocket').should('be.visible')
        assertTransactionalScreenZones()
      })

      it('keeps assembly launch actions free of global nav, prompts, and feedback', () => {
        visitWithState({
          screen: 'fab',
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'mars',
          player: { missionsDone: 0 },
        })

        cy.get('[data-testid="launch-btn"]').should('be.visible')
        assertTransactionalScreenZones()
      })

      it('keeps transit actions free of global nav, prompts, and feedback', () => {
        visitWithState({
          screen: 'transit',
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'mars',
          player: {
            activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order -> Mars' },
            missionPhase: 'transit',
          },
        })

        cy.contains('Arrive').should('be.visible')
        assertTransactionalScreenZones()
      })

      it('keeps refinery actions free of global nav, prompts, and feedback', () => {
        visitWithState({
          screen: 'refinery',
          player: {
            freeOperations: true,
            refineryUnlocked: true,
            refineryBuilt: true,
            placed: ['launchpad', 'refinery'],
            placementPlots: { launchpad: 1, refinery: 2 },
            stash: { cobalt: 3 },
          },
        })

        cy.contains('Refined Cobalt').click()
        assertTransactionalScreenZones()
      })

      it('keeps debrief reward collection free of global nav, prompts, and feedback', () => {
        visitWithState({
          screen: 'debrief',
          missionId: 'generated-s1-starter-bulk-1',
          targetId: 'mars',
          lastCargo: { iron: 6 },
          player: {
            activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order -> Mars' },
            missionPhase: 'debrief',
            stash: { iron: 6 },
            freeOperations: true,
          },
        })

        cy.get('[data-testid="resolve-cargo-btn"]').click()
        assertTransactionalScreenZones()
      })

      it('keeps visible controls topmost across representative game states', () => {
        const states: StateOverride[] = [
          { screen: 'hub', tutorial: false, player: { freeOperations: true, missionsDone: 3 } },
          { screen: 'hub', tutorial: false, menuOpen: true, player: { freeOperations: true, missionsDone: 3 } },
          { screen: 'build', tutorial: false, player: { placed: [], placementPlots: {}, freeOperations: true } },
          { screen: 'missions', tutorial: false, player: { missionsDone: 0 } },
          { screen: 'targets', missionId: 'generated-s1-starter-bulk-1', targetId: null, tutorial: false, player: { missionsDone: 0 } },
          { screen: 'rocket-buy', missionId: 'generated-s1-starter-bulk-1', targetId: 'mars', tutorial: false, player: { missionsDone: 0 } },
          { screen: 'fab', missionId: 'generated-s1-starter-bulk-1', targetId: 'mars', tutorial: false, player: { missionsDone: 0 } },
          {
            screen: 'transit',
            missionId: 'generated-s1-starter-bulk-1',
            targetId: 'mars',
            tutorial: false,
            player: {
              activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order -> Mars' },
              missionPhase: 'transit',
            },
          },
          {
            screen: 'debrief',
            missionId: 'generated-s1-starter-bulk-1',
            targetId: 'mars',
            lastCargo: { iron: 6 },
            tutorial: false,
            player: {
              activeMission: { id: 'generated-s1-starter-bulk-1', label: 'Iron starter order -> Mars' },
              missionPhase: 'debrief',
              stash: { iron: 6 },
            },
          },
          {
            screen: 'refinery',
            tutorial: false,
            player: {
              freeOperations: true,
              refineryUnlocked: true,
              refineryBuilt: true,
              placed: ['launchpad', 'refinery'],
              placementPlots: { launchpad: 1, refinery: 2 },
              stash: { cobalt: 3 },
            },
          },
          { screen: 'hangar', tutorial: false, player: { missionsDone: 3 } },
          { screen: 'skills', tutorial: false, player: { skillPoints: 3, missionsDone: 3 } },
          { screen: 'hub', popup: 'loan', tutorial: false, player: { francs: 100_000_000, loanDebt: 0, loanOffered: true } },
        ]

        for (const state of states) {
          visitWithState(state)
          assertVisibleControlsAreTopmost()
        }
      })

      it('keeps visible controls topmost during onboarding/tutorial states', () => {
        const states: StateOverride[] = [
          {
            screen: 'build',
            tutorial: true,
            doneSteps: {},
            player: { placed: [], placementPlots: {}, missionsDone: 0 },
          },
          {
            screen: 'hub',
            tutorial: true,
            menuOpen: true,
            doneSteps: { 0: true },
            player: { missionsDone: 0 },
          },
          {
            screen: 'missions',
            tutorial: true,
            doneSteps: { 0: true, 1: true },
            player: { missionsDone: 0 },
          },
          {
            screen: 'targets',
            missionId: 'generated-s1-starter-bulk-1',
            targetId: null,
            tutorial: true,
            doneSteps: { 0: true, 1: true, 2: true },
            player: { missionsDone: 0 },
          },
          {
            screen: 'fab',
            missionId: 'generated-s1-starter-bulk-1',
            targetId: 'mars',
            tutorial: true,
            doneSteps: { 0: true, 1: true, 2: true, 3: true },
            player: { missionsDone: 0 },
          },
        ]

        for (const state of states) {
          visitWithState(state)
          cy.get('[data-testid="tutorial-coach-block"]').should('be.visible')
          assertVisibleControlsAreTopmost()
        }
      })
    })
  }
})
