package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// One contribution per player per UTC day. Historical snapshots are monotonic:
// a stale save or a player returning next week cannot erase an earned part.
const passportStart = "2026-10-05"
const passportGoal = 100

var passportMu sync.Mutex
var passportKinds = map[string]bool{"classification": true, "survey": true, "discovery-mission": true, "event": true, "exchange-sale": true, "contract-run": true, "price-alert": true, "gift": true, "review": true, "probe-observation": true}

type passportWeek struct {
	Week      string `json:"week"`
	Total     int    `json:"total"`
	Mine      int    `json:"mine"`
	Goal      int    `json:"goal"`
	ReachedAt *int64 `json:"reachedAt"`
	Earned    bool   `json:"earned"`
}
type passportLedger struct {
	week    string
	days    map[string][]string
	reached time.Time
	record  *core.Record
}

func passportWeekKey(day time.Time) string {
	day = day.UTC()
	offset := (int(day.Weekday()) + 6) % 7
	return day.UTC().AddDate(0, 0, -offset).Format("2006-01-02")
}
func passportDays(stamps map[string][]string, now time.Time) map[string][]string {
	weeks := map[string][]string{}
	today := now.UTC().Format("2006-01-02")
	for key, kinds := range stamps {
		day, err := time.Parse("2006-01-02", key)
		if err != nil || day.Format("2006-01-02") != key || key > today {
			continue
		}
		week := passportWeekKey(day)
		if week < passportStart {
			continue
		}
		for _, kind := range kinds {
			if passportKinds[kind] {
				weeks[week] = append(weeks[week], key)
				break
			}
		}
	}
	for week := range weeks {
		sort.Strings(weeks[week])
	}
	return weeks
}
func mergePassportDays(a, b []string) []string {
	seen := map[string]bool{}
	for _, day := range append(append([]string{}, a...), b...) {
		seen[day] = true
	}
	out := make([]string, 0, len(seen))
	for day := range seen {
		out = append(out, day)
	}
	sort.Strings(out)
	return out
}
func passportView(row passportLedger, user string) passportWeek {
	out := passportWeek{Week: row.week, Goal: passportGoal, Mine: len(row.days[user])}
	for _, days := range row.days {
		out.Total += len(days)
	}
	if !row.reached.IsZero() {
		at := row.reached.UnixMilli()
		out.ReachedAt = &at
		out.Earned = out.Mine > 0
	}
	return out
}
func ensurePassportCollection(app core.App) {
	if _, err := app.FindCollectionByNameOrId("research_weeks"); err == nil {
		return
	}
	col := core.NewBaseCollection("research_weeks")
	col.Fields.Add(&core.TextField{Name: "week", Required: true, Max: 10})
	col.Fields.Add(&core.JSONField{Name: "contributors", MaxSize: 16 * 1024 * 1024})
	col.Fields.Add(&core.DateField{Name: "reached_at"})
	col.Indexes = []string{"CREATE UNIQUE INDEX idx_research_weeks_week ON research_weeks (week)"}
	if err := app.Save(col); err != nil {
		app.Logger().Error("failed to create research_weeks", "error", err)
	}
}
func loadPassport(app core.App, user string, now time.Time) ([]passportWeek, error) {
	passportMu.Lock()
	defer passportMu.Unlock()
	records, err := app.FindRecordsByFilter("research_weeks", "", "-week", 0, 0)
	if err != nil {
		return nil, err
	}
	weeks := map[string]*passportLedger{}
	for _, rec := range records {
		row := &passportLedger{week: rec.GetString("week"), days: map[string][]string{}, reached: rec.GetDateTime("reached_at").Time(), record: rec}
		if err := rec.UnmarshalJSONField("contributors", &row.days); err != nil {
			return nil, err
		}
		weeks[row.week] = row
	}
	rows := []struct {
		User   string        `db:"user"`
		Stamps types.JSONRaw `db:"stamps"`
	}{}
	if err := app.DB().NewQuery("SELECT user, json_extract(state, '$.player.researchStamps') AS stamps FROM game_states").All(&rows); err != nil {
		return nil, err
	}
	for _, saved := range rows {
		stamps := map[string][]string{}
		if json.Unmarshal(saved.Stamps, &stamps) != nil {
			continue
		}
		for week, days := range passportDays(stamps, now) {
			row := weeks[week]
			if row == nil {
				row = &passportLedger{week: week, days: map[string][]string{}}
				weeks[week] = row
			}
			row.days[saved.User] = mergePassportDays(row.days[saved.User], days)
		}
	}
	current := passportWeekKey(now.UTC())
	if weeks[current] == nil {
		weeks[current] = &passportLedger{week: current, days: map[string][]string{}}
	}
	collection, err := app.FindCollectionByNameOrId("research_weeks")
	if err != nil {
		return nil, err
	}
	out := make([]passportWeek, 0, len(weeks))
	for _, row := range weeks {
		view := passportView(*row, user)
		if view.Total >= passportGoal && row.reached.IsZero() {
			row.reached = now
		}
		if view.Total > 0 {
			before := ""
			if row.record != nil {
				before = row.record.GetString("contributors")
			}
			raw, _ := json.Marshal(row.days)
			if row.record == nil || before != string(raw) || (row.record.GetDateTime("reached_at").IsZero() && !row.reached.IsZero()) {
				if row.record == nil {
					row.record = core.NewRecord(collection)
					row.record.Set("week", row.week)
				}
				row.record.Set("contributors", row.days)
				if !row.reached.IsZero() {
					row.record.Set("reached_at", row.reached)
				}
				if err := app.Save(row.record); err != nil {
					return nil, err
				}
			}
		}
		out = append(out, passportView(*row, user))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Week > out[j].Week })
	return out, nil
}
func communityPassportHandler(app core.App) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		weeks, err := loadPassport(app, e.Auth.Id, time.Now().UTC())
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to load weekly research", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"weeks": weeks})
	}
}
