describe('TargetPicker orbital map', () => {
  const visitTargetPicker = () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify({
          screen: 'targets',
          missionId: 'generated-s1-starter-bulk-1',
          tutorial: false,
        }))
        win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({
          email: 'e2e@landnam.guest',
          password: 'e2e-guest-test',
        }))
      },
    })
  }

  const expectMapToFillAndRender = () => {
    cy.get('[data-testid="target-picker-orbital-map"]', { timeout: 10000 })
      .should('be.visible')
      .should($map => {
        const rect = $map[0].getBoundingClientRect()
        expect(rect.width).to.be.greaterThan(280)
        expect(rect.height).to.be.greaterThan(240)
        expect($map.find('svg').length).to.eq(1)
        expect($map.find('svg circle, svg polygon').length).to.be.greaterThan(0)
      })
  }

  it('renders a nonblank orbital map on mobile', () => {
    cy.viewport(390, 844)
    visitTargetPicker()
    expectMapToFillAndRender()
  })

  it('renders a nonblank orbital map on desktop', () => {
    cy.viewport(1280, 900)
    visitTargetPicker()
    expectMapToFillAndRender()
  })

  // Regression guard for h20xtc: map must expand to fill available vertical space
  // (old fixed height was 360px on non-coach screens; flex fill gives ~520px on mobile)
  it('map fills available height — no dead vertical space (h20xtc)', () => {
    cy.viewport(390, 844)
    visitTargetPicker()
    cy.get('[data-testid="target-picker-orbital-map"]', { timeout: 10000 })
      .should('be.visible')
      .should($map => {
        const rect = $map[0].getBoundingClientRect()
        // Must be substantially taller than the old fixed 360px
        expect(rect.height).to.be.greaterThan(400)
      })
  })
})
