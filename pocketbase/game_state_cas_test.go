package main

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/pocketbase/pocketbase/core"
)

func TestGameStateCompareAndSave(t *testing.T) {
	app := newLedgerTestApp(t)
	col, err := app.FindCollectionByNameOrId("game_states")
	if err != nil {
		t.Fatal(err)
	}
	record := core.NewRecord(col)
	record.Set("user", "player")
	record.Set("state", json.RawMessage(`{"player":{"francs":10},"unknown":{"kept":true}}`))
	if err := app.Save(record); err != nil {
		t.Fatal(err)
	}
	write := gameStateCASWrite{RecordID: record.Id, Expected: json.RawMessage(`{"unknown":{"kept":true},"player":{"francs":10}}`), State: json.RawMessage(`{"player":{"francs":20},"unknown":{"kept":true}}`), MissionsDone: 2}
	if err := compareAndSaveGameState(app, "other", write); !errors.Is(err, errGameStateConflict) {
		t.Fatalf("wrong owner: %v", err)
	}
	if err := compareAndSaveGameState(app, "player", write); err != nil {
		t.Fatal(err)
	}
	if err := compareAndSaveGameState(app, "player", write); !errors.Is(err, errGameStateConflict) {
		t.Fatalf("stale snapshot: %v", err)
	}
	got, err := app.FindRecordById("game_states", record.Id)
	if err != nil {
		t.Fatal(err)
	}
	var state map[string]any
	raw, _ := json.Marshal(got.GetRaw("state"))
	if err := json.Unmarshal(raw, &state); err != nil {
		t.Fatal(err)
	}
	if state["player"].(map[string]any)["francs"] != float64(20) || got.GetInt("missions_done") != 2 {
		t.Fatalf("unexpected save: %s", raw)
	}
}
