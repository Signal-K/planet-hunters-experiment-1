describe('PocketBase Guest Auth Pattern', () => {
  const pbUrl = Cypress.env('POCKETBASE_URL') || 'http://localhost:8090'

  beforeEach(() => {
    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })
  })

  it('should allow a guest to "sign in" anonymously', () => {
    // This test simulates the proposed Guest Auth pattern:
    // 1. Check if device ID exists in localStorage
    // 2. If not, generate one and create a PB user with it
    // 3. Authenticate with that ID
    
    const guestId = `guest_${Math.random().toString(36).substring(7)}`
    const guestPassword = 'GuestPassword123!'

    // Step 1: Create Guest User in PB
    cy.request('POST', `${pbUrl}/api/collections/users/records`, {
      username: guestId,
      password: guestPassword,
      passwordConfirm: guestPassword,
      displayName: 'Anonymous Explorer',
    }).then(({ body: user }) => {
      // Step 2: Auth
      cy.request('POST', `${pbUrl}/api/collections/users/auth-with-password`, {
        identity: guestId,
        password: guestPassword,
      }).then(({ body: auth }) => {
        expect(auth.token).to.exist
        expect(auth.record.username).to.eq(guestId)
      })
    })
  })
})
