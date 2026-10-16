package migrations

import (
	"encoding/json"
	"log"
	"math/rand"

	"github.com/pocketbase/pocketbase/core"
)

// SSL-611: satellites and telescopes are run from a Control Station building, and none can be launched before one
// is built. Players who already own an instrument (a launched satellite or telescope, or a built ground telescope)
// get a station placed for them so their feeds stay reachable. A player with no instruments is left alone: they
// build one when they want it.
//
// The station stands on its home site on the base strip; the plot index only records the save slot. It takes plot 3
// (its site's slot) when free, else a random free slot of 0..3, else the slot of a kind the base does not draw.
// Idempotent: a save that already has one is skipped.
const controlStationID = "control-station"

// Kinds the base scene draws on their own site; every other kind only records a slot.
var drawnKinds = map[string]bool{"launchpad": true, "hangar": true, "garage": true, "market": true, "surface-silo": true}

var instrumentLaunchKeys = []string{"transitSatelliteLaunchedAt", "deepSpaceTelescopeLaunchedAt", "saturnImagerLaunchedAt"}

func ownsInstrument(player map[string]any, placed []any) bool {
	for _, key := range instrumentLaunchKeys {
		if n, ok := player[key].(float64); ok && n > 0 {
			return true
		}
	}
	if built, ok := player["deepSpaceTelescopeBuilt"].(bool); ok && built {
		return true
	}
	for _, kind := range placed {
		if kind == "ground-telescope" {
			return true
		}
	}
	return false
}

// giveControlStation adds a control station to a saved game's player when they own an instrument and have no
// station yet. `pick` chooses among n free slots. It reports whether the state changed.
func giveControlStation(state map[string]any, pick func(n int) int) bool {
	player, ok := state["player"].(map[string]any)
	if !ok {
		return false
	}
	placed, _ := player["placed"].([]any)
	for _, kind := range placed {
		if kind == controlStationID {
			return false
		}
	}
	if !ownsInstrument(player, placed) {
		return false
	}
	plots, _ := player["placementPlots"].(map[string]any)
	if plots == nil {
		plots = map[string]any{}
	}
	taken := map[int]bool{}
	for _, v := range plots {
		if n, ok := v.(float64); ok {
			taken[int(n)] = true
		}
	}
	var free []int
	for slot := 0; slot < 4; slot++ {
		if !taken[slot] {
			free = append(free, slot)
		}
	}
	player["placed"] = append(placed, controlStationID)
	switch {
	case !taken[3]:
		plots[controlStationID] = 3
	case len(free) > 0:
		plots[controlStationID] = free[pick(len(free))]
	default:
		// Every slot is held. Take one from a kind the base does not draw (an old academy or telescope entry):
		// without a plot it still counts as placed, but the station would otherwise stand invisible.
		for kind, v := range plots {
			if n, ok := v.(float64); ok && !drawnKinds[kind] {
				plots[controlStationID] = n
				delete(plots, kind)
				break
			}
		}
	}
	player["placementPlots"] = plots
	return true
}

func init() {
	core.AppMigrations.Register(func(txApp core.App) error {
		gameStates, err := txApp.FindCollectionByNameOrId("game_states")
		if err != nil {
			log.Printf("control_station_for_instrument_owners: game_states collection not found: %v", err)
			return nil
		}
		records, err := txApp.FindRecordsByFilter(gameStates.Id, "", "", 0, 0)
		if err != nil {
			log.Printf("control_station_for_instrument_owners: query failed: %v", err)
			return nil
		}
		given := 0
		for _, record := range records {
			var state map[string]any
			if err := json.Unmarshal([]byte(record.GetString("state")), &state); err != nil {
				continue
			}
			if !giveControlStation(state, rand.Intn) {
				continue
			}
			record.Set("state", state)
			if err := txApp.Save(record); err != nil {
				log.Printf("control_station_for_instrument_owners: failed to save %s: %v", record.Id, err)
				continue
			}
			given++
		}
		log.Printf("control_station_for_instrument_owners: placed a control station for %d player(s)", given)
		return nil
	}, func(txApp core.App) error {
		// Not reversible: a station a player may since have built or used is left in place.
		return nil
	})
}
