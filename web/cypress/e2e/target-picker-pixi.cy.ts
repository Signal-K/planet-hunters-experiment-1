describe('TargetPicker Pixi galaxy map', () => {
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

  const expectPixiMapToFillAndRender = () => {
    cy.get('[data-testid="target-picker-pixi-map"]', { timeout: 10000 })
      .should('be.visible')
      .should($canvas => {
        const canvas = $canvas[0] as HTMLCanvasElement
        const rect = canvas.getBoundingClientRect()
        const parentRect = canvas.parentElement!.getBoundingClientRect()

        expect(rect.width).to.be.greaterThan(280)
        expect(rect.height).to.be.greaterThan(240)
        expect(Math.round(rect.width)).to.eq(Math.round(parentRect.width))
        expect(Math.round(rect.height)).to.eq(Math.round(parentRect.height))
        expect(canvas.width).to.be.greaterThan(0)
        expect(canvas.height).to.be.greaterThan(0)

        const dataUrl = canvas.toDataURL('image/png')
        expect(dataUrl.length).to.be.greaterThan(1000)
      })
  }

  it('renders a nonblank Pixi map on mobile', () => {
    cy.viewport(390, 844)
    visitTargetPicker()
    expectPixiMapToFillAndRender()
  })

  it('renders a nonblank Pixi map on desktop', () => {
    cy.viewport(1280, 900)
    visitTargetPicker()
    expectPixiMapToFillAndRender()
  })
})
