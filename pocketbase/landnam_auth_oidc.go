package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/security"
	"github.com/pocketbase/pocketbase/tools/types"

	"landnam-backend/sharedauth"
)

// registerLandnamOIDCAuth adds the native-client sign-in routes (SSL-488):
//
//	POST /api/landnam-auth/apple  {identityToken, nonce}   Sign in with Apple
//	POST /api/landnam-auth/clerk  Authorization: Bearer <Clerk session JWT>
//
// Each verifies the provider token against its JWKS, then finds or creates
// the Landnam "users" row bound to that provider subject and mints a native
// token, exactly like /api/landnam-auth/exchange does for the web session.
// There is no guest path: a verified provider identity is required.
//
// Env: APPLE_BUNDLE_IDS (comma list, default com.atlasskyventures.sslandnam),
// CLERK_ISSUER (e.g. https://clerk.example.com; unset disables the Clerk route).
func registerLandnamOIDCAuth(app core.App) {
	bundleIDs := []string{"com.atlasskyventures.sslandnam"}
	if env := strings.TrimSpace(os.Getenv("APPLE_BUNDLE_IDS")); env != "" {
		bundleIDs = strings.Split(env, ",")
	}
	apple := sharedauth.NewAppleVerifier(bundleIDs...)
	var clerk *sharedauth.OIDCVerifier
	if issuer := strings.TrimSpace(os.Getenv("CLERK_ISSUER")); issuer != "" {
		clerk = sharedauth.NewClerkVerifier(issuer)
	}

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.POST("/api/landnam-auth/apple", func(e *core.RequestEvent) error {
			var body struct {
				IdentityToken string `json:"identityToken"`
				Nonce         string `json:"nonce"`
				FullName      string `json:"fullName"`
			}
			if err := e.BindBody(&body); err != nil {
				return e.JSON(http.StatusBadRequest, map[string]any{"error": "invalid body"})
			}
			id, err := apple.Verify(e.Request.Context(), body.IdentityToken, body.Nonce)
			if err != nil {
				return oidcError(e, err)
			}
			return finishOIDCSignIn(app, e, "appleSub", id, body.FullName)
		})

		se.Router.POST("/api/landnam-auth/clerk", func(e *core.RequestEvent) error {
			if clerk == nil {
				return e.JSON(http.StatusNotImplemented, map[string]any{"error": "clerk sign-in is not configured"})
			}
			id, err := clerk.Verify(e.Request.Context(), sharedauth.BearerToken(e.Request), "")
			if err != nil {
				return oidcError(e, err)
			}
			return finishOIDCSignIn(app, e, "clerkId", id, "")
		})
		return se.Next()
	})
}

func oidcError(e *core.RequestEvent, err error) error {
	status := http.StatusUnauthorized
	if !errors.Is(err, sharedauth.ErrTokenInvalid) {
		status = http.StatusBadGateway
		log.Printf("landnam-auth oidc: provider unreachable: %v", err)
	}
	return e.JSON(status, map[string]any{"error": err.Error()})
}

func finishOIDCSignIn(app core.App, e *core.RequestEvent, field string, id *sharedauth.Identity, fullName string) error {
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]any{"error": "server misconfiguration"})
	}
	record, err := findOrCreateIdentityUser(app, users, field, id, fullName)
	if err != nil {
		log.Printf("landnam-auth oidc: provisioning %s failed: %v", field, err)
		return e.JSON(http.StatusInternalServerError, map[string]any{"error": "failed to provision user"})
	}
	token, err := record.NewAuthToken()
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]any{"error": "failed to mint token"})
	}
	return e.JSON(http.StatusOK, map[string]any{"token": token, "record": record})
}

// findOrCreateIdentityUser resolves a verified provider identity to a users
// row: by provider subject first, then (only for a provider-verified email) by
// email so an existing web account links instead of duplicating, else new.
func findOrCreateIdentityUser(app core.App, users *core.Collection, field string, id *sharedauth.Identity, fullName string) (*core.Record, error) {
	record, err := app.FindFirstRecordByData(users, field, id.Subject)
	if err != nil && id.Email != "" && id.EmailVerified {
		record, err = app.FindAuthRecordByEmail(users, id.Email)
		if err == nil && record.GetString(field) != "" && record.GetString(field) != id.Subject {
			return nil, errors.New("email already bound to a different identity")
		}
	}
	if err != nil {
		record = core.NewRecord(users)
		if id.Email != "" {
			record.Set("email", id.Email)
		}
		if users.Fields.GetByName("displayName") != nil {
			name := strings.TrimSpace(fullName)
			if name == "" {
				name = strings.SplitN(id.Email, "@", 2)[0]
			}
			record.Set("displayName", name)
		}
		if users.Fields.GetByName("guest") != nil {
			record.Set("guest", false)
		}
		if id.EmailVerified {
			record.Set("verified", true)
		}
		record.SetPassword(security.RandomString(32))
	}
	record.Set(field, id.Subject)
	if users.Fields.GetByName("lastExchangeAt") != nil {
		record.Set("lastExchangeAt", types.NowDateTime())
	}
	return record, app.Save(record)
}
