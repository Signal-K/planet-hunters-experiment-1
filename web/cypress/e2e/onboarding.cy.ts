// Explicitly requested onboarding-only e2e. Uses the real game shell with a
// disposable local preview save. No account, network writes, fixture hopping,
// dev skip buttons or fabricated completion events.
const testId = (id: string) => `[data-testid="${id}"]`
const get = (id: string) => cy.get(testId(id))

describe('first-run onboarding', () => {
  it('chooses a site, places the pad, accepts a contract, flies, mines and settles it', () => {
    cy.viewport(1440, 900)
    cy.visit('/game/intro?preset=m1-intro')
    get('base-biome-desert').click()
    get('intro-begin-btn').click()
    get('build-plot-0').should('be.visible').click()
    get('building-launchpad-hit').should('be.visible').click()

    // Observe the live UI at every step. Bounded so a blocked operation fails
    // with its screenshot/video instead of hanging or silently skipping it.
    let mined = false
    let settled = false
    let vehiclePicked = false
    let startedAt = 0
    function advance(attempt = 0): Cypress.Chainable {
      if (attempt > 900) throw new Error('Onboarding did not settle within the operation budget')
      return cy.get('body').then($body => {
        startedAt ||= Date.now()
        if (Date.now() - startedAt > 5 * 60_000) {
          throw new Error(`Onboarding stalled at ${window.location.pathname}: ${$body.find(testId('mining-order-readout')).text()}`)
        }
        const enabled = (selector: string) => $body.find(selector).filter(':visible:not(:disabled)').first()
        if (settled) {
          get('base-camera').should('be.visible')
          cy.screenshot('onboarding-settled')
          return
        }
        // Accepting an offer previews a rocket; staging the vehicle is a
        // separate player action, required before Build rocket can run.
        if (!vehiclePicked && enabled(testId('mission-launch-review')).length) {
          const vehicle = enabled('[data-testid^="plan-vehicle-"][data-role="use"]')
          if (vehicle.length) {
            vehiclePicked = true
            return cy.wrap(vehicle).click().then(() => cy.wait(500)).then(() => advance(attempt + 1))
          }
          return get('plan-vehicle').click().then(() => cy.wait(500)).then(() => advance(attempt + 1))
        }
        const reward = enabled(testId('collect-reward-btn'))
        if (reward.length) {
          expect(mined, 'mining surface was played before settlement').to.equal(true)
          settled = true
          return cy.wrap(reward).click().then(() => cy.wait(1000)).then(() => advance(attempt + 1))
        }
        const controls = enabled(testId('mining-controls'))
        if (controls.length) {
          mined = true
          const home = enabled(testId('return-home-btn'))
          // The return key becomes Leave once the required order is full.
          if (home.length && home.attr('data-ready') === 'true') {
            return cy.wrap(home).click().then(() => cy.wait(500)).then(() => advance(attempt + 1))
          }
          const cue = $body.find(testId('mining-target-cue')).text()
          const fire = enabled(testId('fire-laser-btn'))
          if (/fire now/i.test(cue) && fire.length) {
            return cy.get('body').trigger('keydown', { eventConstructor: 'KeyboardEvent', key: 'f', code: 'KeyF' })
              .trigger('keyup', { eventConstructor: 'KeyboardEvent', key: 'f', code: 'KeyF' })
              .then(() => cy.wait(200)).then(() => advance(attempt + 1))
          }
        }
        const actions = [
          testId('mining-start-brief'), testId('mining-resume-btn'),
          '[data-beacon="launchpad-view-contracts"]',
          '[data-testid^="mission-accept-"]',
          testId('plan-launch-btn'), testId('launch-btn'),
          testId('transit-boost-btn'), testId('mining-recharge-btn'),
        ]
        for (const selector of actions) {
          const button = enabled(selector)
          if (button.length) return cy.wrap(button).click().then(() => cy.wait(500)).then(() => advance(attempt + 1))
        }
        return cy.wait(500).then(() => advance(attempt + 1))
      })
    }
    advance()
  })
})
