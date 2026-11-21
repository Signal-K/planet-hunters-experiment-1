package main

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/router"
)

func TestAgencySharedCapacityAndSurveyUnion(t *testing.T) {
	now := time.Date(2026, 12, 1, 12, 0, 0, 0, time.UTC)
	var state agencyState
	if err := json.Unmarshal([]byte(`{"player":{"transitSatelliteLaunchedAt":1796126400000,"agencyLaunches":{"first":{"craft":"space-telescope","at":1796126400000},"second":{"craft":"space-telescope","at":1796126400001}},"agencyDonations":{"space-telescope":true},"transitSatelliteLevel":2,"probes":{"eros":{"readings":{"0_0":{},"1_0":{},"bad":{}}}},"tessClassifications":{"one":{"verdict":"planet"}}}}`), &state); err != nil {
		t.Fatal(err)
	}
	state.Player.Transit = float64(now.Add(-24 * time.Hour).UnixMilli())
	state.Player.Launches = map[string]agencyLaunch{"first": {Craft: "space-telescope", At: state.Player.Transit}, "second": {Craft: "space-telescope", At: state.Player.Transit + 1}}
	out := emptyAgencyOverview()
	addAgencyState(&out, state, now)
	addAgencyState(&out, state, now)
	if out.Projects["exoplanet-hunters"].DonatedPerDay != 4 || out.Projects["exoplanet-hunters"].Contributions != 2 {
		t.Fatalf("wrong project totals: %+v", out.Projects)
	}
	if len(out.Surveys["eros"]) != 2 || out.Projects["deposit-survey"].Contributions != 4 {
		t.Fatalf("survey should union sectors while retaining agency contributions: %+v", out)
	}
	state.Player.Donations["space-telescope"] = false
	if agencyCapacity(state, "space-telescope", now) != 0 {
		t.Fatal("keeping capacity must remove it from the pool")
	}
	state.Player.Donations["space-telescope"] = true
	state.Player.Transit = float64(now.Add(-100 * 24 * time.Hour).UnixMilli())
	state.Player.Serviced = map[string]float64{"space-telescope": float64(now.Add(-60 * 24 * time.Hour).UnixMilli())}
	if agencyCapacity(state, "space-telescope", now.Add(100*24*time.Hour)) != 0 {
		t.Fatal("failed craft cannot donate data")
	}
}

func TestAgencyPromotesOnlyVerifiedPositiveFindingsAndKeepsWorld(t *testing.T) {
	app := newLedgerTestApp(t)
	ensureAgencyWorlds(app)
	ensureConsensusCollections(app)
	siteCol := core.NewBaseCollection("community_contributions")
	siteCol.Fields.Add(&core.TextField{Name: "project"}, &core.TextField{Name: "component"}, &core.TextField{Name: "user"}, &core.NumberField{Name: "units"})
	if err := app.Save(siteCol); err != nil {
		t.Fatal(err)
	}
	user := ledgerTestUser(t, app, "agency-private@example.test", "agency-private")
	users, _ := app.FindRecordById("users", user)
	col, _ := app.FindCollectionByNameOrId("game_states")
	save := core.NewRecord(col)
	save.Set("user", user)
	save.Set("state", `{"player":{"tessClassifications":{"Subject.1":{"verdict":"planet"}},"discoveredExoplanetTargets":{"exo-subject-1":{"id":"exo-subject-1","name":"Verified transit","type":"exoplanet","orbit":5,"minerals":["iron"]}},"probes":{"eros":{"readings":{"0_0":{}}}}}}`)
	if err := app.Save(save); err != nil {
		t.Fatal(err)
	}
	requests, _ := app.FindCollectionByNameOrId("consensus_requests")
	request := core.NewRecord(requests)
	request.Set("requester", user)
	request.Set("project", "tess")
	request.Set("subject_id", "Subject.1")
	request.Set("readout", `{"verdict":"TRANSIT","rows":[]}`)
	if err := app.Save(request); err != nil {
		t.Fatal(err)
	}
	read := func() agencyOverview {
		t.Helper()
		response := httptest.NewRecorder()
		event := &core.RequestEvent{App: app, Auth: users, Event: router.Event{Response: response, Request: httptest.NewRequest("GET", "/api/community/agency", nil)}}
		if err := communityAgencyHandler(app)(event); err != nil {
			t.Fatal(err)
		}
		if strings.Contains(response.Body.String(), user) || strings.Contains(response.Body.String(), "agency-private") || strings.Contains(response.Body.String(), "readout") {
			t.Fatal("projection leaked a private field")
		}
		var got agencyOverview
		if err := json.Unmarshal(response.Body.Bytes(), &got); err != nil {
			t.Fatal(err)
		}
		return got
	}
	if len(read().Worlds) != 0 {
		t.Fatal("one agency cannot publish a world")
	}
	votes, _ := app.FindCollectionByNameOrId("consensus_votes")
	for _, id := range []string{"reviewer-a", "reviewer-b", "reviewer-c"} {
		vote := core.NewRecord(votes)
		vote.Set("user", id)
		vote.Set("request", request.Id)
		vote.Set("verdict", "support")
		if err := app.Save(vote); err != nil {
			t.Fatal(err)
		}
	}
	if len(read().Worlds) != 1 {
		t.Fatal("independent consensus should promote the real saved target")
	}
	request.Set("readout", `{"verdict":"NOISE","rows":[]}`)
	if err := app.Save(request); err != nil {
		t.Fatal(err)
	}
	if len(read().Worlds) != 1 {
		t.Fatal("a published world should survive subsequent changes in requests and active-player thresholds")
	}
	records, _ := app.FindRecordsByFilter("agency_worlds", "", "", 0, 0)
	if len(records) != 1 {
		t.Fatal("repeat reads duplicated the world")
	}
}

func TestAgencyLaunchCountsInPassportAndLedgerKeepsProject(t *testing.T) {
	now := time.Date(2026, 11, 20, 12, 0, 0, 0, time.UTC)
	if days := passportDays(map[string][]string{"2026-11-20": {"launch", "classification"}}, now); len(days["2026-11-16"]) != 1 {
		t.Fatal("a launch stamps a passport day exactly once")
	}
	reporter := newLedgerReporter()
	reporter.now = func() time.Time { return now }
	rows := reporter.pendingStamps("u", `{"player":{"researchStamps":{"2026-11-20":["classification"]},"researchStampProjects":{"2026-11-20":{"classification":"saturn-storms"}}}}`)
	if len(rows) != 1 || rows[0].Project != "saturn-storms" {
		t.Fatalf("lost project attribution: %+v", rows)
	}
}
