package main

import (
	"log"
	"net/http"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/security"

	"landnam-backend/sharedauth"
)

// registerLandnamAuthExchange adds POST /api/landnam-auth/exchange, which lets
// a client holding a verified session on the *shared* PocketBase backend mint
// a real, native auth token scoped to Landnam's own "users" auth collection.
//
// This exists because players authenticate against the shared backend
// (web/lib/pb.ts -> pbShared), not against Landnam's own PocketBase
// (web/lib/pb-landnam.ts -> pbLandnam). Without this exchange, requests to
// Landnam's own PocketBase never carry @request.auth, so ownership rules
// like `user = @request.auth.id` on game_states/mission_log can't be
// enforced — the client is otherwise unauthenticatable there.
//
// The verified shared-backend user ID is reused directly as the Id of the
// corresponding Landnam "users" record (find-or-create, 1:1 identity
// binding) — both are valid 15-char PocketBase record IDs, and game_states
// records already store this same shared-user ID in their "user" field, so
// this keeps existing data consistent with the newly-enforced ownership
// rules.
func registerLandnamAuthExchange(app core.App, verifier *sharedauth.Verifier) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.POST("/api/landnam-auth/exchange", func(e *core.RequestEvent) error {
			token := sharedauth.BearerToken(e.Request)
			sharedUser, err := verifier.VerifyBearerToken(token)
			if err != nil {
				return e.JSON(http.StatusUnauthorized, map[string]any{
					"error": err.Error(),
				})
			}

			usersCollection, err := app.FindCollectionByNameOrId("users")
			if err != nil {
				log.Printf("landnam-auth exchange: users collection not found: %v", err)
				return e.JSON(http.StatusInternalServerError, map[string]any{
					"error": "server misconfiguration",
				})
			}

			record, err := app.FindRecordById(usersCollection, sharedUser.ID)
			if err != nil {
				record = core.NewRecord(usersCollection)
				record.Id = sharedUser.ID
				if sharedUser.Email != "" {
					record.Set("email", sharedUser.Email)
					if displayField := usersCollection.Fields.GetByName("displayName"); displayField != nil {
						record.Set("displayName", sharedUser.Email)
					}
				}
				// Auth collections require a password; the client never signs in
				// with it directly — only via this exchange — so a random value
				// scoped to this record is sufficient.
				record.SetPassword(security.RandomString(32))
				if err := app.Save(record); err != nil {
					log.Printf("landnam-auth exchange: failed to create user %s: %v", sharedUser.ID, err)
					return e.JSON(http.StatusInternalServerError, map[string]any{
						"error": "failed to provision user",
					})
				}
			}

			landnamToken, err := record.NewAuthToken()
			if err != nil {
				log.Printf("landnam-auth exchange: failed to mint token for %s: %v", sharedUser.ID, err)
				return e.JSON(http.StatusInternalServerError, map[string]any{
					"error": "failed to mint token",
				})
			}

			return e.JSON(http.StatusOK, map[string]any{
				"token":  landnamToken,
				"record": record,
			})
		})

		return se.Next()
	})
}
