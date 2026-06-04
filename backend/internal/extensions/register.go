package extensions

import (
	"github.com/pocketbase/pocketbase/core"
	"github.com/signal-k/landnam-backend/internal/sharedauth"
)

func Register(app core.App, verifier *sharedauth.Verifier) {
	registerMeRoute(app, verifier)
	registerStateRoutes(app, verifier)
	registerMissionLogRoutes(app, verifier)
}
