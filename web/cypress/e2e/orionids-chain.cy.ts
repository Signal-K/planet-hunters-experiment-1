// SSL-714: the Orionids badge chain end to end, on the account-free stage fixtures. Run it against a
// local stack only (npm run test:cypress:orionids defaults to http://localhost:4320); nothing here
// signs in or writes to PocketBase.
//
// Mission 1, the shower run, hands over the fragment sample (and no badge: mining alone never earns it).
// Mission 2, the rover observation on Eros, hands over the impact bearing and the community launches ORI-1.
// Mission 3 is three recordings checked on ORI-1; the third grades the badge.

const ORIONIDS_GOLD_UNTIL = Date.parse('2026-11-08T00:00:00Z')

/** Radio Meteor Zoo through Panoptes, stubbed so the spec never depends on the live queue. */
function stubRadioMeteorZoo() {
  cy.intercept('GET', 'https://www.zooniverse.org/api/workflows*', {
    body: { workflows: [{ id: '33017', display_name: 'Perseids 2026', active: true, completeness: 0.2 }] },
  })
  cy.intercept('GET', 'https://www.zooniverse.org/api/subjects/queued*', {
    body: {
      subjects: [1, 2, 3, 4].map(n => ({
        id: `e2e-${n}`,
        locations: [{ 'image/png': `https://panoptes-uploads.zooniverse.org/e2e/${n}.png` }],
        metadata: { filename: `RAD_BEDOUR_20260812_02${n}0_BEHUMA_SYS001.png` },
      })),
    },
  })
  cy.intercept('GET', 'https://panoptes-uploads.zooniverse.org/e2e/*', {
    fixture: 'radio-spectrogram.png,null',
    headers: { 'content-type': 'image/png', 'access-control-allow-origin': '*' },
  })
}

const byTest = (id: string) => cy.get(`[data-testid="${id}"]`)

/** Tap the middle of the recording: drops one meteor-sized box. */
function boxAnEcho() {
  byTest('radio-draw').should('be.visible')
    .trigger('pointerdown', 'center', { button: 0, pointerId: 1, isPrimary: true })
    .trigger('pointerup', 'center', { button: 0, pointerId: 1, isPrimary: true })
}

describe('Orionids badge: three missions joined by story items', () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
  })

  it('mission 1: the shower run hands over the fragment sample, not the badge, and opens the rover mission', () => {
    cy.visit('/game/stage?preset=ui-orionids-shower-debrief')

    byTest('debrief-story-item').should('contain', 'mission 1 of 3').and('contain', 'Fragment sample')
    byTest('debrief-story-item').should('have.attr', 'data-item', 'fragment-sample')
    byTest('mission-next-handoff').should('contain', 'Mission 2 is ready on the Events board')
    // Mining alone never earns the Orionids badge.
    cy.get('[data-testid="sky-badge"]').should('not.exist')

    byTest('collect-reward-btn').click()

    byTest('events-orionids').should('contain', 'Mission 2 of 3')
    byTest('event-action-orionids-2026').should('contain', 'Continue research').click()

    // Mission 2 is a rover trip to Eros, not another pass through the shower field.
    byTest('plan-destination').should('contain', '433 Eros')
    byTest('plan-cargo').should('contain', 'rover')
    byTest('orionids-shower-field').should('not.exist')
  })

  it('missions 2 and 3: the bearing launches ORI-1, and three checked recordings complete the chain and grade the badge', () => {
    stubRadioMeteorZoo()
    cy.visit('/game/stage?preset=ui-orionids-rover-debrief')

    byTest('debrief-story-item').should('contain', 'mission 2 of 3').and('contain', 'Impact bearing')
    byTest('debrief-story-item').should('have.attr', 'data-item', 'impact-bearing')
    byTest('debrief-community-launch').should('contain', 'ORI-1 is up')
    byTest('mission-next-handoff').should('contain', 'confirm meteor echoes on ORI-1')

    byTest('collect-reward-btn').click()

    byTest('events-orionids').should('contain', 'Mission 3 of 3')
    byTest('event-action-orionids-2026').should('contain', 'Listen on ORI-1').click()

    byTest('radio-meteor-screen').should('be.visible')
    byTest('radio-instrument').should('contain', 'ORI-1')
    byTest('radio-mission-progress').should('contain', '0 / 3')

    // First time on the receiver: the radio desk briefs the player.
    byTest('radio-briefing-next').click()
    byTest('radio-briefing-next').click()
    byTest('radio-briefing-next').should('contain', 'START LISTENING').click()

    // Two recordings with an echo, one marked quiet.
    for (const checked of [1, 2]) {
      boxAnEcho()
      byTest('radio-echoes').should('have.text', '1')
      byTest('radio-submit').should('contain', 'SEND 1 ECHO').click()
      byTest('radio-mission-progress').should('contain', `${checked} / 3`)
    }
    byTest('radio-no-meteors').should('not.be.disabled').click()

    const tier = Date.now() < ORIONIDS_GOLD_UNTIL ? 'GOLD' : 'SILVER'
    byTest('radio-mission').should('contain', 'Radio confirmation')
    byTest('radio-mission').should('have.attr', 'data-complete')
    byTest('radio-mission-badge').should('contain', `${tier} BADGE EARNED`)
    byTest('radio-dialogue').should('contain', 'The Orionids record is complete')
  })
})
