package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

// SSL-763: report Landnam's daily research stamps to the shared
// platform_contributions ledger (tickets-please, SSC-49) so the Garden's
// community garden counts Landnam players.
//
// Nothing is added to the client. Stamps already reach this server through the
// outbox as game_states writes, so the report hangs off those saves. A report
// is one small batched call to the shared backend, and none when nothing is
// new. A failed report never blocks the save: the stamps stay unreported in
// memory and go out again on the player's next save. The ledger key
// (userId, game, kind, day) is unique, so a repeat is a harmless no-op.
//
// Landnam's own community bar (research.go) is not touched and never reads
// the ledger.

const (
	ledgerGame = "landnam"
	// No backfill from before the ledger existed.
	ledgerFirstDay = "2026-10-01"
	// Only recent days are (re)reported, so an outage heals but history is
	// never replayed.
	ledgerWindowDays = 7
	ledgerBatchLimit = 200
	// A guest or an account without a Clerk id is not re-looked-up on every save.
	ledgerSkipTTL = 10 * time.Minute
)

// The stamp kinds Landnam already uses, trader kinds included. Mirrors
// STAMP_KINDS in web/lib/research/stamps.ts. research.go counts only the first
// four toward the community bar; the ledger takes all of them.
var ledgerStampKinds = map[string]bool{
	"classification": true, "survey": true, "discovery-mission": true, "event": true,
	"exchange-sale": true, "contract-run": true, "price-alert": true,
}

type ledgerRow struct {
	UserID string `json:"userId"`
	Game   string `json:"game"`
	Kind   string `json:"kind"`
	Day    string `json:"day"`
}

type ledgerReporter struct {
	url    string
	key    string
	client *http.Client
	now    func() time.Time

	mu       sync.Mutex
	reported map[string]map[string]struct{} // user record id -> "kind|day"
	skipped  map[string]time.Time           // user record id -> skip until
}

func newLedgerReporter() *ledgerReporter {
	sharedURL := strings.TrimRight(strings.TrimSpace(os.Getenv("SHARED_PB_URL")), "/")
	return &ledgerReporter{
		url:      sharedURL + "/api/platform/contributions",
		key:      strings.TrimSpace(os.Getenv("SHARED_INTERNAL_API_KEY")),
		client:   &http.Client{Timeout: 5 * time.Second},
		now:      time.Now,
		reported: map[string]map[string]struct{}{},
		skipped:  map[string]time.Time{},
	}
}

func (r *ledgerReporter) enabled() bool {
	return r.key != "" && strings.HasPrefix(r.url, "http")
}

// registerLandnamLedgerReport hooks game_states saves. Without
// SHARED_INTERNAL_API_KEY (local dev, tests) it does nothing and play is
// unchanged.
func registerLandnamLedgerReport(app core.App) {
	reporter := newLedgerReporter()
	if !reporter.enabled() {
		return
	}
	report := func(e *core.RecordEvent) error {
		userID := e.Record.GetString("user")
		state := e.Record.GetString("state")
		go reporter.report(e.App, userID, state)
		return e.Next()
	}
	app.OnRecordAfterCreateSuccess("game_states").BindFunc(report)
	app.OnRecordAfterUpdateSuccess("game_states").BindFunc(report)
}

// pendingStamps returns the recent, valid, not-yet-reported (kind, day) pairs
// in a game_states state blob.
func (r *ledgerReporter) pendingStamps(userID, stateJSON string) []ledgerRow {
	if stateJSON == "" {
		return nil
	}
	var state struct {
		Player struct {
			ResearchStamps map[string][]string `json:"researchStamps"`
		} `json:"player"`
	}
	if json.Unmarshal([]byte(stateJSON), &state) != nil {
		return nil
	}

	now := r.now().UTC()
	today := now.Format("2006-01-02")
	floor := now.AddDate(0, 0, -ledgerWindowDays).Format("2006-01-02")
	if floor < ledgerFirstDay {
		floor = ledgerFirstDay
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	done := r.reported[userID]
	for key := range done { // keep the memory bounded to the window
		if day := key[strings.Index(key, "|")+1:]; day < floor {
			delete(done, key)
		}
	}

	var rows []ledgerRow
	for day, kinds := range state.Player.ResearchStamps {
		if !researchDayKey.MatchString(day) || day < floor || day > today {
			continue
		}
		seen := map[string]bool{}
		for _, kind := range kinds {
			if !ledgerStampKinds[kind] || seen[kind] {
				continue
			}
			seen[kind] = true
			if _, ok := done[kind+"|"+day]; ok {
				continue
			}
			rows = append(rows, ledgerRow{Game: ledgerGame, Kind: kind, Day: day})
		}
	}
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Day != rows[j].Day {
			return rows[i].Day < rows[j].Day
		}
		return rows[i].Kind < rows[j].Kind
	})
	if len(rows) > ledgerBatchLimit {
		rows = rows[:ledgerBatchLimit]
	}
	return rows
}

// report sends this player's new stamps, if any. It returns an error only so
// tests can see why a report did not go out; callers ignore it, because a
// failed report must never affect saving the game.
func (r *ledgerReporter) report(app core.App, userID, stateJSON string) error {
	rows := r.pendingStamps(userID, stateJSON)
	if len(rows) == 0 {
		return nil // nothing new: no lookup, no call
	}

	r.mu.Lock()
	until, skipped := r.skipped[userID]
	r.mu.Unlock()
	if skipped && r.now().Before(until) {
		return nil
	}

	clerkID := ""
	if user, err := app.FindRecordById("users", userID); err == nil {
		clerkID = strings.TrimSpace(user.GetString("clerkId"))
	}
	if clerkID == "" { // guests and pre-Clerk accounts are skipped
		r.mu.Lock()
		r.skipped[userID] = r.now().Add(ledgerSkipTTL)
		r.mu.Unlock()
		return nil
	}
	for i := range rows {
		rows[i].UserID = clerkID
	}

	body, err := json.Marshal(map[string]any{"rows": rows})
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, r.url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("X-Internal-Api-Key", r.key)
	req.Header.Set("Content-Type", "application/json")
	response, err := r.client.Do(req)
	if err != nil {
		log.Printf("ledger report: request failed: %v", err)
		return err
	}
	defer response.Body.Close()
	if response.StatusCode >= http.StatusMultipleChoices {
		log.Printf("ledger report: shared backend returned %d", response.StatusCode)
		return fmt.Errorf("shared backend returned %d", response.StatusCode)
	}

	r.mu.Lock()
	if r.reported[userID] == nil {
		r.reported[userID] = map[string]struct{}{}
	}
	for _, row := range rows {
		r.reported[userID][row.Kind+"|"+row.Day] = struct{}{}
	}
	r.mu.Unlock()
	return nil
}
