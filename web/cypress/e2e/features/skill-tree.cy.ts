// E2E coverage for SkillTreeScreen (KES-134, part of the post-tutorial
// mechanic audit in KES-126): reachable from Earth Base training nav with
// no mission gate, but it shipped with zero test coverage (only an
// incidental hit in dev-shortcuts.cy.ts) and no coach/explanation of
// where Skill Points come from or what License Grade does. Liam decided
// (2026-08-07) this stays plain DOM/CSS rather than a PixiJS node-graph, so
// SkillTreeCoach is the full remediation for the explanation gap. This spec
// covers node select -> spend point -> confirm.

import type { GameState } from '@/game-context'
import { seedFixtureSession } from '../../support/authenticated-fixture'

const STORAGE_KEY = 'landnam-game-state-v1'

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

function visitSkills(playerOverrides: Partial<GameState['player']> = {}) {
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
      seedFixtureSession(win)
      win.localStorage.setItem('ln_tutorial_complete_ack', '1')
    },
  })
}

describe('Skill Tree screen', () => {
  ;[844, 926].forEach((width, index) => {
    const height = index === 0 ? 390 : 428
    it(`keeps compact landscape install controls reachable at ${width}x${height}`, () => {
      cy.viewport(width, height)
      visitSkills({})
      cy.get('[data-testid="skill-tree-screen"]', { timeout: 10000 }).should('be.visible')
      cy.contains('[data-testid="skill-tree-screen"] button', 'Install Upgrade').then($button => {
        const rect = $button[0].getBoundingClientRect()
        expect(rect.height, 'skill install hit area').to.be.at.least(44)
        expect(rect.top, 'skill install top edge').to.be.at.least(0)
        expect(rect.bottom, 'skill install bottom edge').to.be.at.most(height)
      })
      cy.contains('[data-testid="skill-tree-screen"] button', 'Upgrade to').then($button => {
        const rect = $button[0].getBoundingClientRect()
        expect(rect.height, 'license upgrade hit area').to.be.at.least(44)
        expect(rect.bottom, 'license upgrade bottom edge').to.be.at.most(height)
      })
      cy.get('[data-testid="skill-tree-content"]').should($content => {
        expect($content[0].scrollHeight, 'screen scroll height').to.be.at.most($content[0].clientHeight + 1)
      })
    })
  })

  it('renders the license grade panel and every skill node', () => {
    visitSkills({})
    cy.get('[data-testid="skill-tree-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('FLIGHT AUTHORITY').should('exist')
    cy.contains('Skill Nodes').should('be.visible')
    cy.contains('Laser Charge I').should('be.visible')
  })

  it('unlocks a node: select an affordable node, spend the point, and see it flip to Unlocked', () => {
    visitSkills({ skillPoints: 3, unlockedSkillNodes: [] })
    cy.get('[data-testid="skill-tree-screen"]', { timeout: 10000 }).should('be.visible')
    cy.contains('button', 'Unlock').first().click()
    cy.contains('Unlocked', { timeout: 10000 }).should('be.visible')
  })
})
