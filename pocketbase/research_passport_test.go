package main

import (
	"fmt"
	"testing"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

func TestPassportCountsOneDayAndUsesUTCWeeks(t *testing.T) {
	now := time.Date(2026, 11, 23, 0, 0, 0, 0, time.UTC)
	got := passportDays(map[string][]string{
		"2026-11-22": {"survey", "classification", "gift"},
		"2026-11-23": {"exchange-sale", "price-alert"},
		"2026-11-24": {"event"}, "2026-11-31": {"survey"}, "bad": {"survey"}, "2026-11-21": {"unknown"},
	}, now)
	if len(got["2026-11-16"]) != 1 || len(got["2026-11-23"]) != 1 || len(got) != 2 {
		t.Fatalf("wrong day/week count: %#v", got)
	}
	if got := passportWeekKey(now.In(time.FixedZone("west", -8*3600))); got != "2026-11-23" {
		t.Fatalf("week should use UTC: %s", got)
	}
}
func TestPassportSharedGoalRequiresAContributor(t *testing.T) {
	row := passportLedger{week: "2026-11-16", days: map[string][]string{}}
	for i := 0; i < 20; i++ {
		row.days[fmt.Sprint(i)] = []string{"2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"}
	}
	if v := passportView(row, "0"); v.Total != 100 || v.Earned {
		t.Fatalf("unconfirmed goal should not award: %+v", v)
	}
	row.reached = time.Now()
	if v := passportView(row, "0"); !v.Earned || v.Mine != 5 {
		t.Fatalf("contributor should earn: %+v", v)
	}
	if v := passportView(row, "spectator"); v.Earned || v.Mine != 0 {
		t.Fatalf("spectator cannot earn: %+v", v)
	}
}
func TestPassportLedgerSurvivesStaleSaveAndWeekRollover(t *testing.T) {
	app := newLedgerTestApp(t)
	ensurePassportCollection(app)
	col, _ := app.FindCollectionByNameOrId("game_states")
	var state *core.Record
	var user string
	stamps := ledgerState(`{"2026-11-16":["survey","event"],"2026-11-17":["gift"],"2026-11-18":["classification"],"2026-11-19":["review"],"2026-11-20":["exchange-sale"]}`)
	for i := 0; i < 20; i++ {
		id := ledgerTestUser(t, app, fmt.Sprintf("passport%d@example.test", i), fmt.Sprintf("passport%d", i))
		rec := core.NewRecord(col)
		rec.Set("user", id)
		rec.Set("state", stamps)
		if err := app.Save(rec); err != nil {
			t.Fatal(err)
		}
		if i == 0 {
			state = rec
			user = id
		}
	}
	now := time.Date(2026, 11, 20, 12, 0, 0, 0, time.UTC)
	rows, err := loadPassport(app, user, now)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].Total != 100 || rows[0].Mine != 5 || !rows[0].Earned {
		t.Fatalf("goal did not award contributor: %+v", rows)
	}
	firstReached := *rows[0].ReachedAt
	state.Set("state", ledgerState(`{}`))
	if err := app.Save(state); err != nil {
		t.Fatal(err)
	}
	rows, err = loadPassport(app, user, now.AddDate(0, 0, 7))
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 || rows[0].Week != "2026-11-23" || !rows[1].Earned || rows[1].Mine != 5 || rows[1].Total != 100 || *rows[1].ReachedAt != firstReached {
		t.Fatalf("archive lost contribution: %+v", rows)
	}
	rows, err = loadPassport(app, "spectator", now.AddDate(0, 0, 7))
	if err != nil {
		t.Fatal(err)
	}
	if rows[1].Earned {
		t.Fatal("spectator got part")
	}
}

func TestResearchReceiptOnlyConfirmsOwnSavedKinds(t *testing.T) {
	app := newLedgerTestApp(t)
	user := ledgerTestUser(t, app, "receipt@example.test", "receipt-user")
	other := ledgerTestUser(t, app, "other@example.test", "other-user")
	now := time.Date(2026, 11, 24, 12, 0, 0, 0, time.UTC)
	stamps, err := savedResearchStamps(app, user, now)
	if err != nil || len(stamps) != 0 {
		t.Fatalf("unsynced work confirmed: %#v %v", stamps, err)
	}
	col, _ := app.FindCollectionByNameOrId("game_states")
	rec := core.NewRecord(col)
	rec.Set("user", user)
	rec.Set("state", ledgerState(`{"2026-11-24":["classification","probe-observation","classification","unknown"],"2026-11-25":["event"],"bad":["survey"]}`))
	if err := app.Save(rec); err != nil {
		t.Fatal(err)
	}
	before := rec.GetString("state")
	for i := 0; i < 2; i++ {
		stamps, err = savedResearchStamps(app, user, now)
		if err != nil || len(stamps) != 1 || len(stamps["2026-11-24"]) != 2 {
			t.Fatalf("wrong receipt: %#v %v", stamps, err)
		}
	}
	stamps, err = savedResearchStamps(app, other, now)
	if err != nil || len(stamps) != 0 {
		t.Fatalf("another player's work leaked: %#v %v", stamps, err)
	}
	saved, _ := app.FindRecordById("game_states", rec.Id)
	if saved.GetString("state") != before {
		t.Fatal("reading a receipt changed saved rewards or history")
	}
}
