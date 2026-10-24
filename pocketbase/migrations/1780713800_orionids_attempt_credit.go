package migrations

import (
	"encoding/json"
	"log"
	"regexp"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

// SSL-655: backfill Orionids event progress. Compiled equivalent of pb_migrations/1780713800_orionids_attempt_credit.js
// (jsvm is not registered and the Fly image never ships that directory, so the JS version never runs), widened to cover
// the hydrogen case. Until 24 Oct 2026 the Orionids card on the Events board opened an ordinary Free Run, so players
// who did the event hauled hydrogen and left no other trace: a Free Run hydrogen haul finished between 19 Oct 00:00 UTC
// and 24 Oct 12:00 UTC counts as an attempt. Evidence-based, monotonic and idempotent: it only raises orionidsEventStage
// (1 for an attempt, 2 once the surface observation is done) and adds the day's "event" research stamp.
var (
	orionidsLegacyStart = time.Date(2026, 10, 19, 0, 0, 0, 0, time.UTC).UnixMilli()
	orionidsLegacyEnd   = time.Date(2026, 10, 24, 12, 0, 0, 0, time.UTC).UnixMilli()
	hydrogenTitle       = regexp.MustCompile(`(?i)hydrogen`)
	freeOpsID           = regexp.MustCompile(`^freeops-`)
	orionidText         = regexp.MustCompile(`(?i)orionid`)
	surfaceMission      = regexp.MustCompile(`(?i)surface observation|field rover|rover observation`)
)

func asMap(v any) map[string]any {
	m, _ := v.(map[string]any)
	return m
}

func positive(v any) bool {
	n, ok := v.(float64)
	return ok && n > 0
}

func str(v any) string {
	s, _ := v.(string)
	return s
}

// creditOrionidsAttempt returns the state with the event stage and stamp raised, and whether anything changed.
// now is the fallback stamp time (ms) when no evidence record carries a completion time.
func creditOrionidsAttempt(state map[string]any, nowMs int64) (map[string]any, bool) {
	player := asMap(state["player"])
	if player == nil {
		return state, false
	}
	var orionids, hydrogen []map[string]any
	surfaceDone := false
	records, _ := player["completedMissions"].([]any)
	for _, r := range records {
		rec := asMap(r)
		if rec == nil {
			continue
		}
		text := str(rec["id"]) + " " + str(rec["title"])
		if orionidText.MatchString(text) {
			orionids = append(orionids, rec)
			if surfaceMission.MatchString(text) {
				surfaceDone = true
			}
		}
		if at, ok := rec["completedAt"].(float64); ok && int64(at) >= orionidsLegacyStart && int64(at) < orionidsLegacyEnd &&
			freeOpsID.MatchString(str(rec["id"])) && hydrogenTitle.MatchString(str(rec["title"])) {
			hydrogen = append(hydrogen, rec)
		}
	}
	fragments := asMap(player["orionidsFragments"])
	catches := asMap(player["orionidsNightCatches"])
	finds := asMap(player["orionidsFinds"])
	badges := asMap(player["badges"])
	_, hasBadge := badges["orionids-2026"]
	attempted := positive(player["orionidsRunBaseline"]) || (fragments != nil && positive(fragments["caught"])) ||
		(catches != nil && positive(catches["count"])) || len(finds) > 0 || hasBadge || len(orionids) > 0 || len(hydrogen) > 0
	if !attempted {
		return state, false
	}

	currentStage := 0.0
	if s, ok := player["orionidsEventStage"].(float64); ok {
		currentStage = s
	}
	nextStage := currentStage
	if nextStage < 1 {
		nextStage = 1
	}
	if surfaceDone {
		nextStage = 2
	}

	stamps := map[string]any{}
	for k, v := range asMap(player["researchStamps"]) {
		stamps[k] = v
	}
	stampAt := int64(0)
	for _, rec := range append(append([]map[string]any{}, orionids...), hydrogen...) {
		if at, ok := rec["completedAt"].(float64); ok && int64(at) > stampAt {
			stampAt = int64(at)
		}
	}
	if stampAt == 0 {
		stampAt = nowMs
	}
	day := time.UnixMilli(stampAt).UTC().Format("2006-01-02")
	dayStamps, _ := stamps[day].([]any)
	hasEvent := false
	for _, s := range dayStamps {
		if s == "event" {
			hasEvent = true
		}
	}
	changed := false
	if !hasEvent {
		stamps[day] = append(dayStamps, "event")
		changed = true
	}
	if currentStage < nextStage {
		changed = true
	}
	if !changed {
		return state, false
	}
	nextPlayer := map[string]any{}
	for k, v := range player {
		nextPlayer[k] = v
	}
	nextPlayer["orionidsEventStage"] = nextStage
	nextPlayer["researchStamps"] = stamps
	next := map[string]any{}
	for k, v := range state {
		next[k] = v
	}
	next["player"] = nextPlayer
	return next, true
}

func creditOrionidsAttempts(app core.App) error {
	records, err := app.FindRecordsByFilter("game_states", "id != ''", "", 0, 0)
	if err != nil {
		log.Printf("orionids_attempt_credit: no game_states: %v", err)
		return nil
	}
	now := time.Now().UnixMilli()
	for _, record := range records {
		raw, err := json.Marshal(record.GetRaw("state"))
		if err != nil {
			continue
		}
		var state map[string]any
		if json.Unmarshal(raw, &state) != nil {
			// A JSON column can hold a JSON string of the object.
			var text string
			if json.Unmarshal(raw, &text) != nil || json.Unmarshal([]byte(text), &state) != nil {
				continue
			}
		}
		next, changed := creditOrionidsAttempt(state, now)
		if !changed {
			continue
		}
		record.Set("state", next)
		if err := app.Save(record); err != nil {
			return err
		}
	}
	return nil
}

func init() {
	core.AppMigrations.Register(creditOrionidsAttempts, nil)
}
