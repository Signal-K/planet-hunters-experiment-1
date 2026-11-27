package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

var errGameStateConflict = errors.New("game state changed on another device")

type gameStateCASWrite struct {
	RecordID     string          `json:"recordId"`
	Expected     json.RawMessage `json:"expected"`
	State        json.RawMessage `json:"state"`
	MissionsDone int             `json:"missionsDone"`
}

// Compare complete JSON documents, including unknown fields, within the same
// transaction as the write. Ledger versions alone are not unique revisions.
func compareAndSaveGameState(app core.App, user string, in gameStateCASWrite) error {
	if user == "" || in.RecordID == "" || len(in.Expected) == 0 || len(in.State) == 0 || len(in.State) > 200000 || !json.Valid(in.Expected) || !json.Valid(in.State) {
		return errSolarInvalid
	}
	var expected, next any
	if json.Unmarshal(in.Expected, &expected) != nil || json.Unmarshal(in.State, &next) != nil {
		return errSolarInvalid
	}
	if _, ok := next.(map[string]any); !ok {
		return errSolarInvalid
	}
	expectedJSON, err := json.Marshal(expected)
	if err != nil {
		return err
	}
	return app.RunInTransaction(func(tx core.App) error {
		record, err := tx.FindRecordById("game_states", in.RecordID)
		if errors.Is(err, sql.ErrNoRows) {
			return errGameStateConflict
		}
		if err != nil {
			return err
		}
		if record.GetString("user") != user {
			return errGameStateConflict
		}
		actualJSON, err := json.Marshal(record.GetRaw("state"))
		if err != nil {
			return err
		}
		var actual any
		if json.Unmarshal(actualJSON, &actual) != nil {
			return errSolarInvalid
		}
		actualJSON, err = json.Marshal(actual)
		if err != nil {
			return err
		}
		if !bytes.Equal(actualJSON, expectedJSON) {
			return errGameStateConflict
		}
		record.Set("state", in.State)
		record.Set("missions_done", in.MissionsDone)
		return tx.Save(record)
	})
}

func registerGameStateCASRoute(app core.App) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		group := se.Router.Group("/api/game-state")
		group.Bind(apis.RequireAuth("users"))
		group.POST("/compare-and-save", func(e *core.RequestEvent) error {
			var body gameStateCASWrite
			if err := e.BindBody(&body); err != nil {
				return apis.NewBadRequestError("invalid save", err)
			}
			err := compareAndSaveGameState(app, e.Auth.Id, body)
			if errors.Is(err, errGameStateConflict) {
				return apis.NewApiError(http.StatusConflict, errGameStateConflict.Error(), nil)
			}
			if errors.Is(err, errSolarInvalid) {
				return apis.NewBadRequestError("invalid save", nil)
			}
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "could not save progress", err)
			}
			return e.JSON(http.StatusOK, map[string]bool{"saved": true})
		})
		return se.Next()
	})
}
