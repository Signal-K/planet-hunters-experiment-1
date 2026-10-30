package migrations

import (
	"testing"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

func ms(y int, mo time.Month, d, h int) float64 {
	return float64(time.Date(y, mo, d, h, 0, 0, 0, time.UTC).UnixMilli())
}

func stateWith(missions ...map[string]any) map[string]any {
	list := make([]any, len(missions))
	for i, m := range missions {
		list[i] = m
	}
	return map[string]any{"player": map[string]any{"completedMissions": list, "missionsDone": 3.0}}
}

func stageOf(state map[string]any) float64 {
	s, _ := asMap(state["player"])["orionidsEventStage"].(float64)
	return s
}

func TestHydrogenHaulDuringTheEventWindowIsCredited(t *testing.T) {
	st := stateWith(map[string]any{"id": "freeops-bulk-run", "title": "Hydrogen haul", "completedAt": ms(2026, 10, 20, 12)})
	next, changed := creditOrionidsAttempt(st, 0)
	if !changed || stageOf(next) != 1 {
		t.Fatalf("a hydrogen haul in the window should reach stage 1, got changed=%v stage=%v", changed, stageOf(next))
	}
	stamps := asMap(asMap(next["player"])["researchStamps"])
	if days, _ := stamps["2026-10-20"].([]any); len(days) != 1 || days[0] != "event" {
		t.Fatalf("expected the event stamp on the haul's day, got %v", stamps)
	}
	again, changedAgain := creditOrionidsAttempt(next, 0)
	if changedAgain || stageOf(again) != 1 {
		t.Fatal("running it twice must change nothing")
	}
}

func TestOrdinaryHaulsOutsideTheWindowAreNotCredited(t *testing.T) {
	for name, m := range map[string]map[string]any{
		"before":   {"id": "freeops-bulk-run", "title": "Hydrogen haul", "completedAt": ms(2026, 10, 18, 12)},
		"after":    {"id": "freeops-bulk-run", "title": "Hydrogen haul", "completedAt": ms(2026, 10, 25, 12)},
		"copper":   {"id": "freeops-bulk-run", "title": "Copper haul", "completedAt": ms(2026, 10, 20, 12)},
		"a client": {"id": "lnm_m1", "title": "Hydrogen delivery", "completedAt": ms(2026, 10, 20, 12)},
	} {
		if _, changed := creditOrionidsAttempt(stateWith(m), 0); changed {
			t.Fatalf("%s must not be credited", name)
		}
	}
}

func TestExistingEvidenceAndStagesAreKept(t *testing.T) {
	st := stateWith()
	asMap(st["player"])["orionidsFragments"] = map[string]any{"caught": 4.0}
	asMap(st["player"])["orionidsEventStage"] = 2.0
	asMap(st["player"])["researchStamps"] = map[string]any{"2026-10-21": []any{"event"}}
	next, _ := creditOrionidsAttempt(st, int64(ms(2026, 10, 21, 5)))
	if stageOf(next) != 2 {
		t.Fatalf("a stage must never be lowered, got %v", stageOf(next))
	}
	surface := stateWith(map[string]any{"id": "self-directed-orionids-surface-research", "title": "Orionids surface observation", "completedAt": ms(2026, 10, 23, 1)})
	if next, _ := creditOrionidsAttempt(surface, 0); stageOf(next) != 2 {
		t.Fatalf("a finished surface observation is stage 2, got %v", stageOf(next))
	}
}

func TestCreditOnARealDatabase(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	col := core.NewBaseCollection("game_states")
	col.Fields.Add(&core.JSONField{Name: "state", MaxSize: 1 << 20})
	if err := app.Save(col); err != nil {
		t.Fatal(err)
	}
	r := core.NewRecord(col)
	r.Set("state", stateWith(map[string]any{"id": "freeops-bulk-run", "title": "Hydrogen haul", "completedAt": ms(2026, 10, 20, 12)}))
	if err := app.Save(r); err != nil {
		t.Fatal(err)
	}
	if err := creditOrionidsAttempts(app); err != nil {
		t.Fatal(err)
	}
	got, err := app.FindRecordById("game_states", r.Id)
	if err != nil {
		t.Fatal(err)
	}
	var state map[string]any
	if err := got.UnmarshalJSONField("state", &state); err != nil {
		t.Fatal(err)
	}
	if stageOf(state) != 1 {
		t.Fatalf("the saved state should be at stage 1, got %v", stageOf(state))
	}
}
