describe('Smoke — Landnam', () => {
  it('root redirects to /game', () => {
    cy.visit('/')
    cy.url().should('include', '/game')
  })

  it('/game page loads without crashing', () => {
    cy.visit('/game')
    cy.get('body').should('exist')
  })

  it('/game page has the expected title', () => {
    cy.visit('/game')
    cy.title().should('eq', 'Landnam — Space Mining')
  })

  it('backend-health API route responds', () => {
    cy.request({ url: '/api/auth/backend-health', failOnStatusCode: false })
      .its('status')
      .should('be.oneOf', [200, 503])
  })
})
