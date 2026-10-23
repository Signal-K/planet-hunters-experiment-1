package main

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// SSL-673: the shared monthly community research bar. Rules live in ZenNotes
// `projects/landnam/decisions/community-research-fragments-and-stamp-calendar.md`:
//
//   - Every player's research stamps for the current UTC month add to one bar.
//     Stamps are read from the saved game states, which only reach the server
//     through the SSL-321 outbox, so there is no separate write path to abuse.
//   - The first time the total reaches researchGoal, the month is recorded in
//     research_months. Every player then earns +researchBonusPct on Exchange
//     sells for researchBonusDays from that moment.
//   - The response leaves out the caller's own stamps (`others`), so the client
//     adds its local count, including stamps not yet synced, without counting twice.
//
// Mirrors web/lib/research/stamps.ts COMMUNITY_GOAL / COMMUNITY_WEEKLY_REVENUE_PCT.

const (
	researchGoal       = 1000
	researchBonusPct   = 3
	researchBonusDays  = 7
	researchCacheTTL   = time.Minute
	researchKindsLimit = 4
)

var researchStampKinds = map[string]bool{"classification": true, "survey": true, "discovery-mission": true, "event": true}
var researchDayKey = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// researchMonthCounts counts one stamp per known kind per day within month
// ("YYYY-MM"), the same rule as web stampsInMonth.
func researchMonthCounts(stamps map[string][]string, month string) int {
	n := 0
	for day, kinds := range stamps {
		if !researchDayKey.MatchString(day) || !strings.HasPrefix(day, month+"-") {
			continue
		}
		seen := map[string]bool{}
		for _, k := range kinds {
			if researchStampKinds[k] && !seen[k] {
				seen[k] = true
			}
		}
		n += min(len(seen), researchKindsLimit)
	}
	return n
}

type researchTotals struct {
	month  string
	total  int
	byUser map[string]int
	at     time.Time
}

var (
	researchCacheMu sync.Mutex
	researchCache   researchTotals
)

func loadResearchTotals(app core.App, month string, now time.Time) (researchTotals, error) {
	researchCacheMu.Lock()
	defer researchCacheMu.Unlock()
	if researchCache.month == month && now.Sub(researchCache.at) < researchCacheTTL {
		return researchCache, nil
	}
	rows := []struct {
		User   string        `db:"user"`
		Stamps types.JSONRaw `db:"stamps"`
	}{}
	err := app.DB().
		NewQuery("SELECT user, json_extract(state, '$.player.researchStamps') AS stamps FROM game_states").
		All(&rows)
	if err != nil {
		return researchTotals{}, err
	}
	out := researchTotals{month: month, byUser: map[string]int{}, at: now}
	for _, row := range rows {
		if len(row.Stamps) == 0 {
			continue
		}
		var stamps map[string][]string
		if json.Unmarshal(row.Stamps, &stamps) != nil {
			continue
		}
		if n := researchMonthCounts(stamps, month); n > 0 {
			out.byUser[row.User] = n
			out.total += n
		}
	}
	researchCache = out
	return out, nil
}

func ensureResearchCollection(app core.App) {
	if _, err := app.FindCollectionByNameOrId("research_months"); err == nil {
		return
	}
	col := core.NewBaseCollection("research_months")
	col.ListRule = nil
	col.ViewRule = nil
	col.CreateRule = nil
	col.UpdateRule = nil
	col.DeleteRule = nil
	col.Fields.Add(&core.TextField{Name: "month", Required: true, Max: 7})
	col.Fields.Add(&core.DateField{Name: "reached_at"})
	col.Indexes = []string{"CREATE UNIQUE INDEX idx_research_months_month ON research_months (month)"}
	if err := app.Save(col); err != nil {
		log.Printf("failed to save research_months: %v", err)
	}
}

// researchReachedAt returns when month's bar filled, recording it the first
// time total reaches the goal. Zero when the bar is not full.
func researchReachedAt(app core.App, month string, total int, now time.Time) time.Time {
	rec, _ := app.FindFirstRecordByFilter("research_months", "month = {:m}", dbx.Params{"m": month})
	if rec != nil && !rec.GetDateTime("reached_at").IsZero() {
		return rec.GetDateTime("reached_at").Time()
	}
	if total < researchGoal {
		return time.Time{}
	}
	if rec == nil {
		col, err := app.FindCollectionByNameOrId("research_months")
		if err != nil {
			return time.Time{}
		}
		rec = core.NewRecord(col)
		rec.Set("month", month)
	}
	rec.Set("reached_at", now)
	if err := app.Save(rec); err != nil {
		log.Printf("failed to record research month %s: %v", month, err)
	}
	return now
}

func communityResearchHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		now := time.Now().UTC()
		month := now.Format("2006-01")
		totals, err := loadResearchTotals(app, month, now)
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to count research", nil)
		}
		reached := researchReachedAt(app, month, totals.total, now)
		body := map[string]any{
			"month":      month,
			"others":     totals.total - totals.byUser[e.Auth.Id],
			"goal":       researchGoal,
			"bonusPct":   researchBonusPct,
			"reachedAt":  nil,
			"bonusUntil": nil,
		}
		if !reached.IsZero() {
			body["reachedAt"] = reached.UnixMilli()
			body["bonusUntil"] = reached.Add(researchBonusDays * 24 * time.Hour).UnixMilli()
		}
		return e.JSON(http.StatusOK, body)
	}
}
