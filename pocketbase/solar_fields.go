package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

// Solar fields live in a separate collection from legacy voxel_worlds. A
// single versioned document contains the complete field and its rover: a
// client never observes terrain from one save and structures from another.
func ensureSolarFields(app core.App) error {
	if _, err := app.FindCollectionByNameOrId("solar_fields"); err != nil {
		col := core.NewBaseCollection("solar_fields")
		col.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "site", Required: true, Max: 100})
		col.Fields.Add(&core.NumberField{Name: "revision", Required: true})
		col.Fields.Add(&core.TextField{Name: "operation_id", Required: true, Max: 80})
		col.Fields.Add(&core.TextField{Name: "operation_hash", Required: true, Max: 64})
		col.Fields.Add(&core.JSONField{Name: "state", Required: true, MaxSize: 4_000_000})
		col.AddIndex("idx_solar_field_owner_site", true, "user, site", "")
		if err := app.Save(col); err != nil {
			return err
		}
	}
	if _, err := app.FindCollectionByNameOrId("solar_field_transfers"); err != nil {
		col := core.NewBaseCollection("solar_field_transfers")
		// Private: receipt creation and access are through the authenticated route.
		col.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "site", Required: true, Max: 100})
		col.Fields.Add(&core.TextField{Name: "run_id", Required: true, Max: 100})
		col.Fields.Add(&core.NumberField{Name: "revision", Required: true})
		col.Fields.Add(&core.JSONField{Name: "cargo", Required: true, MaxSize: 8192})
		col.AddIndex("idx_solar_transfer_owner_run", true, "user, run_id", "")
		if err := app.Save(col); err != nil {
			return err
		}
	}
	return nil
}

type solarFieldWrite struct {
	Site        string          `json:"site"`
	Revision    int             `json:"revision"`
	OperationID string          `json:"operationId"`
	State       json.RawMessage `json:"state"`
}

var errSolarConflict = errors.New("solar field changed on another device")
var errSolarInvalid = errors.New("invalid solar field save")

func validSolarSite(site string) bool {
	if len(site) == 0 || len(site) > 100 {
		return false
	}
	for _, ch := range site {
		if !(ch >= 'a' && ch <= 'z' || ch >= '0' && ch <= '9' || ch == '-' || ch == ':') {
			return false
		}
	}
	return true
}

func solarFieldRecord(app core.App, user, site string) (*core.Record, error) {
	return app.FindFirstRecordByFilter("solar_fields", "user = {:user} && site = {:site}", dbx.Params{"user": user, "site": site})
}

// saveSolarField compares and writes under PocketBase's database transaction.
// An operation ID makes a retry after a lost response safe and idempotent.
func saveSolarField(app core.App, user string, in solarFieldWrite) (int, error) {
	if user == "" || !validSolarSite(in.Site) || in.Revision < 0 || len(in.OperationID) < 8 || len(in.OperationID) > 80 || len(in.State) == 0 || len(in.State) > 4_000_000 || !json.Valid(in.State) {
		return 0, errSolarInvalid
	}
	var doc map[string]json.RawMessage
	if json.Unmarshal(in.State, &doc) != nil || doc == nil || len(doc["coreSnapshot"]) == 0 || len(doc["rover"]) == 0 {
		return 0, errSolarInvalid
	}
	hash := sha256.Sum256(in.State)
	digest := hex.EncodeToString(hash[:])
	revision := 0
	err := app.RunInTransaction(func(tx core.App) error {
		record, err := solarFieldRecord(tx, user, in.Site)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if record == nil {
			if in.Revision != 0 {
				return errSolarConflict
			}
			col, err := tx.FindCollectionByNameOrId("solar_fields")
			if err != nil {
				return err
			}
			record = core.NewRecord(col)
			record.Set("user", user)
			record.Set("site", in.Site)
		} else {
			current := record.GetInt("revision")
			if record.GetString("operation_id") == in.OperationID {
				if record.GetString("operation_hash") != digest {
					return errSolarConflict
				}
				revision = current
				return nil
			}
			if current != in.Revision {
				return errSolarConflict
			}
		}
		revision = in.Revision + 1
		record.Set("revision", revision)
		record.Set("operation_id", in.OperationID)
		record.Set("operation_hash", digest)
		record.Set("state", in.State)
		return tx.Save(record)
	})
	return revision, err
}

// A transfer removes cargo and records its immutable receipt in one database
// transaction. A retry of a previously completed run returns the same receipt.
// The caller must separately apply the receipt idempotently to game progress.
type solarFieldTransfer struct {
	Site     string `json:"site"`
	Revision int    `json:"revision"`
	RunID    string `json:"runId"`
}
type solarTransferReceipt struct {
	Site     string           `json:"site"`
	Revision int              `json:"revision"`
	RunID    string           `json:"runId"`
	Cargo    map[string]int64 `json:"cargo"`
}

func solarTransferRecord(app core.App, user, run string) (*core.Record, error) {
	return app.FindFirstRecordByFilter("solar_field_transfers", "user = {:user} && run_id = {:run}", dbx.Params{"user": user, "run": run})
}

func receiptFromRecord(record *core.Record) (solarTransferReceipt, error) {
	result := solarTransferReceipt{Site: record.GetString("site"), RunID: record.GetString("run_id"), Revision: record.GetInt("revision")}
	raw, _ := json.Marshal(record.GetRaw("cargo"))
	if err := json.Unmarshal(raw, &result.Cargo); err != nil || result.Cargo == nil {
		return result, errSolarInvalid
	}
	return result, nil
}

// Decode the core snapshot as JSON, preserving unknown fields as raw JSON. Do
// not transfer if the core and host copies disagree: that would mint or lose ore.
func extractSolarCargo(state json.RawMessage) (json.RawMessage, map[string]int64, error) {
	var doc map[string]json.RawMessage
	var rover, coreRover, snapshot map[string]json.RawMessage
	var rawSnapshot string
	if json.Unmarshal(state, &doc) != nil || json.Unmarshal(doc["rover"], &rover) != nil || rover == nil ||
		json.Unmarshal(doc["coreSnapshot"], &rawSnapshot) != nil || json.Unmarshal([]byte(rawSnapshot), &snapshot) != nil || snapshot == nil ||
		json.Unmarshal(snapshot["rover"], &coreRover) != nil || coreRover == nil {
		return nil, nil, errSolarInvalid
	}
	var cargo, coreCargo map[string]int64
	if json.Unmarshal(rover["cargo"], &cargo) != nil || json.Unmarshal(coreRover["cargo"], &coreCargo) != nil || cargo == nil || coreCargo == nil || len(cargo) != len(coreCargo) {
		return nil, nil, errSolarInvalid
	}
	var total int64
	for key, amount := range cargo {
		if !strings.HasPrefix(key, "landnam:") || len(key) <= len("landnam:") || amount <= 0 || amount > 1000000 || coreCargo[key] != amount {
			return nil, nil, errSolarInvalid
		}
		total += amount
	}
	var used, coreUsed int64
	if json.Unmarshal(rover["cargoUsed"], &used) != nil || json.Unmarshal(coreRover["cargoUsed"], &coreUsed) != nil || used != total || coreUsed != total {
		return nil, nil, errSolarInvalid
	}
	rover["cargo"], coreRover["cargo"] = json.RawMessage(`{}`), json.RawMessage(`{}`)
	rover["cargoUsed"], coreRover["cargoUsed"] = json.RawMessage(`0`), json.RawMessage(`0`)
	var err error
	if doc["rover"], err = json.Marshal(rover); err != nil {
		return nil, nil, err
	}
	if snapshot["rover"], err = json.Marshal(coreRover); err != nil {
		return nil, nil, err
	}
	encodedSnapshot, err := json.Marshal(snapshot)
	if err != nil {
		return nil, nil, err
	}
	if doc["coreSnapshot"], err = json.Marshal(string(encodedSnapshot)); err != nil {
		return nil, nil, err
	}
	newState, err := json.Marshal(doc)
	return newState, cargo, err
}

func transferSolarField(app core.App, user string, in solarFieldTransfer) (solarTransferReceipt, error) {
	return transferSolarFieldWithMission(app, user, in, false)
}

func transferSolarFieldWithMission(app core.App, user string, in solarFieldTransfer, attachMission bool) (solarTransferReceipt, error) {
	var result solarTransferReceipt
	if user == "" || !validSolarSite(in.Site) || in.Revision < 1 || len(in.RunID) < 8 || len(in.RunID) > 100 {
		return result, errSolarInvalid
	}
	err := app.RunInTransaction(func(tx core.App) error {
		existing, err := solarTransferRecord(tx, user, in.RunID)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if existing != nil {
			result, err = receiptFromRecord(existing)
			if err == nil && result.Site != in.Site {
				return errSolarConflict
			}
			return err
		}
		field, err := solarFieldRecord(tx, user, in.Site)
		if errors.Is(err, sql.ErrNoRows) {
			return errSolarConflict
		}
		if err != nil {
			return err
		}
		if field.GetInt("revision") != in.Revision {
			return errSolarConflict
		}
		rawState, err := json.Marshal(field.GetRaw("state"))
		if err != nil {
			return err
		}
		newState, cargo, err := extractSolarCargo(rawState)
		if err != nil {
			return err
		}
		if attachMission {
			if err := attachSolarCargoToMission(tx, user, in, cargo); err != nil {
				return err
			}
		}
		result = solarTransferReceipt{Site: in.Site, RunID: in.RunID, Revision: in.Revision + 1, Cargo: cargo}
		col, err := tx.FindCollectionByNameOrId("solar_field_transfers")
		if err != nil {
			return err
		}
		receipt := core.NewRecord(col)
		receipt.Set("user", user)
		receipt.Set("site", in.Site)
		receipt.Set("run_id", in.RunID)
		receipt.Set("revision", result.Revision)
		receipt.Set("cargo", cargo)
		if err := tx.Save(receipt); err != nil {
			return err
		}
		hash := sha256.Sum256(newState)
		field.Set("revision", result.Revision)
		field.Set("operation_id", fmt.Sprintf("transfer:%s", receipt.Id))
		field.Set("operation_hash", hex.EncodeToString(hash[:]))
		field.Set("state", newState)
		return tx.Save(field)
	})
	return result, err
}

// The field, durable receipt and active mission cargo commit together. Existing
// save fields are retained, and a stale or unrelated run cannot receive a haul.
func attachSolarCargoToMission(tx core.App, user string, in solarFieldTransfer, cargo map[string]int64) error {
	record, err := tx.FindFirstRecordByFilter("game_states", "user = {:user}", dbx.Params{"user": user})
	if errors.Is(err, sql.ErrNoRows) {
		return errSolarConflict
	}
	if err != nil {
		return err
	}
	raw, err := json.Marshal(record.GetRaw("state"))
	if err != nil {
		return err
	}
	var state map[string]json.RawMessage
	var player map[string]json.RawMessage
	var runID string
	if json.Unmarshal(raw, &state) != nil || json.Unmarshal(state["player"], &player) != nil || player == nil || json.Unmarshal(player["missionRunId"], &runID) != nil || runID != in.RunID {
		return errSolarConflict
	}
	var targetID string
	if json.Unmarshal(state["targetId"], &targetID) != nil || !strings.HasPrefix(in.Site, "solar:"+targetID+":") {
		return errSolarConflict
	}
	minerals := make(map[string]int64, len(cargo))
	allowed := map[string]bool{"iron": true, "silicon": true, "ice": true, "carbon": true, "nickel": true, "cobalt": true, "copper": true, "aluminium": true, "hydrogen": true, "uranium": true, "platinum": true, "palladium": true, "iridium": true, "rhodium": true, "gold": true, "rare": true}
	for key, amount := range cargo {
		mineral := strings.TrimPrefix(key, "landnam:")
		if !allowed[mineral] {
			return errSolarInvalid
		}
		minerals[mineral] = amount
	}
	encoded, err := json.Marshal(minerals)
	if err != nil {
		return err
	}
	player["miningCargoInProgress"] = encoded
	if state["player"], err = json.Marshal(player); err != nil {
		return err
	}
	encoded, err = json.Marshal(state)
	if err != nil {
		return err
	}
	record.Set("state", encoded)
	return tx.Save(record)
}

func registerSolarFieldRoutes(app core.App) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if err := ensureSolarFields(app); err != nil {
			return err
		}
		group := se.Router.Group("/api/solar-fields")
		group.Bind(apis.RequireAuth("users"))
		group.GET("", func(e *core.RequestEvent) error {
			site := strings.TrimSpace(e.Request.URL.Query().Get("site"))
			if !validSolarSite(site) {
				return apis.NewBadRequestError("invalid site", nil)
			}
			record, err := solarFieldRecord(app, e.Auth.Id, site)
			if errors.Is(err, sql.ErrNoRows) {
				return e.JSON(http.StatusOK, map[string]any{"revision": 0, "state": nil})
			}
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "could not read field", err)
			}
			return e.JSON(http.StatusOK, map[string]any{"revision": record.GetInt("revision"), "state": record.GetRaw("state")})
		})
		group.GET("/transfer", func(e *core.RequestEvent) error {
			runID := e.Request.URL.Query().Get("runId")
			if len(runID) < 8 || len(runID) > 100 {
				return apis.NewBadRequestError("invalid run", nil)
			}
			record, err := solarTransferRecord(app, e.Auth.Id, runID)
			if errors.Is(err, sql.ErrNoRows) {
				return apis.NewNotFoundError("transfer not found", nil)
			}
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "could not read transfer", err)
			}
			receipt, err := receiptFromRecord(record)
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "invalid transfer receipt", err)
			}
			return e.JSON(http.StatusOK, receipt)
		})
		group.POST("/mission-transfer", func(e *core.RequestEvent) error {
			var body solarFieldTransfer
			if err := e.BindBody(&body); err != nil {
				return apis.NewBadRequestError("invalid transfer", err)
			}
			receipt, err := transferSolarFieldWithMission(app, e.Auth.Id, body, true)
			if errors.Is(err, errSolarConflict) {
				return apis.NewApiError(http.StatusConflict, errSolarConflict.Error(), nil)
			}
			if errors.Is(err, errSolarInvalid) {
				return apis.NewBadRequestError("invalid transfer or field cargo", nil)
			}
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "could not transfer field cargo", err)
			}
			return e.JSON(http.StatusOK, receipt)
		})
		group.POST("/transfer", func(e *core.RequestEvent) error {
			// Do not remove cargo until the client can apply receipts to player
			// progress idempotently across devices and interrupted saves.
			if os.Getenv("LANDNAM_SOLAR_TRANSFER_ENABLED") != "1" {
				return apis.NewApiError(http.StatusServiceUnavailable, "solar cargo transfer is not available yet", nil)
			}
			var body solarFieldTransfer
			if err := e.BindBody(&body); err != nil {
				return apis.NewBadRequestError("invalid transfer", err)
			}
			receipt, err := transferSolarField(app, e.Auth.Id, body)
			if errors.Is(err, errSolarConflict) {
				return apis.NewApiError(http.StatusConflict, errSolarConflict.Error(), nil)
			}
			if errors.Is(err, errSolarInvalid) {
				return apis.NewBadRequestError("invalid transfer or field cargo", nil)
			}
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "could not transfer field cargo", err)
			}
			return e.JSON(http.StatusOK, receipt)
		})
		group.POST("", func(e *core.RequestEvent) error {
			var body solarFieldWrite
			if err := e.BindBody(&body); err != nil {
				return apis.NewBadRequestError("invalid field save", err)
			}
			revision, err := saveSolarField(app, e.Auth.Id, body)
			if errors.Is(err, errSolarConflict) {
				return apis.NewApiError(http.StatusConflict, errSolarConflict.Error(), nil)
			}
			if errors.Is(err, errSolarInvalid) {
				return apis.NewBadRequestError(errSolarInvalid.Error(), nil)
			}
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "could not save field", err)
			}
			return e.JSON(http.StatusOK, map[string]any{"revision": revision})
		})
		return se.Next()
	})
}
