package main

import (
	"encoding/json"
	"os"
	"reflect"
	"testing"
	"time"
)

var siteNow = time.Date(2026, 11, 12, 10, 0, 0, 0, time.UTC)

func TestSiteRulesMatchSharedJSON(t *testing.T) {
	raw, err := os.ReadFile("../shared/community/site.json")
	if err != nil {
		t.Fatal(err)
	}
	var shared struct {
		Components []struct{ ID string } `json:"components"`
		Templates  map[string]struct {
			Name    string         `json:"name"`
			Targets map[string]int `json:"targets"`
		} `json:"templates"`
		DefaultTemplate string `json:"defaultTemplate"`
		Stages          []struct {
			At    float64 `json:"at"`
			Label string  `json:"label"`
		} `json:"stages"`
		PerRun            map[string]int `json:"perRun"`
		PerUserCap        map[string]int `json:"perUserCap"`
		StructureMinerals []string       `json:"structureMinerals"`
	}
	if err := json.Unmarshal(raw, &shared); err != nil {
		t.Fatal(err)
	}
	ids := []string{}
	for _, c := range shared.Components {
		ids = append(ids, c.ID)
	}
	if !reflect.DeepEqual(ids, siteLedger.Components) || shared.DefaultTemplate != siteLedger.DefaultTemplate ||
		!reflect.DeepEqual(shared.PerRun, siteLedger.PerRun) || !reflect.DeepEqual(shared.PerUserCap, siteLedger.PerUserCap) {
		t.Fatalf("site.go and shared/community/site.json disagree")
	}
	for key, tpl := range shared.Templates {
		if siteLedger.Templates[key].Name != tpl.Name || !reflect.DeepEqual(siteLedger.Templates[key].Targets, tpl.Targets) {
			t.Fatalf("template %s differs", key)
		}
	}
	for i, s := range shared.Stages {
		if siteLedger.Stages[i].At != s.At || siteLedger.Stages[i].Label != s.Label {
			t.Fatalf("stage %d differs", i)
		}
	}
	if len(shared.StructureMinerals) != len(siteLedger.StructureMinerals) {
		t.Fatalf("structure minerals differ")
	}
	for _, m := range shared.StructureMinerals {
		if !siteLedger.StructureMinerals[m] {
			t.Fatalf("structure mineral %s missing", m)
		}
	}
}

func TestSiteClampAllowedMineralsAndRunCeiling(t *testing.T) {
	p := siteProjectKey(siteNow)
	units, kept, err := clampContribution(siteLedger, p, "structure", map[string]float64{"aluminium": 2, "platinum": 50, "iron": 3.7}, 0, siteNow)
	if err != nil || units != 5 || kept["aluminium"] != 2 || kept["iron"] != 3 || kept["platinum"] != 0 {
		t.Fatalf("got %d %v %v", units, kept, err)
	}
	units, _, _ = clampContribution(siteLedger, p, "structure", map[string]float64{"iron": 500}, 0, siteNow)
	if units != siteLedger.PerRun["structure"] {
		t.Fatalf("per-run ceiling not applied: %d", units)
	}
	// Non-mining components carry a fixed credit, whatever the client sends.
	units, _, _ = clampContribution(siteLedger, p, "systems", map[string]float64{"iron": 999}, 0, siteNow)
	if units != siteLedger.PerRun["systems"] {
		t.Fatalf("systems credit %d", units)
	}
	if _, _, err := clampContribution(siteLedger, p, "treasury", nil, 0, siteNow); err != errSiteComponent {
		t.Fatalf("unknown component accepted")
	}
}

func TestSiteClampPerUserCap(t *testing.T) {
	p := siteProjectKey(siteNow)
	units, _, _ := clampContribution(siteLedger, p, "systems", nil, siteLedger.PerUserCap["systems"]-4, siteNow)
	if units != 4 {
		t.Fatalf("cap remainder %d", units)
	}
	units, _, err := clampContribution(siteLedger, p, "systems", nil, siteLedger.PerUserCap["systems"], siteNow)
	if err != nil || units != 0 {
		t.Fatalf("capped player still credited %d %v", units, err)
	}
}

func TestSiteEventWindow(t *testing.T) {
	if _, _, err := clampContribution(siteLedger, "community-site-2026-09", "data", nil, 0, siteNow); err != errSiteWindow {
		t.Fatalf("an old project accepted a row")
	}
	// An offline save from the last day of October still lands on 1 Nov.
	firstNov := time.Date(2026, 11, 1, 20, 0, 0, 0, time.UTC)
	if _, _, err := clampContribution(siteLedger, "community-site-2026-10", "data", nil, 0, firstNov); err != nil {
		t.Fatalf("grace not applied: %v", err)
	}
}

func TestSiteBarIsCappedAndStaged(t *testing.T) {
	tpl := siteLedger.Templates["spaceport-launch-site"].Targets
	// Over-filling structure does not move the bar past its share.
	over := siteFill(tpl, map[string]int{"structure": 99999})
	exact := siteFill(tpl, map[string]int{"structure": tpl["structure"]})
	if over != exact {
		t.Fatalf("over-fill moved the bar: %v vs %v", over, exact)
	}
	all := map[string]int{}
	for id, target := range tpl {
		all[id] = target
	}
	v := buildSiteView(siteLedger, "p", "spaceport-launch-site", all, map[string]int{"data": 5}, false)
	if v.Fill != 1 || v.Stage != "Complete" || v.MineTotal != 5 {
		t.Fatalf("view %+v", v)
	}
	if buildSiteView(siteLedger, "p", "nope", nil, nil, true).Stage != "Planning" {
		t.Fatalf("empty project stage")
	}
}
