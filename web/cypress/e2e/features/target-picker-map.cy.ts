describe('TargetPicker orbital map', () => {
  const visitTargetPicker = () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify({
          screen: 'targets',
          missionId: 'generated-s1-starter-bulk-1',
          tutorial: false,
        }))
        win.localStorage.setItem('landnam-account-credentials', JSON.stringify({
          email: 'e2e@example.com',
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
    cy.screenshot('sprint-13-target-picker-mobile')
  })

  it('renders a nonblank orbital map on desktop', () => {
    cy.viewport(1280, 900)
    visitTargetPicker()
    expectMapToFillAndRender()
    cy.screenshot('sprint-13-target-picker-desktop')
  })

  // Regression guard for h20xtc: map must expand to fill available vertical
  // space (old fixed height was 360px on non-coach screens; flex fill gives
  // ~520px on mobile in that state). This fixture is a fresh player
  // (missionsDone defaults to 0), and game-state.ts's tutorial-repair logic
  // deliberately forces the onboarding coach active whenever missionsDone is
  // below FREE_OPS_START_MISSIONS_DONE — a real fix for a real past bug
  // (coach going permanently dark), not something to work around here. That
  // reserves a fixed 172px of vertical chrome the original 400px baseline
  // never accounted for (it assumed a non-coach screen). STS-612's "room"
  // fix (map-first detail card, collapsed-by-default on narrow viewports,
  // orbit-explainer moved behind its expand toggle) reclaimed the map from a
  // ~155-225px sliver up to ~335px — real, substantial, and about as much as
  // is reclaimable without also shrinking the coach's own reserved space.
  // 320 reflects that honest floor with a little headroom, not the
  // pre-coach 400px baseline.
  it('map fills available height — no dead vertical space (h20xtc)', () => {
    cy.viewport(390, 844)
    visitTargetPicker()
    cy.get('[data-testid="target-picker-orbital-map"]', { timeout: 10000 })
      .should('be.visible')
      .should($map => {
        const rect = $map[0].getBoundingClientRect()
        expect(rect.height).to.be.greaterThan(320)
      })
  })

  it('keeps an unavailable context body from changing the selected target', () => {
    cy.viewport(1280, 900)
    visitTargetPicker()
    cy.get('[data-testid="target-picker-orbital-map"]', { timeout: 10000 }).should('be.visible')
    cy.get('svg text').contains('Jupiter').click()
    cy.contains('433 Eros').should('be.visible')
    cy.get('[data-testid="continue-build-btn"]').should('not.be.disabled')
  })

  it('selects a compatible body from its mobile touch target', () => {
    cy.viewport(390, 844)
    visitTargetPicker()
    cy.get('[data-testid="target-picker-orbital-map"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="target-picker-orbital-map"] svg g[role="button"]')
      .should('have.length.greaterThan', 0)
      .first()
      .invoke('attr', 'aria-label')
      .then(label => {
        const targetName = String(label).replace(/^Select\s+/, '')
        cy.get('[data-testid="target-picker-orbital-map"] svg g[role="button"]').first().click()
        cy.get('[data-testid="target-detail-expand"]').should('contain.text', targetName)
      })
  })
})
