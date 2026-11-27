package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/tests"
)

func TestSolarFieldAtomicSaveAndConflict(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	if err := ensureSolarFields(app); err != nil {
		t.Fatal(err)
	}
	write := solarFieldWrite{Site: "mars:east", OperationID: "operation-one", State: json.RawMessage(`{"coreSnapshot":"terrain","rover":{"cargo":{"iron":1}},"edits":{"1,2,3":0},"structures":[{"id":"a"}]}`)}
	revision, err := saveSolarField(app, "player-a", write)
	if err != nil || revision != 1 {
		t.Fatalf("create: %d %v", revision, err)
	}
	// A lost response may be retried without changing the revision.
	revision, err = saveSolarField(app, "player-a", write)
	if err != nil || revision != 1 {
		t.Fatalf("retry: %d %v", revision, err)
	}
	other := write
	other.OperationID = "operation-two"
	other.State = json.RawMessage(`{"coreSnapshot":"other","rover":{}}`)
	if _, err := saveSolarField(app, "player-a", other); !errors.Is(err, errSolarConflict) {
		t.Fatalf("stale writer: %v", err)
	}
	// Another account has a separate field even at the same site.
	if revision, err := saveSolarField(app, "player-b", other); err != nil || revision != 1 {
		t.Fatalf("other player: %d %v", revision, err)
	}
	other.Revision = 1
	if revision, err := saveSolarField(app, "player-a", other); err != nil || revision != 2 {
		t.Fatalf("update: %d %v", revision, err)
	}
	record, err := solarFieldRecord(app, "player-a", write.Site)
	if err != nil || record.GetInt("revision") != 2 {
		t.Fatalf("read: %v %v", record, err)
	}
	// An old operation id with a changed payload cannot masquerade as a retry.
	other.State = json.RawMessage(`{"coreSnapshot":"tampered","rover":{}}`)
	if _, err := saveSolarField(app, "player-a", other); !errors.Is(err, errSolarConflict) {
		t.Fatalf("changed retry: %v", err)
	}
}

func TestSolarFieldRejectsIncompleteSave(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	if err := ensureSolarFields(app); err != nil {
		t.Fatal(err)
	}
	write := solarFieldWrite{Site: "mars:east", OperationID: "operation-one", State: json.RawMessage(`{"rover":{}}`)}
	if _, err := saveSolarField(app, "player-a", write); !errors.Is(err, errSolarInvalid) {
		t.Fatalf("incomplete: %v", err)
	}
}

func TestSolarTransferAtomicAndRetry(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	if err := ensureSolarFields(app); err != nil {
		t.Fatal(err)
	}
	state := json.RawMessage(`{"id":"solar:mars:east","coreSnapshot":"{\"v\":1,\"rover\":{\"cargo\":{\"landnam:iron\":2},\"cargoUsed\":2},\"edits\":{\"1,2,3\":0}}","rover":{"cargo":{"landnam:iron":2},"cargoUsed":2},"edits":{"1,2,3":0}}`)
	write := solarFieldWrite{Site: "solar:mars:east", OperationID: "operation-one", State: state}
	if _, err := saveSolarField(app, "player-a", write); err != nil {
		t.Fatal(err)
	}
	req := solarFieldTransfer{Site: write.Site, Revision: 1, RunID: "mission-run-1"}
	if _, err := transferSolarField(app, "player-a", solarFieldTransfer{Site: write.Site, Revision: 2, RunID: req.RunID}); !errors.Is(err, errSolarConflict) {
		t.Fatalf("stale revision: %v", err)
	}
	receipt, err := transferSolarField(app, "player-a", req)
	if err != nil || receipt.Revision != 2 || receipt.Cargo["landnam:iron"] != 2 {
		t.Fatalf("transfer: %#v %v", receipt, err)
	}
	retry, err := transferSolarField(app, "player-a", req)
	if err != nil || retry.Revision != 2 || retry.Cargo["landnam:iron"] != 2 {
		t.Fatalf("retry: %#v %v", retry, err)
	}
	if _, err := transferSolarField(app, "player-b", req); !errors.Is(err, errSolarConflict) {
		t.Fatalf("other account: %v", err)
	}
	field, err := solarFieldRecord(app, "player-a", write.Site)
	if err != nil {
		t.Fatal(err)
	}
	var doc struct {
		Rover struct {
			Cargo     map[string]int64 `json:"cargo"`
			CargoUsed int64            `json:"cargoUsed"`
		} `json:"rover"`
		CoreSnapshot string         `json:"coreSnapshot"`
		Edits        map[string]int `json:"edits"`
	}
	rawState, err := json.Marshal(field.GetRaw("state"))
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(rawState, &doc); err != nil {
		t.Fatal(err)
	}
	var coreDoc struct {
		Rover struct {
			Cargo     map[string]int64 `json:"cargo"`
			CargoUsed int64            `json:"cargoUsed"`
		} `json:"rover"`
		Edits map[string]int `json:"edits"`
	}
	if err := json.Unmarshal([]byte(doc.CoreSnapshot), &coreDoc); err != nil {
		t.Fatal(err)
	}
	if field.GetInt("revision") != 2 || len(doc.Rover.Cargo) != 0 || len(coreDoc.Rover.Cargo) != 0 || doc.Rover.CargoUsed != 0 || coreDoc.Rover.CargoUsed != 0 || len(doc.Edits) != 1 || len(coreDoc.Edits) != 1 {
		t.Fatalf("cargo not cleared or edits lost: %#v %#v", doc, coreDoc)
	}
}

func TestSolarTransferRejectsInconsistentCargoWithoutMutation(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	if err := ensureSolarFields(app); err != nil {
		t.Fatal(err)
	}
	state := json.RawMessage(`{"coreSnapshot":"{\"rover\":{\"cargo\":{\"landnam:iron\":1},\"cargoUsed\":1}}","rover":{"cargo":{"landnam:iron":2},"cargoUsed":2}}`)
	write := solarFieldWrite{Site: "solar:mars:east", OperationID: "operation-one", State: state}
	if _, err := saveSolarField(app, "player-a", write); err != nil {
		t.Fatal(err)
	}
	if _, err := transferSolarField(app, "player-a", solarFieldTransfer{Site: write.Site, Revision: 1, RunID: "mission-run-1"}); !errors.Is(err, errSolarInvalid) {
		t.Fatalf("mismatch: %v", err)
	}
	field, err := solarFieldRecord(app, "player-a", write.Site)
	if err != nil || field.GetInt("revision") != 1 {
		t.Fatalf("field mutated: %v", err)
	}
	if _, err := solarTransferRecord(app, "player-a", "mission-run-1"); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("receipt created: %v", err)
	}
}

func TestSolarTransferHTTPAuthenticationAndRecovery(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		users = core.NewAuthCollection("users")
		if err := app.Save(users); err != nil {
			t.Fatal(err)
		}
	}
	newUser := func(email string) *core.Record {
		user := core.NewRecord(users)
		user.SetEmail(email)
		user.SetPassword("password12345")
		if err := app.Save(user); err != nil {
			t.Fatal(err)
		}
		return user
	}
	first, other := newUser("first@example.test"), newUser("other@example.test")
	firstToken, err := first.NewAuthToken()
	if err != nil {
		t.Fatal(err)
	}
	otherToken, err := other.NewAuthToken()
	if err != nil {
		t.Fatal(err)
	}
	t.Setenv("LANDNAM_SOLAR_TRANSFER_ENABLED", "1")
	registerSolarFieldRoutes(app)
	router, err := apis.NewRouter(app)
	if err != nil {
		t.Fatal(err)
	}
	event := &core.ServeEvent{App: app, Router: router}
	err = app.OnServe().Trigger(event, func(e *core.ServeEvent) error {
		mux, err := e.Router.BuildMux()
		if err != nil {
			return err
		}
		request := func(method, path, token, body string) *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(method, path, strings.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			if token != "" {
				req.Header.Set("Authorization", token)
			}
			mux.ServeHTTP(rec, req)
			return rec
		}
		if res := request("GET", "/api/solar-fields?site=solar%3Amars%3Aeast", "", ""); res.Code != 401 {
			t.Fatalf("unauthenticated: %d %s", res.Code, res.Body.String())
		}
		state := json.RawMessage(`{"coreSnapshot":"{\"rover\":{\"cargo\":{\"landnam:iron\":2},\"cargoUsed\":2}}","rover":{"cargo":{"landnam:iron":2},"cargoUsed":2}}`)
		if _, err := saveSolarField(app, first.Id, solarFieldWrite{Site: "solar:mars:east", OperationID: "operation-one", State: state}); err != nil {
			t.Fatal(err)
		}
		transfer := `{"site":"solar:mars:east","revision":1,"runId":"mission-run-1"}`
		if err := os.Setenv("LANDNAM_SOLAR_TRANSFER_ENABLED", "0"); err != nil {
			t.Fatal(err)
		}
		if res := request("POST", "/api/solar-fields/transfer", firstToken, transfer); res.Code != 503 {
			t.Fatalf("disabled transfer: %d %s", res.Code, res.Body.String())
		}
		if err := os.Setenv("LANDNAM_SOLAR_TRANSFER_ENABLED", "1"); err != nil {
			t.Fatal(err)
		}
		if res := request("POST", "/api/solar-fields/transfer", firstToken, transfer); res.Code != 200 || !strings.Contains(res.Body.String(), `"landnam:iron":2`) {
			t.Fatalf("transfer: %d %s", res.Code, res.Body.String())
		}
		if res := request("GET", "/api/solar-fields/transfer?runId=mission-run-1", firstToken, ""); res.Code != 200 || !strings.Contains(res.Body.String(), `"landnam:iron":2`) {
			t.Fatalf("recovery: %d %s", res.Code, res.Body.String())
		}
		if res := request("GET", "/api/solar-fields/transfer?runId=mission-run-1", otherToken, ""); res.Code != 404 {
			t.Fatalf("cross-account recovery: %d %s", res.Code, res.Body.String())
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

// Fixture generated by the vendored Takeon Simulation.serialize(), after
// seeding two units of iron into its rover. This guards the Go snapshot format.
func TestSolarTransferRealEngineSnapshot(t *testing.T) {
	state, err := os.ReadFile("testdata/solar-field-engine.json")
	if err != nil {
		t.Fatal(err)
	}
	after, cargo, err := extractSolarCargo(state)
	if err != nil {
		t.Fatal(err)
	}
	if cargo["landnam:iron"] != 2 {
		t.Fatalf("incorrect cargo: %v", cargo)
	}
	var doc struct {
		CoreSnapshot string `json:"coreSnapshot"`
		Rover        struct {
			Cargo     map[string]int64 `json:"cargo"`
			CargoUsed int64            `json:"cargoUsed"`
		} `json:"rover"`
	}
	if err := json.Unmarshal(after, &doc); err != nil {
		t.Fatal(err)
	}
	if len(doc.Rover.Cargo) != 0 || doc.Rover.CargoUsed != 0 {
		t.Fatal("host cargo remains")
	}
}
