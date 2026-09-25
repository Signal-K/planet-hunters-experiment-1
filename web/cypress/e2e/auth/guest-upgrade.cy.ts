describe('Email account persistence (KES-49 / KES-97)', () => {
  const pbUrl = Cypress.env('SHARED_PB_URL') || 'http://localhost:8090'
  const landnamPbUrl = Cypress.env('LANDNAM_PB_URL') || Cypress.env('POCKETBASE_URL') || 'http://localhost:8091'
  const PB_AUTH_KEY = 'pocketbase_auth'
  const LANDNAM_AUTH_KEY = 'pocketbase_auth_landnam'
  const ACCOUNT_CREDENTIALS_KEY = 'landnam-account-credentials'
  const STORAGE_KEY = 'landnam-game-state-v1'

  let createdUserId: string | undefined
  let sharedToken: string | undefined

  afterEach(() => {
    if (createdUserId && sharedToken) {
      cy.request({
        method: 'DELETE',
        url: `${pbUrl}/api/collections/users/records/${createdUserId}`,
        headers: { Authorization: `Bearer ${sharedToken}` },
        failOnStatusCode: false,
      })
    }
    createdUserId = undefined
    sharedToken = undefined
  })

  it('does not show a legacy guest upgrade prompt for an email account', () => {
    const email = `contactable-${Date.now()}@example.com`
    const password = 'ContactablePassword123!'

    cy.request('POST', `${pbUrl}/api/collections/users/records`, {
      email, password, passwordConfirm: password, name: '', displayName: 'Contactable Test User',
    }).then(({ body: user }) => {
      createdUserId = user.id
      return cy.request('POST', `${pbUrl}/api/collections/users/auth-with-password`, {
        identity: email, password,
      })
    }).then(({ body: auth }) => {
      sharedToken = auth.token
      return cy.request({
        method: 'POST',
        url: `${landnamPbUrl}/api/landnam-auth/exchange`,
        headers: { Authorization: `Bearer ${sharedToken}` },
      })
    }).then(({ body: landnamAuth }) => {
      cy.visit('/game', {
        onBeforeLoad(win) {
          win.localStorage.clear()
          win.localStorage.setItem(PB_AUTH_KEY, JSON.stringify({ token: sharedToken, record: { id: createdUserId, email } }))
          win.localStorage.setItem(LANDNAM_AUTH_KEY, JSON.stringify(landnamAuth))
          win.localStorage.setItem(ACCOUNT_CREDENTIALS_KEY, JSON.stringify({ email, password }))
          win.localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen: 'hub', tutorial: false }))
        },
      })
    })

    cy.get('[data-testid="upgrade-email"]').should('not.exist')
    cy.get('[data-testid="auth-gate-quick-email"]').should('not.exist')
    cy.window().then(win => {
      expect(JSON.parse(win.localStorage.getItem(PB_AUTH_KEY) || '{}').record.email).to.eq(email)
      expect(JSON.parse(win.localStorage.getItem(ACCOUNT_CREDENTIALS_KEY) || '{}').email).to.eq(email)
    })
  })
})
