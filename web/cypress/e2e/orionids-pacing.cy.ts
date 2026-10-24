// Orionids pacing: every stage must take 40 to 120 seconds of real play and need steering.
// Headless (Electron), no window. The sandbox preset pins the sky clock, so peak-hour doubling cannot shorten a run.
const MIN_MS = 40_000
const MAX_MS = 240_000

const VIEWPORTS = [
  { name: 'phone', w: 390, h: 844 },
  { name: 'landscape', w: 926, h: 428 },
  { name: 'desktop', w: 1440, h: 900 },
] as const

// Hold a horizontal drag on the field (pointer events, like a finger), then release.
function drag(canvas: HTMLCanvasElement, dx: number) {
  const r = canvas.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height * 0.7
  const fire = (type: string, cx: number) =>
    canvas.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: cx, clientY: y }))
  fire('pointerdown', x)
  fire('pointermove', x + dx)
}
function release(canvas: HTMLCanvasElement) {
  const r = canvas.getBoundingClientRect()
  canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.7 }))
}

const caught = () => cy.get('[data-testid="mining-order-readout"]').invoke('text').then(t => Number(/(\d+) of 20/.exec(t)?.[1] ?? 0))

describe('Orionids pacing', () => {
  for (const vp of VIEWPORTS) {
    it(`stage 1 shower run takes over 40s and needs weaving (${vp.name})`, { defaultCommandTimeout: 30_000 }, function () {
      if (Cypress.expose('VP') && Cypress.expose('VP') !== vp.name) this.skip()
      cy.viewport(vp.w, vp.h)
      cy.visit('/game/stage?preset=ui-orionids-shower-mining-fresh')
      cy.get('[data-stage-ready="true"]', { timeout: 60_000 })
      cy.get('canvas').first().should('be.visible')
      const start = Date.now()
      const swing = 40
      let shot = false
      const weave = (dir: 1 | -1): Cypress.Chainable => caught().then(n => {
        if (n >= 20) return
        expect(Date.now() - start, `stage must not run past the cap (caught ${n} of 20)`).to.be.lessThan(MAX_MS)
        if (!shot && Date.now() - start > 50_000) { shot = true; cy.screenshot(`mid-${vp.name}`) }
        return cy.get('canvas').first().then($c => {
          drag($c[0] as HTMLCanvasElement, dir * swing)
          return cy.wait(600).then(() => release($c[0] as HTMLCanvasElement)).then(() => cy.wait(1200)).then(() => weave(dir === 1 ? -1 : 1))
        })
      })
      weave(1).then(() => {
        const elapsed = Date.now() - start
        cy.log(`stage 1 took ${(elapsed / 1000).toFixed(1)}s`)
        expect(elapsed, 'stage 1 duration').to.be.within(MIN_MS, MAX_MS)
        cy.screenshot(`orionids-stage1-${vp.name}`)
      })
    })
  }
})
