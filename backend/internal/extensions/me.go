package extensions

import (
	"net/http"

	"github.com/pocketbase/pocketbase/core"
	"github.com/signal-k/landnam-backend/internal/sharedauth"
)

func registerMeRoute(app core.App, verifier *sharedauth.Verifier) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.GET("/api/landnam/me", func(e *core.RequestEvent) error {
			token := sharedauth.BearerToken(e.Request)
			user, err := verifier.VerifyBearerToken(token)
			if err != nil {
				return e.JSON(http.StatusUnauthorized, map[string]any{
					"error": err.Error(),
				})
			}

			return e.JSON(http.StatusOK, map[string]any{
				"id":    user.ID,
				"email": user.Email,
				"token": user.Token,
			})
		})

		return se.Next()
	})
}
