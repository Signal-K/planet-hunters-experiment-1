package main

import (
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

// SSL-758: the Community Site ledger. Ordinary play fills one shared construction
// bar for the Community Spaceport or Observatory. Players keep everything they mine
// or earn; a contribution only records credit.
//
//   - Each component is fed by one mission type: mining hauls (structure), contract
//     runs (systems), payload launches (instrument), classifications and surveys (data).
//   - The bar is the capped fraction of all component targets, so over-filling one
//     component does not move it.
//   - Rows reach the server through the offline outbox with a deterministic id from
//     (user, project, run). A replay is rejected as a duplicate, and the unique index
//     (user, project, run_id) backs that up, so a run credits once.
//   - The create hook clamps every row: known component, the month's project (with a
//     two-day grace for offline saves), allowed minerals, a per-run ceiling and a
//     per-player cap per component. The server has no mining simulation, so the
//     ledger is idempotent, bounded and attributable, not fully authoritative.
//   - The project is the UTC month. The winning ballot option of that month picks the
//     template. Last month's project is returned as archived with its final total.
//
// Rules mirror shared/community/site.json (site_test.go checks they match).

type siteTemplate struct {
	Name    string
	Targets map[string]int
}

type siteRules struct {
	Components        []string
	Templates         map[string]siteTemplate
	DefaultTemplate   string
	Stages            []siteStage
	PerRun            map[string]int
	PerUserCap        map[string]int
	StructureMinerals map[string]bool
}

type siteStage struct {
	At    float64
	Label string
}

var siteLedger = siteRules{
	Components: []string{"structure", "systems", "instrument", "data"},
	Templates: map[string]siteTemplate{
		"spaceport-launch-site":  {Name: "Community Spaceport", Targets: map[string]int{"structure": 2400, "systems": 600, "instrument": 300, "data": 600}},
		"observatory-instrument": {Name: "Community Observatory", Targets: map[string]int{"structure": 1200, "systems": 400, "instrument": 600, "data": 1200}},
	},
	DefaultTemplate:   "spaceport-launch-site",
	Stages:            []siteStage{{0, "Planning"}, {0.25, "Foundations"}, {0.5, "Frame"}, {0.75, "Fit-out"}, {1, "Complete"}},
	PerRun:            map[string]int{"structure": 40, "systems": 10, "instrument": 25, "data": 5},
	PerUserCap:        map[string]int{"structure": 400, "systems": 100, "instrument": 100, "data": 150},
	StructureMinerals: map[string]bool{"iron": true, "nickel": true, "cobalt": true, "copper": true, "aluminium": true, "silicon": true, "carbon": true},
}

const siteGrace = 48 * time.Hour

func siteProjectKey(t time.Time) string {
	return fmt.Sprintf("community-site-%s", t.UTC().Format("2006-01"))
}

// siteProjectOpen: the month's project, or last month's for two days so an offline save still lands.
func siteProjectOpen(project string, now time.Time) bool {
	return project == siteProjectKey(now) || project == siteProjectKey(now.Add(-siteGrace))
}

var errSiteComponent = errors.New("unknown component")
var errSiteWindow = errors.New("project closed")

// clampContribution returns the credit a row may carry and the minerals it may name.
// alreadyByUser is what this player has already recorded for the component this project.
func clampContribution(r siteRules, project, component string, minerals map[string]float64, alreadyByUser int, now time.Time) (int, map[string]int, error) {
	ceiling, ok := r.PerRun[component]
	if !ok {
		return 0, nil, errSiteComponent
	}
	if !siteProjectOpen(project, now) {
		return 0, nil, errSiteWindow
	}
	units := ceiling
	kept := map[string]int{}
	if component == "structure" {
		units = 0
		for id, n := range minerals {
			if !r.StructureMinerals[id] || n <= 0 || math.IsNaN(n) || math.IsInf(n, 0) {
				continue
			}
			whole := int(math.Floor(n))
			kept[id] = whole
			units += whole
		}
		if units > ceiling {
			units = ceiling
		}
	}
	left := r.PerUserCap[component] - alreadyByUser
	if left < 0 {
		left = 0
	}
	if units > left {
		units = left
	}
	return units, kept, nil
}

type siteComponentView struct {
	ID     string `json:"id"`
	Target int    `json:"target"`
	Total  int    `json:"total"`
	Mine   int    `json:"mine"`
}

type siteView struct {
	Project    string              `json:"project"`
	Template   string              `json:"template"`
	Name       string              `json:"name"`
	Components []siteComponentView `json:"components"`
	Fill       float64             `json:"fill"`
	Stage      string              `json:"stage"`
	MineTotal  int                 `json:"mineTotal"`
	Closed     bool                `json:"closed"`
}

// siteFill is the capped fraction of all targets: over-filling one component does not move the bar.
func siteFill(targets map[string]int, totals map[string]int) float64 {
	need, have := 0, 0
	for id, target := range targets {
		need += target
		have += min(totals[id], target)
	}
	if need == 0 {
		return 0
	}
	return float64(have) / float64(need)
}

func siteStageFor(r siteRules, fill float64) string {
	label := r.Stages[0].Label
	for _, s := range r.Stages {
		if fill >= s.At {
			label = s.Label
		}
	}
	return label
}

func buildSiteView(r siteRules, project, template string, totals, mine map[string]int, closed bool) siteView {
	t, ok := r.Templates[template]
	if !ok {
		template = r.DefaultTemplate
		t = r.Templates[template]
	}
	v := siteView{Project: project, Template: template, Name: t.Name, Closed: closed}
	for _, id := range r.Components {
		v.Components = append(v.Components, siteComponentView{ID: id, Target: t.Targets[id], Total: totals[id], Mine: mine[id]})
		v.MineTotal += mine[id]
	}
	v.Fill = siteFill(t.Targets, totals)
	v.Stage = siteStageFor(r, v.Fill)
	return v
}

// siteTemplateFor picks the month's template from the winning option of a closed ballot for that
// month (the launch ballot first), else the default.
func siteTemplateFor(app core.App, month time.Time, now time.Time) string {
	suffix := month.UTC().Format("2006-01")
	for _, key := range []string{"launch-" + suffix, "astronomy-" + suffix} {
		b, err := loadBallot(app, key)
		if err != nil || ballotPhase(b, now) != ballotStatusClosed {
			continue
		}
		counts, err := ballotCounts(app, key)
		if err != nil {
			continue
		}
		winner := pickWinner(b, counts)
		for _, o := range b.Options {
			if o.ID == winner && siteLedger.Templates[o.Policy.Template].Name != "" {
				return o.Policy.Template
			}
		}
	}
	return siteLedger.DefaultTemplate
}

func siteSums(app core.App, project, userID string) (map[string]int, error) {
	rows := []struct {
		Component string `db:"component"`
		Units     int    `db:"units"`
	}{}
	q := "SELECT component, CAST(COALESCE(SUM(units), 0) AS INTEGER) AS units FROM community_contributions WHERE project = {:p}"
	params := dbx.Params{"p": project}
	if userID != "" {
		q += " AND user = {:u}"
		params["u"] = userID
	}
	if err := app.DB().NewQuery(q + " GROUP BY component").Bind(params).All(&rows); err != nil {
		return nil, err
	}
	out := map[string]int{}
	for _, row := range rows {
		out[row.Component] = row.Units
	}
	return out, nil
}

func siteViewFor(app core.App, month time.Time, userID string, now time.Time, closed bool) (siteView, error) {
	project := siteProjectKey(month)
	totals, err := siteSums(app, project, "")
	if err != nil {
		return siteView{}, err
	}
	mine, err := siteSums(app, project, userID)
	if err != nil {
		return siteView{}, err
	}
	return buildSiteView(siteLedger, project, siteTemplateFor(app, month, now), totals, mine, closed), nil
}

func communitySiteHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		now := time.Now().UTC()
		current, err := siteViewFor(app, now, e.Auth.Id, now, false)
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to read the community site", nil)
		}
		resp := map[string]any{"site": current, "now": now.UnixMilli()}
		lastMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, -1, 0)
		if archived, err := siteViewFor(app, lastMonth, e.Auth.Id, now, true); err == nil && archived.Fill > 0 {
			resp["archived"] = archived
		}
		return e.JSON(http.StatusOK, resp)
	}
}

func registerSiteLedger(app core.App) {
	app.OnRecordCreateRequest("community_contributions").BindFunc(func(e *core.RecordRequestEvent) error {
		rec := e.Record
		component := strings.TrimSpace(rec.GetString("component"))
		project := strings.TrimSpace(rec.GetString("project"))
		minerals := map[string]float64{}
		_ = rec.UnmarshalJSONField("minerals", &minerals)
		var already int
		_ = e.App.DB().NewQuery("SELECT CAST(COALESCE(SUM(units), 0) AS INTEGER) FROM community_contributions WHERE user = {:u} AND project = {:p} AND component = {:c}").
			Bind(dbx.Params{"u": rec.GetString("user"), "p": project, "c": component}).Row(&already)
		units, kept, err := clampContribution(siteLedger, project, component, minerals, already, time.Now().UTC())
		if err != nil {
			return apis.NewBadRequestError(err.Error(), nil)
		}
		rec.Set("units", units)
		rec.Set("minerals", kept)
		return e.Next()
	})
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.GET("/api/community/site", communitySiteHandler(app)).Bind(apis.RequireAuth("users"))
		return se.Next()
	})
	log.Printf("community site ledger registered")
}
