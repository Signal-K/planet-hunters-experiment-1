package main

import (
	"net/http"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

// registerNotificationRoutes owns the player-visible inbox. It starts with
// friend requests, but its stable typed envelope lets mission, scanning and
// other autonomous systems add their own rows without replacing the tray.
func registerNotificationRoutes(app core.App) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		g := se.Router.Group("/api/notifications")
		g.Bind(apis.RequireAuth("users"))
		g.GET("", notificationsListHandler(app))
		return se.Next()
	})
}

func notificationsListHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		records, err := app.FindRecordsByFilter(
			"friendships", "addressee = {:self} && status = 'pending'", "-created", 100, 0,
			dbx.Params{"self": e.Auth.Id},
		)
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to list notifications", nil)
		}

		notifications := make([]map[string]any, 0, len(records))
		for _, rec := range records {
			requester, err := loadUser(app, rec.GetString("requester"))
			if err != nil {
				continue
			}
			notifications = append(notifications, map[string]any{
				"id":        "friend-request:" + rec.Id,
				"kind":      "friend_request",
				"title":     "Friend request",
				"body":      usernameFromUser(requester) + " wants to connect.",
				"createdAt": rec.GetDateTime("created").String(),
				"action": map[string]any{
					"friendshipId": rec.Id,
				},
			})
		}
		return e.JSON(http.StatusOK, map[string]any{"notifications": notifications})
	}
}
