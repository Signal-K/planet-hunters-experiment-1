describe('Commodity Exchange visual layout', () => {
  const state = {
    screen: 'market',
    tutorial: false,
    player: { francs: 50_000_000, missionsDone: 3, freeOperations: true },
    stash: {},
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  }

  for (const viewport of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'desktop-landscape', width: 1440, height: 900 },
  ]) {
    it(`keeps the header clear at ${viewport.name} size`, () => {
      cy.viewport(viewport.width, viewport.height)
      cy.visit('/game/market', {
        onBeforeLoad(win) {
          const serialized = JSON.stringify(state)
          win.localStorage.setItem('landnam-game-state-v1', serialized)
          win.localStorage.setItem('landnam-game-state-v1:user:e2e-user', serialized)
          win.localStorage.setItem('landnam-surveys-shown', JSON.stringify(['lnm_first_launch']))
          win.localStorage.setItem('ln_tutorial_complete_ack', '1')
          // KES-176: without an established session, the tablet iteration
          // raced a "Welcome Back" auth sheet in over the Market header
          // between the h1/Mineral Inventory assertions passing and the
          // screenshot firing, so the captured artifact showed sign-in
          // instead of the layout under test. Same guest-session seed used
          // by tutorial-rail.cy.ts's visitWithState.
          win.localStorage.setItem('landnam-account-credentials', JSON.stringify({
            email: 'e2e@example.com',
            password: 'e2e-guest-test',
          }))
        },
      })
      cy.contains('h1', 'Commodity Exchange', { timeout: 15000 }).should('be.visible')
      cy.contains('Mineral Inventory', { timeout: 15000 }).should('be.visible')
      cy.screenshot(`market-header-${viewport.name}`)
    })
  }
})
