// Regression tests for two real prod bugs on POST .../game_states/records.
//
// (1) 2026-07-14 — two near-simultaneous first-saves for the same
// brand-new user (e.g. two tabs/devices opening the game at once) both
// attempt create(), and the loser gets PocketBase's real unique-constraint
// rejection shape (validation_not_unique).
//
// (2) 2026-07-14, found live in prod — a deterministic-id "recovery" fix for
// (1) assumed the existing record's id always equals userId, which broke
// for any record created *before* that fix shipped (a real id like
// 'c4o8o0b9wxqunlq', not the user's id) — the update() call 404'd forever,
// silently breaking saves for every pre-existing player. Recovery now looks
// the real record up via getFirstListItem before updating, instead of
// assuming its id.

const STORAGE_KEY = 'landnam-game-state-v1'

describe('game_states save race recovery', () => {
  it('recovers via getFirstListItem + update(realId, ...) when create loses the unique-constraint race', () => {
    // Without this, the real exchange call fails against a nonexistent local
    // Landnam PocketBase and retries with backoff (up to ~9s) before the
    // persist effect is allowed to proceed at all — stub it to succeed
    // immediately so this test is about game_states recovery, not exchange
    // retry timing.
    cy.intercept('POST', '**/api/landnam-auth/exchange', {
      statusCode: 200,
      body: { token: 'e2e-landnam-token', record: { id: 'e2e-user', email: 'e2e@landnam.guest' } },
    }).as('pbLandnamExchange')

    cy.intercept('POST', '**/api/collections/game_states/records', {
      statusCode: 400,
      body: {
        data: { user: { code: 'validation_not_unique', message: 'Value must be unique.' } },
        message: 'Failed to create record.',
        status: 400,
      },
    }).as('pbGameStateCreateConflict')

    // useAuthSync's separate "load remote state on mount" effect uses this
    // exact same getFirstListItem query, and runs first. The real prod bug
    // needs that first call to genuinely miss (a transient 404 — Fly
    // eventual-consistency, matching handleLoadFailure's 404 branch, which
    // only unblocks persisting and does NOT learn the record's real id) so
    // the later create() attempt is the one that discovers the record
    // already exists; the *second* call (this test's actual recovery lookup)
    // then finds it. A static stub would let the mount-time load find the
    // record and populate backendRecordId.current itself, short-circuiting
    // saveRemoteState straight to update() and never exercising this path.
    let lookupCalls = 0
    cy.intercept('GET', '**/api/collections/game_states/records?**', req => {
      lookupCalls += 1
      if (lookupCalls === 1) {
        req.reply({ statusCode: 404, body: { code: 404, message: 'The requested resource wasn\'t found.' } })
        return
      }
      req.reply({
        statusCode: 200,
        body: {
          page: 1, perPage: 1, totalItems: 1,
          items: [{ id: 'legacy-record-id', user: 'e2e-user', missions_done: 0, state: { player: { missionsDone: 0 } } }],
        },
      })
    }).as('pbGameStateLookup')

    cy.intercept('PATCH', '**/api/collections/game_states/records/legacy-record-id', {
      statusCode: 200,
      body: { id: 'legacy-record-id' },
    }).as('pbGameStateRecoveryUpdate')

    // preset/preview mode (?preset=/?preview=) skips backend persistence
    // entirely (see GameProvider's isPreview gate), so this needs a plain,
    // non-preview visit for the persist effect to run — same pattern as
    // game-loop.cy.ts's visitWithState: preset a full hub state directly via
    // localStorage (bypassing the intro flow and any auth-gate prompt a
    // fresh/no-state visit would otherwise show) and suppress the auth gate
    // with guest credentials, exactly like every other passing spec does.
    cy.visit('/game/hub', {
      onBeforeLoad(win) {
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          screen: 'hub',
          player: {
            francs: 9_500_000_000,
            activeMission: null,
            missionCount: 1,
            pendingLaunch: false,
            placed: ['launchpad'],
            placementPlots: { launchpad: 0 },
            controlBuilt: false,
            missionsDone: 0,
            freeOperations: false,
            contractorMissions: {},
            contractorCooldowns: {},
            researchAnnotations: 0,
            refineryBuilt: false,
            refineryQueue: [],
            refinedGoods: {},
            launchpadUpgraded: false,
            loanDebt: 0,
            loanOffered: false,
          },
          missionId: null,
          targetId: null,
          rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
          lastCargo: null,
          tutorial: false,
          doneSteps: {},
          popup: null,
          menuOpen: false,
        }))
        win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
        // Seed pbShared's authStore directly (PocketBase SDK default
        // 'pocketbase_auth' key) instead of relying on the async
        // ensureGuestAuth() -> authWithPassword() round trip to populate it —
        // useAuthSync's authUserId state only reads this once at mount, so
        // this needs to already be valid before the app's first render.
        const jwt = (payload: Record<string, unknown>) => {
          const b64 = (obj: unknown) => win.btoa(JSON.stringify(obj)).replace(/=+$/, '')
          return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`
        }
        win.localStorage.setItem('pocketbase_auth', JSON.stringify({
          token: jwt({ id: 'e2e-user', exp: Math.floor(Date.now() / 1000) + 3600 }),
          record: { id: 'e2e-user', email: 'e2e@landnam.guest', collectionId: '_pb_users_auth_', collectionName: 'users' },
        }))
      },
    })
    cy.contains('Earth Base', { timeout: 15000 }).should('be.visible')

    cy.wait('@pbGameStateCreateConflict', { timeout: 20000 })
    cy.wait('@pbGameStateLookup', { timeout: 20000 })
    cy.wait('@pbGameStateRecoveryUpdate', { timeout: 20000 })
  })
})
