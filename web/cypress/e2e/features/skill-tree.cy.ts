// E2E coverage for SkillTreeScreen (KES-134, part of the post-tutorial
// mechanic audit in KES-126): reachable from Earth Base training nav with
// no mission gate, but it shipped with zero test coverage (only an
// incidental hit in dev-shortcuts.cy.ts) and no coach/explanation of
// where Skill Points come from or what License Grade does. Liam decided
// (2026-08-07) this stays plain DOM/CSS rather than a PixiJS node-graph, so
// SkillTreeCoach is the full remediation for the explanation gap. This spec
// covers node select -> spend point -> confirm, and the new coach.

import type { GameState } from '@/game-context'

const STORAGE_KEY = 'landnam-game-state-v1'
const COACH_KEY = 'landnam_skill_tree_coach_seen_v1'

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
    skillPoints: 3,
    unlockedSkillNodes: [],
    researchXP: 50,
    licenseGrade: 'Grade I',
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

function visitSkills(playerOverrides: Partial<GameState['player']> = {}, coachSeen = false) {
  const full: GameState = {
    screen: 'skills',
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

  cy.visit('/game/skills', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      win.localStorage.setItem('landnam-account-credentials', JSON.stringify({ email: 'e2e@example.com', password: 'e2e-guest-test' }))
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
      if (coachSeen) {
        win.localStorage.setItem(COACH_KEY, '1')
      } else {
        win.localStorage.removeItem(COACH_KEY)
      }
    },
  })
}

describe('Skill Tree screen', () => {
  it('renders the license grade panel and every skill node', () => {
    visitSkills({}, true)
    cy.get('[data-testid="skill-tree-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('License Grade').should('be.visible')
    cy.contains('Skill Nodes').should('be.visible')
    cy.contains('Laser Charge I').should('be.visible')
  })

  it('unlocks a node: select an affordable node, spend the point, and see it flip to Unlocked', () => {
    visitSkills({ skillPoints: 3, unlockedSkillNodes: [] }, true)
    cy.get('[data-testid="skill-tree-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('button', 'Unlock').first().click()
    cy.contains('Unlocked', { timeout: 10000 }).should('be.visible')
  })

  it('shows the SkillTreeCoach on first visit, walks all 3 steps, then dismisses and persists', () => {
    visitSkills({}, false)
    cy.get('[data-testid="skill-tree-screen"]', { timeout: 10000 }).should('be.visible')

    cy.get('[data-testid="skill-tree-coach"]').should('be.visible')
    cy.contains('SKILL POINTS ARE EARNED, NOT BOUGHT').should('be.visible')
    cy.get('[data-testid="skill-tree-coach-next"]').click()
    cy.contains('LICENSE GRADE GATES YOUR CEILING').should('be.visible')
    cy.get('[data-testid="skill-tree-coach-next"]').click()
    cy.contains('UNLOCKS ARE PERMANENT').should('be.visible')
    cy.get('[data-testid="skill-tree-coach-next"]').click()
    cy.get('[data-testid="skill-tree-coach"]').should('not.exist')
    cy.window().then(win => {
      expect(win.localStorage.getItem(COACH_KEY)).to.eq('1')
    })
  })

  it('does not show the coach again on a second visit once dismissed', () => {
    visitSkills({}, true)
    cy.get('[data-testid="skill-tree-screen"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="skill-tree-coach"]').should('not.exist')
  })
})
