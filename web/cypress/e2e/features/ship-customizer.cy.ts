import { seedFixtureSession } from '../../support/authenticated-fixture'

describe('Ship Customiser staged build', () => {
  function contrastRatio(foreground: string, background: string) {
    const channels = (color: string) => (color.match(/\d+(?:\.\d+)?/g) ?? []).slice(0, 3).map(Number)
    const luminance = (color: string) => channels(color).map(channel => {
      const normalized = channel / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
    const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
    return (light + 0.05) / (dark + 0.05)
  }

  function visitCustomizer() {
    cy.visit('/game/hangar', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify({
          screen: 'hangar',
          player: {
            missionsDone: 1,
            // Kept low enough that a single part's cost (~2-8M) actually moves the
            // compact-formatted `ship-budget` text — at the previous 15B starting
            // balance every part cost rounded away in the "F15.0B" display (billion
            // scale rounds to the nearest 100M), so the budget-changed assertions
            // below always failed regardless of whether the deduction happened.
            francs: 100_000_000,
            placed: ['launchpad'],
            placementPlots: { launchpad: 0 },
            unlockedSkillNodes: ['ship-customizer-1'],
          },
          tutorial: false,
          doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 9: true },
          missionId: 'generated-starter-bulk-4',
          targetId: 'eros',
          rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
          lastCargo: null,
          popup: null,
        }))
        seedFixtureSession(win)
      },
    })
  }

  function openCustomizer() {
    cy.location('pathname', { timeout: 10000 }).should('eq', '/game/hangar')
    cy.get('[data-testid="hangar-fleet-readout"]').scrollIntoView().should('be.visible')
    cy.get('[data-testid="open-ship-customizer"]', { timeout: 8000 }).should('be.visible').click()
    cy.get('[data-testid="ship-interior-explorer"]').should('be.visible')
  }

  beforeEach(() => {
    visitCustomizer()
  })

  it('opens the customiser route independent of profile state', () => {
    openCustomizer()
    cy.get('[data-testid="ship-build-step"]').within(() => {
      cy.contains('Step 1 / 4').should('be.visible')
      cy.contains('Engine / Thrusters').should('be.visible')
      cy.contains('Ion Thruster T1').should('be.visible')
      cy.contains('Strap Booster Pair').should('not.exist')
    })
    cy.get('[data-testid="confirm-ship-config"]').should('be.disabled')
  })

  it('lets the player replace and refund an unconfirmed stage at full price', () => {
    openCustomizer()
    cy.get('[data-testid="ship-budget"]').invoke('text').then(startingBudget => {
      cy.get('[data-testid="choose-ion-thruster-t1"]').click()
      cy.get('[data-testid="ship-budget"]').should($budget => {
        expect($budget.text()).not.to.eq(startingBudget)
      })
      cy.get('[data-testid="choose-pulse-thruster-t1"]').click()
      cy.get('[data-testid="ship-budget"]').should($budget => {
        expect($budget.text()).not.to.eq(startingBudget)
      })
      cy.get('[data-testid="ship-refund-step"]').click()
      cy.get('[data-testid="ship-budget"]').should('have.text', startingBudget)
      cy.get('[data-testid="ship-review"]').should('have.attr', 'data-installed', '0')
    })
  })

  it('walks engine to payload and confirms the finished configuration', () => {
    openCustomizer()
    cy.get('[data-testid="choose-ion-thruster-t1"]').click()
    cy.get('[data-testid="ship-review"]').should('have.attr', 'data-installed', '1')

    cy.get('[data-testid="ship-step-next"]').click({ force: true })
    cy.get('[data-testid="ship-build-step"]').should('contain', 'Boosters')
    cy.get('[data-testid="choose-strap-booster-t1"]').click()
    cy.get('[data-testid="ship-review"]').should('have.attr', 'data-installed', '2')

    cy.get('[data-testid="ship-step-next"]').click({ force: true })
    cy.get('[data-testid="ship-build-step"]').should('contain', 'Command')
    cy.get('[data-testid="choose-cockpit-command-t1"]').click()
    cy.get('[data-testid="ship-review"]').should('have.attr', 'data-installed', '3')

    cy.get('[data-testid="ship-step-next"]').click({ force: true })
    cy.get('[data-testid="ship-build-step"]').should('contain', 'Payload')
    cy.get('[data-testid="choose-cargo-payload-t1"]').click()
    cy.get('[data-testid="ship-review"]').should('have.attr', 'data-installed', '4')

    cy.get('[data-testid="confirm-ship-config"]').should('not.be.disabled').click()
    // onClose() fires immediately after confirm, so the interior unmounts and the Hangar fleet readout returns
    cy.get('[data-testid="ship-interior-explorer"]').should('not.exist')
    cy.get('[data-testid="hangar-fleet-readout"]').scrollIntoView().should('be.visible')

    // Confirmed loadout is real game state, not a mock that resets on close —
    // the Hangar reflects it immediately without needing to reopen the modal.
    cy.get('[data-testid="ship-customizer-loadout-summary"]').should('contain', '4/4 modules fitted')
  })

  it('fits modules with a real pointer click at desktop and compact-landscape sizes', () => {
    ;([[1440, 900], [844, 390]] as Array<[number, number]>).forEach(([width, height]) => {
      cy.viewport(width, height)
      visitCustomizer()
      openCustomizer()
      cy.get('[data-testid="choose-ion-thruster-t1"]')
        .scrollIntoView()
        .should('be.visible')
        .click()
      cy.get('[data-testid="ship-review"]').should('have.attr', 'data-installed', '1')
    })
  })

  it('keeps the light-theme Hangar legible and unclipped across supported viewports', () => {
    const viewports: Array<[number, number]> = [[844, 390], [926, 428], [390, 844], [1440, 900]]

    viewports.forEach(([width, height]) => {
      cy.viewport(width, height)
      visitCustomizer()
      cy.get('[data-testid="hangar-screen"]').should('be.visible')
      cy.get('[data-testid="open-ship-customizer"]').then($button => {
        const bounds = $button[0].getBoundingClientRect()
        expect(bounds.width, `${width}x${height} customiser width`).to.be.greaterThan(43)
        expect(bounds.height, `${width}x${height} customiser hit area`).to.be.greaterThan(43)
      })
      cy.get('[data-testid="hangar-screen"]').then($screen => {
        const screen = $screen[0]
        const style = getComputedStyle(screen)
        expect(style.getPropertyValue('--ln-bp-ink').trim(), `${width}x${height} has no blueprint-only ink`).to.eq('')
        expect(style.getPropertyValue('--ln-text').trim(), `${width}x${height} light text token`).to.not.eq('')
        expect(document.documentElement.scrollWidth, `${width}x${height} horizontal overflow`).to.be.at.most(width)
      })
      cy.get('[data-testid="hangar-fleet-readout"]').then($readout => {
        const readout = $readout[0]
        const foreground = getComputedStyle(readout.querySelector('strong')!).color
        const background = getComputedStyle(readout).backgroundColor
        expect(contrastRatio(foreground, background), `${width}x${height} fleet readout contrast`).to.be.at.least(4.5)
      })
      cy.get('[data-testid="hangar-customizer-title"]').then($title => {
        expect(contrastRatio(getComputedStyle($title[0]).color, 'rgb(255, 255, 255)'), `${width}x${height} customiser accent contrast`).to.be.at.least(4.5)
      })
      cy.get('[data-testid="hangar-construction-scene"]').should('be.visible')
      cy.get('[data-testid="hangar-fleet-grid"]').scrollIntoView().then($grid => {
        const bounds = $grid[0].getBoundingClientRect()
        expect(bounds.top, `${width}x${height} registry can scroll into view`).to.be.at.least(0)
        expect(bounds.bottom, `${width}x${height} registry is not clipped after scrolling`).to.be.at.most(height)
      })
      cy.screenshot(`ssl-48-hangar-${width}x${height}`)
    })
  })
})
