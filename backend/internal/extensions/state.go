package extensions

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/signal-k/landnam-backend/internal/sharedauth"
)

type stateSaveRequest struct {
	SaveVersion     float64        `json:"save_version"`
	GameState       map[string]any `json:"game_state"`
	ClientUpdatedAt string         `json:"client_updated_at"`
	Configuration   map[string]any `json:"configuration"`
}

func registerStateRoutes(app core.App, verifier *sharedauth.Verifier) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.GET("/api/landnam/state", func(e *core.RequestEvent) error {
			user, err := authenticateSharedUser(e, verifier)
			if err != nil {
				return unauthorized(e, err)
			}

			record, err := findPlayerGameState(app, user.ID)
			if err != nil {
				return e.JSON(http.StatusOK, map[string]any{
					"user": map[string]any{
						"id":    user.ID,
						"email": user.Email,
					},
					"state": nil,
				})
			}

			return e.JSON(http.StatusOK, map[string]any{
				"user": map[string]any{
					"id":    user.ID,
					"email": user.Email,
				},
				"state": serializePlayerGameState(record),
			})
		})

		se.Router.POST("/api/landnam/state", func(e *core.RequestEvent) error {
			user, err := authenticateSharedUser(e, verifier)
			if err != nil {
				return unauthorized(e, err)
			}

			payload, err := decodeStateSaveRequest(e.Request)
			if err != nil {
				return e.JSON(http.StatusBadRequest, map[string]any{
					"error": err.Error(),
				})
			}

			record, err := upsertPlayerGameState(app, user.ID, payload)
			if err != nil {
				return e.JSON(http.StatusInternalServerError, map[string]any{
					"error": err.Error(),
				})
			}

			return e.JSON(http.StatusOK, map[string]any{
				"user": map[string]any{
					"id":    user.ID,
					"email": user.Email,
				},
				"state": serializePlayerGameState(record),
			})
		})

		return se.Next()
	})
}

func authenticateSharedUser(e *core.RequestEvent, verifier *sharedauth.Verifier) (*sharedauth.User, error) {
	token := sharedauth.BearerToken(e.Request)
	return verifier.VerifyBearerToken(token)
}

func unauthorized(e *core.RequestEvent, err error) error {
	return e.JSON(http.StatusUnauthorized, map[string]any{
		"error": err.Error(),
	})
}

func decodeStateSaveRequest(r *http.Request) (*stateSaveRequest, error) {
	var payload stateSaveRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		return nil, err
	}

	if payload.GameState == nil {
		return nil, errors.New("game_state is required")
	}

	return &payload, nil
}

func findPlayerGameState(app core.App, owner string) (*core.Record, error) {
	collection, err := app.FindCollectionByNameOrId("player_game_states")
	if err != nil {
		return nil, err
	}

	return app.FindFirstRecordByData(collection, "owner", owner)
}

func upsertPlayerGameState(app core.App, owner string, payload *stateSaveRequest) (*core.Record, error) {
	collection, err := app.FindCollectionByNameOrId("player_game_states")
	if err != nil {
		return nil, err
	}

	record, err := app.FindFirstRecordByData(collection, "owner", owner)
	if err != nil {
		record = core.NewRecord(collection)
		record.Set("owner", owner)
	}

	record.Set("save_version", payload.SaveVersion)
	record.Set("game_state", payload.GameState)
	record.Set("client_updated_at", payload.ClientUpdatedAt)
	record.Set("last_synced_at", time.Now().UTC().Format(time.RFC3339))
	record.Set("configuration", payload.Configuration)

	if err := app.Save(record); err != nil {
		return nil, err
	}

	return record, nil
}

func serializePlayerGameState(record *core.Record) map[string]any {
	return map[string]any{
		"id":                record.Id,
		"owner":             record.GetString("owner"),
		"save_version":      record.GetFloat("save_version"),
		"game_state":        record.Get("game_state"),
		"client_updated_at": record.GetString("client_updated_at"),
		"last_synced_at":    record.GetString("last_synced_at"),
		"configuration":     record.Get("configuration"),
		"created":           record.GetDateTime("created").String(),
		"updated":           record.GetDateTime("updated").String(),
	}
}
