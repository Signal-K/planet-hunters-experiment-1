package main

import (
	"encoding/json"
	"github.com/pocketbase/dbx"
	"log"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

// The programme read model is projected from offline-first saves. No private readout,
// name or user id leaves this endpoint. Stamps and passport rewards retain their own rules.
type agencyLaunch struct {
	Craft string  `json:"craft"`
	At    float64 `json:"at"`
}
type agencyState struct {
	Player struct {
		Launches     map[string]agencyLaunch `json:"agencyLaunches"`
		Donations    map[string]bool         `json:"agencyDonations"`
		Transit      float64                 `json:"transitSatelliteLaunchedAt"`
		Saturn       float64                 `json:"saturnImagerLaunchedAt"`
		TransitLevel int                     `json:"transitSatelliteLevel"`
		DeepLevel    int                     `json:"deepSpaceTelescopeLevel"`
		Serviced     map[string]float64      `json:"craftServicedAt"`
		Storms       map[string]float64      `json:"spaceStorms"`
		Tess         map[string]struct {
			Verdict string `json:"verdict"`
		} `json:"tessClassifications"`
		Asteroids map[string]json.RawMessage `json:"asteroidClassifications"`
		Frames    map[string]json.RawMessage `json:"saturnClassifications"`
		Radio     map[string]json.RawMessage `json:"radioMeteorClassifications"`
		Probes    map[string]struct {
			Readings map[string]json.RawMessage `json:"readings"`
		} `json:"probes"`
		Targets map[string]json.RawMessage `json:"discoveredExoplanetTargets"`
	} `json:"player"`
}
type agencyProjectTotals struct {
	Contributions int `json:"contributions"`
	DonatedPerDay int `json:"donatedPerDay"`
}
type agencyOverview struct {
	Projects    map[string]*agencyProjectTotals `json:"projects"`
	Surveys     map[string][]string             `json:"surveys"`
	Worlds      map[string]json.RawMessage      `json:"worlds"`
	SiteUnlocks []string                        `json:"siteUnlocks"`
}

func emptyAgencyOverview() agencyOverview {
	return agencyOverview{Projects: map[string]*agencyProjectTotals{
		"exoplanet-hunters": {}, "asteroid-discovery": {}, "saturn-storms": {}, "deposit-survey": {}, "meteor-echoes": {},
	}, Surveys: map[string][]string{}, Worlds: map[string]json.RawMessage{}, SiteUnlocks: []string{}}
}

func agencyCapacity(state agencyState, craft string, now time.Time) int {
	return agencyDataCapacity(state, craft, 1, now)
}
func agencyDataCapacity(state agencyState, craft string, perCraft int, now time.Time) int {
	p := state.Player
	if !p.Donations[craft] {
		return 0
	}
	times := []float64{}
	for _, row := range p.Launches {
		if row.Craft == craft && row.At > 0 && row.At <= float64(now.UnixMilli()) {
			times = append(times, row.At)
		}
	}
	sort.Float64s(times)
	if len(times) < 2 {
		return 0
	}
	total := 0
	for _, launched := range times[1:min(len(times), 101)] {
		since := math.Max(launched, float64(time.Date(2026, 11, 17, 0, 0, 0, 0, time.UTC).UnixMilli()))
		if p.Serviced[craft] > since {
			since = math.Min(p.Serviced[craft], float64(now.UnixMilli()))
		}
		wear := math.Max(0, (float64(now.UnixMilli())-since)/86400000) * 1.5
		from := time.UnixMilli(int64(since)).UTC().Format("2006-01-02")
		for day, kp := range p.Storms {
			if day > from && day <= now.Format("2006-01-02") && kp >= 5 {
				wear += (math.Min(9, kp) - 4) * 6
			}
		}
		condition := math.Round(100 - wear)
		if condition < 15 {
			continue
		}
		if condition < 50 {
			total += (perCraft + 1) / 2
		} else {
			total += perCraft
		}
	}
	return total
}
func addAgencyState(out *agencyOverview, state agencyState, now time.Time) {
	p := state.Player
	out.Projects["exoplanet-hunters"].Contributions += agencyRecordCount(p.Tess)
	out.Projects["asteroid-discovery"].Contributions += agencyRecordCount(p.Asteroids)
	out.Projects["saturn-storms"].Contributions += agencyRecordCount(p.Frames)
	out.Projects["meteor-echoes"].Contributions += agencyRecordCount(p.Radio)
	out.Projects["exoplanet-hunters"].DonatedPerDay += agencyDataCapacity(state, "space-telescope", max(1, min(3, p.TransitLevel)), now)
	out.Projects["asteroid-discovery"].DonatedPerDay += agencyDataCapacity(state, "space-telescope", max(1, min(3, p.DeepLevel)), now)
	out.Projects["saturn-storms"].DonatedPerDay += agencyCapacity(state, "saturn-satellite", now)
	for id, probe := range p.Probes {
		existing := map[string]bool{}
		for _, sector := range out.Surveys[id] {
			existing[sector] = true
		}
		for sector := range probe.Readings {
			if len(sector) != 3 || sector[1] != '_' || sector[0] < '0' || sector[0] > '5' || sector[2] < '0' || sector[2] > '3' {
				continue
			}
			out.Projects["deposit-survey"].Contributions++
			if !existing[sector] {
				out.Surveys[id] = append(out.Surveys[id], sector)
				existing[sector] = true
			}
		}
	}
}
func communityAgencyHandler(app core.App) func(*core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		now := time.Now().UTC()
		out := emptyAgencyOverview()
		states := map[string]agencyState{}
		// Projection only: never return the saves. There is one row per user.
		rows, err := app.FindRecordsByFilter("game_states", "", "-updated", 0, 0)
		if err != nil {
			return apis.NewApiError(500, "Could not read the agency programme", nil)
		}
		for _, row := range rows {
			var state agencyState
			if json.Unmarshal([]byte(row.GetString("state")), &state) == nil {
				if _, seen := states[row.GetString("user")]; !seen {
					states[row.GetString("user")] = state
					addAgencyState(&out, state, now)
				}
			}
		}
		// Only community-verified positive TESS findings create a shared world. A single
		// local planet verdict remains a personal candidate, with no public promotion.
		required := consensusRequired(activePlayers(app, now))
		requests, err := app.FindRecordsByFilter("consensus_requests", "project = 'tess'", "", 0, 0)
		if err != nil {
			return apis.NewApiError(500, "Could not read confirmed findings", nil)
		}
		for _, request := range requests {
			view, err := viewConsensusRequest(app, request, required)
			if err != nil || view.State != consensusVerified {
				continue
			}
			state := states[request.GetString("requester")]
			subject := request.GetString("subject_id")
			if state.Player.Tess[subject].Verdict != "planet" {
				continue
			}
			var readout struct {
				Verdict string `json:"verdict"`
			}
			if json.Unmarshal([]byte(request.GetString("readout")), &readout) != nil || (readout.Verdict != "planet" && readout.Verdict != "TRANSIT") {
				continue
			}
			id := "exo-"
			for _, c := range subject {
				if c >= 'A' && c <= 'Z' {
					c += 32
				}
				if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-' {
					id += string(c)
				} else {
					id += "-"
				}
			}
			if target := state.Player.Targets[id]; len(target) > 0 {
				if err := publishAgencyWorld(app, id, target); err != nil {
					return apis.NewApiError(500, "Could not publish confirmed world", nil)
				}
			}
		}
		worlds, err := app.FindRecordsByFilter("agency_worlds", "", "", 0, 0)
		if err != nil {
			return apis.NewApiError(500, "Could not read confirmed worlds", nil)
		}
		for _, world := range worlds {
			out.Worlds[world.GetString("target_id")] = json.RawMessage(world.GetString("target"))
		}
		// A completed construction project grants a permanent launch licence to everyone.
		projects := []struct {
			Project string `db:"project"`
		}{}
		err = app.DB().NewQuery("SELECT DISTINCT project FROM community_contributions").All(&projects)
		if err != nil {
			return apis.NewApiError(500, "Could not read completed construction", nil)
		}
		for _, project := range projects {
			month, err := time.Parse("2006-01", trimAgencySitePrefix(project.Project))
			if err != nil {
				continue
			}
			totals, err := siteSums(app, project.Project, "")
			if err != nil {
				continue
			}
			template := siteTemplateFor(app, month, now)
			view := buildSiteView(siteLedger, project.Project, template, totals, map[string]int{}, true)
			if view.Fill >= 1 {
				out.SiteUnlocks = append(out.SiteUnlocks, project.Project+":"+template)
			}
		}
		e.Response.Header().Set("Cache-Control", "private, max-age=30")
		return e.JSON(http.StatusOK, out)
	}
}
func trimAgencySitePrefix(project string) string {
	const prefix = "community-site-"
	if len(project) > len(prefix) && project[:len(prefix)] == prefix {
		return project[len(prefix):]
	}
	return ""
}
func registerAgencyProgramme(app core.App) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.GET("/api/community/agency", communityAgencyHandler(app)).Bind(apis.RequireAuth("users"))
		return se.Next()
	})
}

func ensureAgencyWorlds(app core.App) {
	if _, err := app.FindCollectionByNameOrId("agency_worlds"); err == nil {
		return
	}
	col := core.NewBaseCollection("agency_worlds")
	col.Fields.Add(&core.TextField{Name: "target_id", Required: true, Max: 200})
	col.Fields.Add(&core.JSONField{Name: "target", MaxSize: 16000})
	col.Indexes = []string{"CREATE UNIQUE INDEX idx_agency_worlds_target ON agency_worlds (target_id)"}
	if err := app.Save(col); err != nil {
		log.Printf("failed to create agency_worlds: %v", err)
	}
}
func publishAgencyWorld(app core.App, id string, target json.RawMessage) error {
	if existing, _ := app.FindFirstRecordByFilter("agency_worlds", "target_id = {:id}", dbx.Params{"id": id}); existing != nil {
		return nil
	}
	var shape struct {
		ID       string   `json:"id"`
		Type     string   `json:"type"`
		Orbit    float64  `json:"orbit"`
		Minerals []string `json:"minerals"`
	}
	if len(target) > 16000 || json.Unmarshal(target, &shape) != nil || shape.ID != id || shape.Type != "exoplanet" || shape.Orbit <= 0 || shape.Orbit > 10 || len(shape.Minerals) == 0 || len(shape.Minerals) > 32 {
		return nil
	}
	col, err := app.FindCollectionByNameOrId("agency_worlds")
	if err != nil {
		return err
	}
	rec := core.NewRecord(col)
	rec.Set("target_id", id)
	rec.Set("target", target)
	if err = app.Save(rec); err != nil { // Another reader may have promoted the same candidate concurrently.
		if existing, _ := app.FindFirstRecordByFilter("agency_worlds", "target_id = {:id}", dbx.Params{"id": id}); existing != nil {
			return nil
		}
	}
	return err
}

func agencyRecordCount[T any](records map[string]T) int {
	n := 0
	for id := range records {
		if !strings.HasPrefix(id, "training-") {
			n++
		}
	}
	return n
}
