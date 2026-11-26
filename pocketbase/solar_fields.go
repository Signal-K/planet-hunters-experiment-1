package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

// Solar fields live in a separate collection from legacy voxel_worlds. A
// single versioned document contains the complete field and its rover: a
// client never observes terrain from one save and structures from another.
func ensureSolarFields(app core.App) error {
	if _, err := app.FindCollectionByNameOrId("solar_fields"); err == nil {
		return nil
	}
	col := core.NewBaseCollection("solar_fields")
	// The collection has no public CRUD rules; only the authenticated route
	// below may read or write it, so all writers use the revision check.
	col.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
	col.Fields.Add(&core.TextField{Name: "site", Required: true, Max: 100})
	col.Fields.Add(&core.NumberField{Name: "revision", Required: true})
	col.Fields.Add(&core.TextField{Name: "operation_id", Required: true, Max: 80})
	col.Fields.Add(&core.TextField{Name: "operation_hash", Required: true, Max: 64})
	col.Fields.Add(&core.JSONField{Name: "state", Required: true, MaxSize: 4_000_000})
	col.AddIndex("idx_solar_field_owner_site", true, "user, site", "")
	return app.Save(col)
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
