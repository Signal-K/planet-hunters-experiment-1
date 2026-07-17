describe('Ship Customiser staged build', () => {
  function visitCustomizer() {
    cy.visit('/game/hangar', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({
          email: 'e2e@landnam.guest',
          password: 'e2e-password',
        }))
        win.localStorage.setItem('pocketbase_auth', JSON.stringify({
          token: 'e2e-token',
          record: { id: 'e2e-user', email: 'e2e@landnam.guest' },
        }))
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify({
          screen: 'hangar',
          player: {
            missionsDone: 1,
            francs: 15_000_000_000,
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
      },
    })
  }

  function openCustomizer() {
    cy.location('pathname', { timeout: 10000 }).should('eq', '/game/hangar')
    cy.contains('Rocket Fleet').should('be.visible')
    cy.get('body').then($body => {
      if ($body.find('[data-testid="auth-gate-skip"]').length > 0) {
        cy.get('[data-testid="auth-gate-skip"]').click()
        cy.get('[data-testid="auth-gate-skip"]').should('not.exist')
      }
    })
    cy.get('[data-testid="open-ship-customizer"]', { timeout: 8000 }).should('be.visible').click()
    cy.get('[data-testid="ship-interior-sr1"]').should('be.visible')
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
    // onClose() fires immediately after confirm, so the interior unmounts and the fleet page returns
    cy.get('[data-testid="ship-interior-sr1"]').should('not.exist')
    cy.contains('Rocket Fleet').should('be.visible')

    // Confirmed loadout is real game state, not a mock that resets on close —
    // the Hangar reflects it immediately without needing to reopen the modal.
    cy.get('[data-testid="ship-customizer-loadout-summary"]').should('contain', '4/4 modules fitted')
  })
})
