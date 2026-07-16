// Regression coverage for the guest->Landnam auth exchange's background
// self-healing (see useAuthSync.ts). Before this, a failed exchange gave up
// permanently for the rest of the session — this is exactly how a stray
// shared-backend guest account with no matching Landnam-side row happened
// in production. This spec forces the exchange to fail, confirms the
// persistent "NOT SYNCED" indicator (LandnamSyncStatus.tsx) appears instead
// of a one-shot toast that's easy to miss, then lets the exchange succeed
// and confirms the background retry (triggered here via a visibilitychange
// event, rather than waiting out the real 60s backstop) clears it without
// a page reload.

describe('Landnam auth exchange self-healing', () => {
  const pbUrl = Cypress.env('POCKETBASE_URL') || 'http://localhost:8090'
  const PB_AUTH_KEY = 'pocketbase_auth'

  let guestId: string
  let guestPassword: string
  let token: string
  let record: Record<string, unknown>

  before(() => {
    guestId = `guest_${Math.random().toString(36).substring(7)}`
    guestPassword = 'GuestPassword123!'

    cy.request('POST', `${pbUrl}/api/collections/users/records`, {
      email: `${guestId}@landnam.test`,
      password: guestPassword,
      passwordConfirm: guestPassword,
      displayName: 'Anonymous Explorer',
    }).then(() => {
      cy.request('POST', `${pbUrl}/api/collections/users/auth-with-password`, {
        identity: `${guestId}@landnam.test`,
        password: guestPassword,
      }).then(({ body: auth }) => {
        token = auth.token
        record = auth.record
      })
    })
  })

  after(() => {
    if (record?.id) {
      cy.request({
        method: 'DELETE',
        url: `${pbUrl}/api/collections/users/records/${record.id}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      })
    }
  })

  it('shows NOT SYNCED while the exchange fails, clears once it recovers', () => {
    // A single stateful handler, not two separate cy.intercept() calls for
    // the same route — overlapping intercepts on one route have subtle
    // precedence rules that made an earlier version of this test flaky
    // (the "recovered" pass-through intercept didn't reliably supersede the
    // failing one). One handler with a JS flag is unambiguous.
    let shouldFail = true
    cy.intercept('POST', '**/api/landnam-auth/exchange', req => {
      if (shouldFail) {
        req.reply({ statusCode: 502, body: { error: 'simulated backend-unreachable failure' } })
      } else {
        req.continue()
      }
    }).as('exchange')

    cy.visit('/game', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem(PB_AUTH_KEY, JSON.stringify({ token, record }))
      },
    })

    cy.wait('@exchange').its('response.statusCode').should('eq', 502)

    // Initial retry ladder (1s/3s/5s) exhausts, then the background re-sync
    // effect takes over — badge stays up throughout.
    cy.contains('NOT SYNCED', { timeout: 20000 }).should('be.visible')

    // Let the exchange succeed from here on, then force the background
    // effect's visibility-triggered retry instead of waiting out its real
    // 60s backstop. Not asserting on a specific @exchange wait here — the
    // initial 4-attempt retry ladder may still have unconsumed queued
    // requests at this point, so the reliable signal is the UI settling,
    // not a request count.
    cy.then(() => { shouldFail = false })
    // visibilitychange fires on document, not window.
    cy.document().then(doc => {
      doc.dispatchEvent(new Event('visibilitychange'))
    })

    cy.contains('NOT SYNCED', { timeout: 15000 }).should('not.exist')
  })
})
