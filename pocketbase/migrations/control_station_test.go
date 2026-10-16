package migrations

import "testing"

func state(player map[string]any) map[string]any { return map[string]any{"player": player} }

func TestGiveControlStation(t *testing.T) {
	first := func(int) int { return 0 }

	owner := state(map[string]any{
		"placed":                     []any{"launchpad", "market"},
		"placementPlots":             map[string]any{"launchpad": float64(0), "market": float64(1)},
		"transitSatelliteLaunchedAt": float64(1760000000000),
	})
	if !giveControlStation(owner, first) {
		t.Fatal("an instrument owner should get a station")
	}
	p := owner["player"].(map[string]any)
	if got := p["placementPlots"].(map[string]any)[controlStationID]; got != 3 {
		t.Fatalf("station should take plot 3 when free, got %v", got)
	}
	if giveControlStation(owner, first) {
		t.Fatal("a second run must change nothing")
	}

	none := state(map[string]any{"placed": []any{"launchpad"}})
	if giveControlStation(none, first) {
		t.Fatal("a player with no instrument must be left alone")
	}

	busy := state(map[string]any{
		"placed":                 []any{"launchpad", "a", "b", "c"},
		"placementPlots":         map[string]any{"launchpad": float64(0), "a": float64(1), "b": float64(3)},
		"saturnImagerLaunchedAt": float64(5),
	})
	if !giveControlStation(busy, first) {
		t.Fatal("expected a station")
	}
	if got := busy["player"].(map[string]any)["placementPlots"].(map[string]any)[controlStationID]; got != 2 {
		t.Fatalf("plot 3 is taken, so the only free slot (2) is used, got %v", got)
	}

	full := state(map[string]any{
		"placed":                  []any{"launchpad", "market", "surface-silo", "astronaut-academy"},
		"placementPlots":          map[string]any{"launchpad": float64(0), "market": float64(1), "surface-silo": float64(2), "astronaut-academy": float64(3)},
		"deepSpaceTelescopeBuilt": true,
	})
	if !giveControlStation(full, first) {
		t.Fatal("expected a station")
	}
	pf := full["player"].(map[string]any)
	plots := pf["placementPlots"].(map[string]any)
	if plots[controlStationID] != float64(3) {
		t.Fatalf("no free slot: the station takes the undrawn academy's slot, got %v", plots[controlStationID])
	}
	if _, has := plots["astronaut-academy"]; has {
		t.Fatal("the academy entry should give up its slot")
	}
	if len(pf["placed"].([]any)) != 5 {
		t.Fatal("the station should still be marked placed")
	}
}
