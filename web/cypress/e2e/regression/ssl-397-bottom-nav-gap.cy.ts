describe('SSL-397 — Build screen reaches the in-flow Home navigation', () => {
  const viewports = [
    { name: 'phone portrait', width: 390, height: 844 },
    { name: 'desktop landscape', width: 1440, height: 900 },
  ]

  for (const viewport of viewports) {
    it(`keeps the build picker attached to the confirmation dock at ${viewport.name}`, () => {
      cy.viewport(viewport.width, viewport.height)
      cy.visit('/game/build?preset=ui-build')

      cy.get('[data-testid="build-place-screen"]', { timeout: 20000 }).should('be.visible')
      cy.get('[data-testid="build-structure-strip"]').should('be.visible')
      cy.get('[data-ui-zone="bottom-actions"]').should('be.visible')
      cy.get('[data-testid="home-bottom-bar"]').should('be.visible')

      cy.get('[data-testid="build-structure-strip"]').then($picker => {
        cy.get('[data-ui-zone="bottom-actions"]').then($actions => {
          cy.get('[data-testid="home-bottom-bar"]').then($nav => {
            const picker = $picker[0].getBoundingClientRect()
            const actions = $actions[0].getBoundingClientRect()
            const nav = $nav[0].getBoundingClientRect()

            expect(picker.bottom, 'picker meets confirmation dock').to.be.closeTo(actions.top, 1)
            expect(actions.bottom, 'confirmation dock meets Home navigation').to.be.closeTo(nav.top, 1)
          })
        })
      })
    })
  }
})
