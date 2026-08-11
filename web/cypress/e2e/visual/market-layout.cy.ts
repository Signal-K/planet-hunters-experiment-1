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
  ]) {
    it(`keeps the header clear at ${viewport.name} size`, () => {
      cy.viewport(viewport.width, viewport.height)
      cy.visit('/game/market', {
        onBeforeLoad(win) {
          win.localStorage.setItem('landnam-game-state-v1', JSON.stringify(state))
          win.localStorage.setItem('landnam-surveys-shown', JSON.stringify(['lnm_first_launch']))
          win.localStorage.setItem('ln_tutorial_complete_ack', '1')
        },
      })
      cy.contains('h1', 'Commodity Exchange', { timeout: 15000 }).should('be.visible')
      cy.contains('Mineral Inventory', { timeout: 15000 }).should('be.visible')
      cy.screenshot(`market-header-${viewport.name}`)
    })
  }
})
