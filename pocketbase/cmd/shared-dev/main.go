// shared-dev is a local stand-in for the shared Star Sailors PocketBase
// (signal-k/tickets-please backend/, deployed as signal-k-starsailors.fly.dev)
// so Landnam runs and tests on its own, with no Docker and no sibling repo.
//
// It carries only what Landnam calls on the shared backend:
//   - the `users` auth collection (sign-up, password sign-in, auth-refresh,
//     which sharedauth.Verifier uses for /api/landnam-auth/exchange)
//   - subjects / subject_classifications, asteroid_*, ss_saturn_storm_*,
//     comments (schemas copied from the shared backend's migrations)
//   - GET /api/ss/subjects/last-confirmed
//   - POST /auth/local-dev-auth (sign in as a dev account, no Clerk)
//   - POST /auth/landnam/clerk-ensure (no-op; Clerk is off locally)
//
// Local development only. It skips identity verification; never deploy it.
//
//	go run ./cmd/shared-dev serve --http=127.0.0.1:8090 --dir=pb_data_shared
package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"

	_ "landnam-backend/cmd/shared-dev/migrations"
)

// Matches web/scripts/seed-dev-presets.ts, which signs in as this superuser
// on both local PocketBase instances.
const (
	devSuperuserEmail    = "liam@skinetics.tech"
	devSuperuserPassword = "ThisIsATestPassword"
	defaultDevEmail      = "local-dev@starsailors.test"
)

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if err := ensureDevSuperuser(se.App); err != nil {
			log.Printf("shared-dev: superuser not provisioned: %v", err)
		}

		se.Router.POST("/auth/local-dev-auth", func(e *core.RequestEvent) error {
			return handleLocalDevAuth(e)
		})

		se.Router.POST("/auth/landnam/clerk-ensure", func(e *core.RequestEvent) error {
			return e.NoContent(http.StatusNoContent)
		})

		se.Router.GET("/api/ss/subjects/last-confirmed", func(e *core.RequestEvent) error {
			latest, err := e.App.FindRecordsByFilter("subjects", "confirmed = true", "-confirmed_at", 1, 0)
			if err != nil || len(latest) == 0 {
				return e.JSON(http.StatusOK, map[string]any{"lastConfirmedAt": nil})
			}
			return e.JSON(http.StatusOK, map[string]any{
				"lastConfirmedAt": latest[0].GetDateTime("confirmed_at").String(),
				"subjectId":       latest[0].Id,
			})
		}).Bind(apis.RequireAuth())

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func ensureDevSuperuser(app core.App) error {
	if _, err := app.FindAuthRecordByEmail(core.CollectionNameSuperusers, devSuperuserEmail); err == nil {
		return nil
	}
	superusers, err := app.FindCollectionByNameOrId(core.CollectionNameSuperusers)
	if err != nil {
		return err
	}
	record := core.NewRecord(superusers)
	record.SetEmail(devSuperuserEmail)
	record.SetPassword(devSuperuserPassword)
	return app.Save(record)
}

// handleLocalDevAuth mirrors the shared backend's local_dev_auth.go: it
// finds or creates a `users` record for the given email (default
// local-dev@starsailors.test) and returns a normal {token, record} auth
// response, with no password and no Clerk.
func handleLocalDevAuth(e *core.RequestEvent) error {
	var body struct {
		Email string `json:"email"`
	}
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("An error occurred while loading the submitted data.", err)
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if email == "" {
		email = defaultDevEmail
	}

	users, err := e.App.FindCollectionByNameOrId("users")
	if err != nil {
		return apis.NewApiError(http.StatusInternalServerError, "Users collection is misconfigured.", err)
	}

	record, err := e.App.FindAuthRecordByEmail(users, email)
	created := err != nil
	if created {
		record = core.NewRecord(users)
		record.SetEmail(email)
		record.SetVerified(true)
		record.SetRandomPassword()
		if err := e.App.Save(record); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "Failed to create local dev account.", err)
		}
	}

	return apis.RecordAuthResponse(e, record, "local-dev", map[string]bool{"created": created})
}

func init() {
	// Refuse to run anywhere that looks deployed.
	if os.Getenv("FLY_APP_NAME") != "" {
		log.Fatal("shared-dev is local-only and must not run on Fly")
	}
}
