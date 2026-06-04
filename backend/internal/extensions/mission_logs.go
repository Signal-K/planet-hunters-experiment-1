package extensions

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/signal-k/landnam-backend/internal/sharedauth"
)

type missionLogRequest struct {
	RocketID      string         `json:"rocket_id"`
	TargetID      string         `json:"target_id"`
	Action        string         `json:"action"`
	PayoutFrancs  float64        `json:"payout_francs"`
	CargoSecured  map[string]any `json:"cargo_secured"`
	LoggedAt      string         `json:"logged_at"`
	Configuration map[string]any `json:"configuration"`
}

func registerMissionLogRoutes(app core.App, verifier *sharedauth.Verifier) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.POST("/api/landnam/mission-logs", func(e *core.RequestEvent) error {
			user, err := authenticateSharedUser(e, verifier)
			if err != nil {
				return unauthorized(e, err)
			}

			var payload missionLogRequest
			if err := json.NewDecoder(e.Request.Body).Decode(&payload); err != nil {
				return e.JSON(http.StatusBadRequest, map[string]any{"error": err.Error()})
			}
			if payload.Action == "" {
				return e.JSON(http.StatusBadRequest, map[string]any{"error": "action is required"})
			}

			collection, err := app.FindCollectionByNameOrId("mission_logs")
			if err != nil {
				return e.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
			}

			record := core.NewRecord(collection)
			record.Set("owner", user.ID)
			record.Set("rocket", payload.RocketID)
			record.Set("target_id", payload.TargetID)
			record.Set("action", payload.Action)
			record.Set("payout_francs", payload.PayoutFrancs)
			record.Set("cargo_secured", payload.CargoSecured)
			if payload.LoggedAt == "" {
				payload.LoggedAt = time.Now().UTC().Format(time.RFC3339)
			}
			record.Set("logged_at", payload.LoggedAt)
			record.Set("configuration", payload.Configuration)

			if err := app.Save(record); err != nil {
				return e.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
			}

			return e.JSON(http.StatusCreated, map[string]any{
				"id":     record.Id,
				"owner":  user.ID,
				"action": record.GetString("action"),
			})
		})

		return se.Next()
	})
}
