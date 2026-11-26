package main

import (
	"encoding/json"
	"errors"
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
