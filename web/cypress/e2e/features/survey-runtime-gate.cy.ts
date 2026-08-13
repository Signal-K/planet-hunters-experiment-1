describe('Survey runtime gate', () => {
  it('does not show an eligible survey without the dedicated test opt-in', () => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.setItem('landnam-game-state-v1', JSON.stringify({
          screen: 'hub',
          tutorial: false,
          player: { missionsDone: 1 },
        }))
        win.localStorage.removeItem('landnam-surveys-shown')
      },
    })

    cy.get('body').should('be.visible')
    cy.window().then(win => {
      win.dispatchEvent(new CustomEvent('landnam:survey', { detail: { surveyKey: 'lnm_return_visit' } }))
    })
    cy.wait(500)
    cy.get('[data-testid="survey-sheet"]').should('not.exist')
    cy.window().its('__landnamTriggerSurvey').should('not.exist')
  })
})
