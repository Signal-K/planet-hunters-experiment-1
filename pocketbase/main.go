package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/types"
)

func main() {
	app := pocketbase.New()

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		ensureCollections(app)
		seedCatalog(app)
		registerGuestAccountCleanup(app)
		return se.Next()
	})

	registerGuestSignupRateLimit(app)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func ensureCollections(app core.App) {
	// users (auth)
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		users = core.NewAuthCollection("users")
		users.Fields.Add(&core.TextField{Name: "displayName", Max: 80})
		if err := app.Save(users); err != nil {
			log.Printf("failed to save users collection: %v", err)
		}
	}

	// game_states
	if _, err := app.FindCollectionByNameOrId("game_states"); err != nil {
		// Fresh install: create with open text-field schema from the start.
		gameStates := core.NewBaseCollection("game_states")
		gameStates.ListRule = types.Pointer("")
		gameStates.ViewRule = types.Pointer("")
		gameStates.CreateRule = types.Pointer("")
		gameStates.UpdateRule = types.Pointer("")
		gameStates.DeleteRule = types.Pointer("")
		gameStates.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		gameStates.Fields.Add(&core.JSONField{Name: "state", Required: true, MaxSize: 200000})
		gameStates.Indexes = []string{
			"CREATE UNIQUE INDEX idx_game_states_user ON game_states (user)",
		}
		if err := app.Save(gameStates); err != nil {
			log.Printf("failed to save game_states: %v", err)
		}
	} else {
		migrateGameStates(app)
	}

	emptyStr := types.Pointer("")

	// minerals
	if _, err := app.FindCollectionByNameOrId("minerals"); err != nil {
		col := core.NewBaseCollection("minerals")
		col.ListRule = emptyStr
		col.ViewRule = emptyStr
		col.Fields.Add(&core.TextField{Name: "slug", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "name", Required: true, Max: 80})
		col.Fields.Add(&core.TextField{Name: "sym", Required: true, Max: 10})
		col.Fields.Add(&core.TextField{Name: "color", Required: true, Max: 20})
		col.Fields.Add(&core.NumberField{Name: "base_price", Required: true})
		col.Fields.Add(&core.SelectField{
			Name: "rarity", Required: true, MaxSelect: 1,
			Values: []string{"common", "uncommon", "rare", "exotic"},
		})
		col.Fields.Add(&core.TextField{Name: "demand_role", Max: 120})
		col.Fields.Add(&core.TextField{Name: "construction_use", Max: 200})
		col.Fields.Add(&core.NumberField{Name: "laser_access"})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_minerals_slug ON minerals (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save minerals: %v", err)
		}
	}

	// contractors
	if _, err := app.FindCollectionByNameOrId("contractors"); err != nil {
		col := core.NewBaseCollection("contractors")
		col.ListRule = emptyStr
		col.ViewRule = emptyStr
		col.Fields.Add(&core.TextField{Name: "slug", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "name", Required: true, Max: 120})
		col.Fields.Add(&core.TextField{Name: "color", Required: true, Max: 20})
		col.Fields.Add(&core.TextField{Name: "initial", Required: true, Max: 5})
		col.Fields.Add(&core.NumberField{Name: "unlock_tier"})
		col.Fields.Add(&core.TextField{Name: "project_type", Max: 160})
		col.Fields.Add(&core.JSONField{Name: "mineral_preferences", MaxSize: 1000})
		col.Fields.Add(&core.TextField{Name: "payout_notes", Max: 200})
		col.Fields.Add(&core.TextField{Name: "affinity_notes", Max: 200})
		col.Fields.Add(&core.TextField{Name: "ui_role", Max: 40})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_contractors_slug ON contractors (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save contractors: %v", err)
		}
	}

	// locations (mining targets)
	if _, err := app.FindCollectionByNameOrId("locations"); err != nil {
		col := core.NewBaseCollection("locations")
		col.ListRule = emptyStr
		col.ViewRule = emptyStr
		col.Fields.Add(&core.TextField{Name: "slug", Required: true, Max: 80})
		col.Fields.Add(&core.TextField{Name: "name", Required: true, Max: 120})
		col.Fields.Add(&core.SelectField{
			Name: "body_type", Required: true, MaxSelect: 1,
			Values: []string{"planet", "asteroid"},
		})
		col.Fields.Add(&core.NumberField{Name: "orbit", Required: true})
		col.Fields.Add(&core.TextField{Name: "difficulty", Required: true, Max: 10})
		col.Fields.Add(&core.TextField{Name: "brief", Max: 400})
		col.Fields.Add(&core.JSONField{Name: "minerals", MaxSize: 2000})
		col.Fields.Add(&core.BoolField{Name: "recommended"})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_locations_slug ON locations (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save locations: %v", err)
		}
	}

	// rocket_parts
	if _, err := app.FindCollectionByNameOrId("rocket_parts"); err != nil {
		col := core.NewBaseCollection("rocket_parts")
		col.ListRule = emptyStr
		col.ViewRule = emptyStr
		col.Fields.Add(&core.TextField{Name: "slug", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "name", Required: true, Max: 120})
		col.Fields.Add(&core.SelectField{
			Name: "part_type", Required: true, MaxSelect: 1,
			Values: []string{"chassis", "propulsion", "drill"},
		})
		col.Fields.Add(&core.NumberField{Name: "tier", Required: true})
		col.Fields.Add(&core.BoolField{Name: "locked"})
		col.Fields.Add(&core.TextField{Name: "img", Max: 200})
		col.Fields.Add(&core.NumberField{Name: "mass"})
		col.Fields.Add(&core.NumberField{Name: "cargo_capacity"})
		col.Fields.Add(&core.NumberField{Name: "power"})
		col.Fields.Add(&core.NumberField{Name: "max_orbit"})
		col.Fields.Add(&core.NumberField{Name: "drill_rate"})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_rocket_parts_slug ON rocket_parts (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save rocket_parts: %v", err)
		}
	}

	// missions_catalog
	if _, err := app.FindCollectionByNameOrId("missions_catalog"); err != nil {
		col := core.NewBaseCollection("missions_catalog")
		col.ListRule = emptyStr
		col.ViewRule = emptyStr
		col.Fields.Add(&core.TextField{Name: "slug", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "title", Required: true, Max: 200})
		col.Fields.Add(&core.TextField{Name: "brief", Max: 500})
		col.Fields.Add(&core.TextField{Name: "contractor_slug", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "tag", Max: 40})
		col.Fields.Add(&core.TextField{Name: "difficulty", Max: 10})
		col.Fields.Add(&core.BoolField{Name: "locked"})
		col.Fields.Add(&core.NumberField{Name: "sequence", Required: true})
		col.Fields.Add(&core.TextField{Name: "unlock_at", Max: 100})
		col.Fields.Add(&core.JSONField{Name: "requires_minerals", MaxSize: 1000})
		col.Fields.Add(&core.NumberField{Name: "requires_cargo_min"})
		col.Fields.Add(&core.NumberField{Name: "requires_drill_tier"})
		col.Fields.Add(&core.NumberField{Name: "requires_max_orbit"})
		col.Fields.Add(&core.NumberField{Name: "payout_francs"})
		col.Fields.Add(&core.NumberField{Name: "payout_xp"})
		col.Fields.Add(&core.NumberField{Name: "payout_affinity"})
		col.Fields.Add(&core.TextField{Name: "target_id", Max: 80})
		col.Fields.Add(&core.SelectField{Name: "payload_type", MaxSelect: 1, Values: []string{"rover"}})
		col.Fields.Add(&core.TextField{Name: "payload_name", Max: 120})
		col.Fields.Add(&core.NumberField{Name: "payload_cargo_cost"})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_missions_catalog_slug ON missions_catalog (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save missions_catalog: %v", err)
		}
	}

	// onboarding_feedback
	if _, err := app.FindCollectionByNameOrId("onboarding_feedback"); err != nil {
		col := core.NewBaseCollection("onboarding_feedback")
		col.ListRule = nil
		col.ViewRule = nil
		col.CreateRule = emptyStr
		col.UpdateRule = nil
		col.DeleteRule = nil
		col.Fields.Add(&core.TextField{Name: "user_id", Max: 64})
		col.Fields.Add(&core.SelectField{
			Name: "mission_id", Required: true, MaxSelect: 1,
			Values: []string{"m1", "m2", "m3", "end_of_content"},
		})
		col.Fields.Add(&core.NumberField{Name: "rating"})
		col.Fields.Add(&core.TextField{Name: "freetext", Max: 600})
		col.Fields.Add(&core.TextField{Name: "option_choice", Max: 200})
		col.Fields.Add(&core.BoolField{Name: "dismissed"})
		if err := app.Save(col); err != nil {
			log.Printf("failed to save onboarding_feedback: %v", err)
		}
	}

	// mission_templates
	if _, err := app.FindCollectionByNameOrId("mission_templates"); err != nil {
		col := core.NewBaseCollection("mission_templates")
		col.ListRule = emptyStr
		col.ViewRule = emptyStr
		col.Fields.Add(&core.TextField{Name: "slug", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "tag", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "difficulty", Required: true, Max: 10})
		col.Fields.Add(&core.JSONField{Name: "mineral_keys", MaxSize: 1000})
		col.Fields.Add(&core.NumberField{Name: "cargo_min"})
		col.Fields.Add(&core.NumberField{Name: "cargo_max"})
		col.Fields.Add(&core.NumberField{Name: "drill_tier_min"})
		col.Fields.Add(&core.NumberField{Name: "orbit_max"})
		col.Fields.Add(&core.NumberField{Name: "payout_multiplier"})
		col.Fields.Add(&core.TextField{Name: "contractor_role", Max: 40})
		col.Fields.Add(&core.TextField{Name: "payout_formula", Max: 300})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_mission_templates_slug ON mission_templates (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save mission_templates: %v", err)
		}
	}

	if _, err := app.FindCollectionByNameOrId("scheduled_notifications"); err != nil {
		col := core.NewBaseCollection("scheduled_notifications")
		col.ListRule = nil
		col.ViewRule = nil
		col.CreateRule = types.Pointer("")
		col.UpdateRule = types.Pointer("")
		col.DeleteRule = nil
		col.Fields.Add(&core.TextField{Name: "endpoint", Required: true, Max: 512})
		col.Fields.Add(&core.JSONField{Name: "keys", MaxSize: 512})
		col.Fields.Add(&core.NumberField{Name: "scheduled_for", Required: true})
		col.Fields.Add(&core.TextField{Name: "title", Required: true, Max: 120})
		col.Fields.Add(&core.TextField{Name: "body", Required: true, Max: 300})
		col.Fields.Add(&core.BoolField{Name: "sent"})
		col.Indexes = []string{"CREATE INDEX idx_scheduled_notifications_due ON scheduled_notifications (scheduled_for, sent)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save scheduled_notifications: %v", err)
		}
	}

	if _, err := app.FindCollectionByNameOrId("push_subscriptions"); err != nil {
		col := core.NewBaseCollection("push_subscriptions")
		col.ListRule = nil
		col.ViewRule = nil
		col.CreateRule = types.Pointer("")
		col.UpdateRule = nil
		col.DeleteRule = types.Pointer("")
		col.Fields.Add(&core.TextField{Name: "endpoint", Required: true, Max: 512})
		col.Fields.Add(&core.JSONField{Name: "keys", MaxSize: 512})
		col.Fields.Add(&core.TextField{Name: "user_id", Max: 64})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_push_subscriptions_endpoint ON push_subscriptions (endpoint)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save push_subscriptions: %v", err)
		}
	}

	ensureCatalogFields(app)
}

// migrateGameStates upgrades an existing game_states collection created with
// the old schema (RelationField + auth-gated rules) to the current schema
// (TextField for user, fully open rules). Safe to call on every startup —
// it checks the current field type before making any changes.
func migrateGameStates(app core.App) {
	col, err := app.FindCollectionByNameOrId("game_states")
	if err != nil {
		return
	}

	changed := false

	// If user field is still a relation, replace it with a plain text field.
	if f := col.Fields.GetByName("user"); f != nil && f.Type() == core.FieldTypeRelation {
		col.Fields.RemoveByName("user")
		col.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		changed = true
	}

	// Open up rules — the client identifies itself by userId string only.
	empty := ""
	if col.ListRule == nil || *col.ListRule != empty {
		col.ListRule = &empty
		changed = true
	}
	if col.ViewRule == nil || *col.ViewRule != empty {
		col.ViewRule = &empty
		changed = true
	}
	if col.CreateRule == nil || *col.CreateRule != empty {
		col.CreateRule = &empty
		changed = true
	}
	if col.UpdateRule == nil || *col.UpdateRule != empty {
		col.UpdateRule = &empty
		changed = true
	}
	if col.DeleteRule == nil || *col.DeleteRule != empty {
		col.DeleteRule = &empty
		changed = true
	}

	if changed {
		if err := app.Save(col); err != nil {
			log.Printf("migrateGameStates: failed to save: %v", err)
		} else {
			log.Printf("migrateGameStates: updated game_states schema")
		}
	}
}

func ensureCatalogFields(app core.App) {
	minerals, err := app.FindCollectionByNameOrId("minerals")
	if err == nil {
		addSelectIfMissing(minerals, "rarity", []string{"common", "uncommon", "rare", "exotic"}, false)
		addTextIfMissing(minerals, "demand_role", false)
		addTextIfMissing(minerals, "construction_use", false)
		addNumberIfMissing(minerals, "laser_access", false)
		if err := app.Save(minerals); err != nil {
			log.Printf("failed to update minerals schema: %v", err)
		}
	}

	contractors, err := app.FindCollectionByNameOrId("contractors")
	if err == nil {
		addTextIfMissing(contractors, "project_type", false)
		addJSONIfMissing(contractors, "mineral_preferences", false)
		addTextIfMissing(contractors, "payout_notes", false)
		addTextIfMissing(contractors, "affinity_notes", false)
		addTextIfMissing(contractors, "ui_role", false)
		if err := app.Save(contractors); err != nil {
			log.Printf("failed to update contractors schema: %v", err)
		}
	}

	missionsCatalog, err := app.FindCollectionByNameOrId("missions_catalog")
	if err == nil {
		addTextIfMissing(missionsCatalog, "target_id", false)
		addSelectIfMissing(missionsCatalog, "payload_type", []string{"rover"}, false)
		addTextIfMissing(missionsCatalog, "payload_name", false)
		addNumberIfMissing(missionsCatalog, "payload_cargo_cost", false)
		if err := app.Save(missionsCatalog); err != nil {
			log.Printf("failed to update missions_catalog schema: %v", err)
		}
	}
}

func addTextIfMissing(collection *core.Collection, name string, required bool) {
	if collection.Fields.GetByName(name) == nil {
		collection.Fields.Add(&core.TextField{Name: name, Required: required})
	}
}

func addNumberIfMissing(collection *core.Collection, name string, required bool) {
	if collection.Fields.GetByName(name) == nil {
		collection.Fields.Add(&core.NumberField{Name: name, Required: required})
	}
}

func addJSONIfMissing(collection *core.Collection, name string, required bool) {
	if collection.Fields.GetByName(name) == nil {
		collection.Fields.Add(&core.JSONField{Name: name, Required: required})
	}
}

func addSelectIfMissing(collection *core.Collection, name string, values []string, required bool) {
	if collection.Fields.GetByName(name) == nil {
		collection.Fields.Add(&core.SelectField{Name: name, Required: required, MaxSelect: 1, Values: values})
	}
}

func seedRecord(app core.App, collection string, slug string, fields map[string]any) {
	col, err := app.FindCollectionByNameOrId(collection)
	if err != nil {
		log.Printf("seedRecord: collection %q not found: %v", collection, err)
		return
	}
	rec, err := app.FindFirstRecordByData(collection, "slug", slug)
	if err != nil {
		rec = core.NewRecord(col)
		rec.Set("slug", slug)
	}
	for k, v := range fields {
		rec.Set(k, v)
	}
	if err := app.Save(rec); err != nil {
		log.Printf("seedRecord: failed to save %s/%s: %v", collection, slug, err)
	}
}

func seedCatalog(app core.App) {
	// Minerals
	type mineral struct {
		name, sym, color, rarity, demandRole, constructionUse string
		price, laserAccess                                    float64
	}
	minerals := []struct {
		slug string
		mineral
	}{
		{"iron", mineral{"Iron", "Fe", "#d97150", "common", "starter bulk", "Structural frames, smelting feedstock", 120, 1}},
		{"silicon", mineral{"Silicon", "Si", "#b9d8ff", "common", "electronics bulk", "Electronics, solar panels", 180, 1}},
		{"carbon", mineral{"Carbon", "C", "#6a7280", "common", "construction blend", "Composites, fuel", 60, 1}},
		{"ice", mineral{"Ice", "H2O", "#9becff", "uncommon", "volatile supply", "Propellant, life support", 90, 1}},
		{"nickel", mineral{"Nickel", "Ni", "#b0b8c4", "uncommon", "alloy demand", "Alloys, battery production", 150, 1}},
		{"cobalt", mineral{"Cobalt", "Co", "#4f9cf7", "uncommon", "battery demand", "Battery cathodes, superalloys", 450, 2}},
		{"gold", mineral{"Gold", "Au", "#ffd166", "rare", "premium assay", "Circuitry, radiation shielding", 800, 2}},
		{"rare", mineral{"Xenon", "Xe", "#c084ff", "exotic", "advanced propellant", "Quantum sensors, ion propellant", 2000, 3}},
	}
	for _, m := range minerals {
		seedRecord(app, "minerals", m.slug, map[string]any{
			"name": m.name, "sym": m.sym, "color": m.color, "base_price": m.price,
			"rarity": m.rarity, "demand_role": m.demandRole,
			"construction_use": m.constructionUse, "laser_access": m.laserAccess,
		})
	}

	// Contractors
	type contractor struct {
		name, color, initial, projectType, payoutNotes, affinityNotes, uiRole string
		tier                                                                  float64
		preferences                                                           []string
	}
	contractors := []struct {
		slug string
		contractor
	}{
		{"contractor-03a", contractor{"Contractor Slot 03A", "#d97150", "3A", "starter smelting throughput", "Low rate, steady volume", "+10 per delivery", "starter", 3, []string{"iron", "silicon"}}},
		{"contractor-03b", contractor{"Contractor Slot 03B", "#9becff", "3B", "volatile handling", "Medium pay, bulk orders", "+8 per delivery", "bulk", 3, []string{"ice", "carbon"}}},
		{"contractor-04a", contractor{"Contractor Slot 04A", "#ffd166", "4A", "precious-metal assay", "High pay, low volume", "+15 per delivery", "prospect", 4, []string{"gold", "nickel"}}},
		{"contractor-04b", contractor{"Contractor Slot 04B", "#a8d8ea", "4B", "construction aggregates", "Low rate, large orders", "+6 per delivery", "bulk", 4, []string{"iron", "carbon"}}},
		{"contractor-06a", contractor{"Contractor Slot 06A", "#70e070", "6A", "deep-core sampling", "Mixed-bag premium", "+12 per delivery", "prospect", 6, []string{"nickel", "cobalt"}}},
		{"contractor-06b", contractor{"Contractor Slot 06B", "#c084ff", "6B", "rare-gas refining", "High tier, small batches", "+20 per delivery", "command", 6, []string{"rare", "gold"}}},
		{"contractor-08a", contractor{"Contractor Slot 08A", "#ff8c42", "8A", "solar-grade silicon", "Premium purity contracts", "+10 per delivery", "command", 8, []string{"silicon", "ice"}}},
		{"contractor-08b", contractor{"Contractor Slot 08B", "#5fcde6", "8B", "outer-belt volatiles", "Medium rate, special cargo", "+8 per delivery", "bulk", 8, []string{"ice", "carbon"}}},
		{"contractor-10a", contractor{"Contractor Slot 10A", "#f5a623", "10A", "strategic minerals", "High payout, rare minerals", "+25 per delivery", "science", 10, []string{"gold", "rare", "cobalt"}}},
		{"contractor-10b", contractor{"Contractor Slot 10B", "#39d36a", "10B", "base expansion reserves", "Balanced late-game contracts", "+12 per delivery", "starter", 10, []string{"iron", "silicon", "nickel"}}},
	}
	for _, c := range contractors {
		seedRecord(app, "contractors", c.slug, map[string]any{
			"name": c.name, "color": c.color, "initial": c.initial, "unlock_tier": c.tier,
			"project_type": c.projectType, "mineral_preferences": c.preferences,
			"payout_notes": c.payoutNotes, "affinity_notes": c.affinityNotes,
			"ui_role": c.uiRole,
		})
	}

	// Locations
	type location struct {
		name, bodyType, difficulty, brief string
		orbit                             float64
		minerals                          []string
		recommended                       bool
	}
	locations := []struct {
		slug string
		location
	}{
		{"mercury", location{"Mercury", "planet", "L2", "Scorched inner planet, rich in iron and trace silicates.", 1, []string{"iron", "silicon"}, false}},
		{"mars", location{"Mars", "planet", "L1", "Iron-rich rusty plains, well-mapped, starter-friendly.", 4, []string{"iron", "silicon"}, true}},
		{"jupiter", location{"Jupiter", "planet", "L3", "Gas giant moons, ice and silicate rich, high gravity penalty.", 6, []string{"ice", "silicon"}, false}},
		{"eros", location{"433 Eros", "asteroid", "L1", "Elongated near-Earth rock with dense iron-nickel core. First commercial prospect on file.", 2, []string{"iron", "silicon"}, true}},
		{"bennu", location{"101955 Bennu", "asteroid", "L1", "Carbon-rich near-Earth asteroid. Loose rubble pile, low gravity, easy approach.", 2, []string{"iron", "carbon"}, false}},
		{"itokawa", location{"25143 Itokawa", "asteroid", "L1", "Stony near-Earth rubble pile with accessible nickel-iron traces.", 2, []string{"iron", "nickel"}, false}},
		{"ryugu", location{"162173 Ryugu", "asteroid", "L1", "Carbonaceous near-Earth asteroid with hydrated minerals and dark regolith.", 3, []string{"carbon", "ice"}, false}},
		{"vesta", location{"4 Vesta", "asteroid", "L1", "Differentiated protoplanet. Basaltic crust over a heavy iron mantle.", 3, []string{"iron", "silicon"}, false}},
		{"psyche", location{"16 Psyche", "asteroid", "L2", "Exposed metallic core of an ancient body. Extremely high iron and nickel grades.", 4, []string{"iron", "nickel", "gold"}, false}},
		{"belt", location{"Asteroid Belt", "asteroid", "L2", "Varied deposits: iron, silicon, nickel, cobalt, gold, and xenon pockets. The prospector's playground.", 5, []string{"iron", "silicon", "nickel", "cobalt", "gold", "rare"}, true}},
		{"ceres", location{"1 Ceres", "asteroid", "L2", "Dwarf planet at the belt's inner edge. Ice-rich mantle beneath a silicate crust.", 5, []string{"ice", "silicon"}, false}},
		{"lutetia", location{"21 Lutetia", "asteroid", "L2", "A large metallic asteroid in the outer belt. Dense nickel-cobalt deposits under a regolith crust.", 6, []string{"nickel", "cobalt"}, false}},
	}
	for _, l := range locations {
		seedRecord(app, "locations", l.slug, map[string]any{
			"name": l.name, "body_type": l.bodyType, "orbit": l.orbit,
			"difficulty": l.difficulty, "brief": l.brief,
			"minerals": l.minerals, "recommended": l.recommended,
		})
	}

	// Rocket parts
	type part struct {
		name, partType, img                     string
		tier                                    float64
		locked                                  bool
		mass, cargo, power, maxOrbit, drillRate float64
	}
	parts := []struct {
		slug string
		part
	}{
		{"hull-mk1", part{"Hull MK1", "chassis", "/parts/basic_hull_t1.png", 1, false, 2, 6, 0, 0, 0}},
		{"hull-mk2", part{"SR2 Unibody Frame", "chassis", "/parts/reinforced_hull_t2.png", 2, false, 3, 10, 0, 0, 0}},
		{"hull-cargo", part{"Cargo Bay T1", "chassis", "/parts/cargo_bay_t1.png", 1, false, 2, 14, 0, 0, 0}},
		{"ion-a1", part{"Ion Drive A1", "propulsion", "/parts/basic_thruster_t1.png", 1, false, 0, 0, 40, 5, 0}},
		{"fusion-b2", part{"Fusion Drive B2", "propulsion", "/parts/fusion_drive_t2.png", 2, false, 0, 0, 80, 7, 0}},
		{"ion-a3", part{"Ion Drive A3", "propulsion", "/parts/ion_drive_t3.png", 3, true, 0, 0, 120, 9, 0}},
		{"hand-drill", part{"Hand Drill", "drill", "/parts/mining_drill_t1.png", 1, false, 0, 0, 0, 0, 1}},
		{"laser-t2", part{"Laser T2", "drill", "/parts/mining_drill_t1.png", 2, false, 0, 0, 0, 0, 2}},
		{"plasma-t3", part{"Plasma T3", "drill", "/parts/mining_drill_t1.png", 3, true, 0, 0, 0, 0, 4}},
		{"cargo-module-t1", part{"Cargo Module T1", "drill", "/parts/drill-hand.png", 1, false, 0, 0, 0, 0, 0}},
	}
	for _, p := range parts {
		fields := map[string]any{
			"name": p.name, "part_type": p.partType, "img": p.img,
			"tier": p.tier, "locked": p.locked,
		}
		if p.mass > 0 {
			fields["mass"] = p.mass
		}
		if p.cargo > 0 {
			fields["cargo_capacity"] = p.cargo
		}
		if p.power > 0 {
			fields["power"] = p.power
		}
		if p.maxOrbit > 0 {
			fields["max_orbit"] = p.maxOrbit
		}
		if p.drillRate > 0 {
			fields["drill_rate"] = p.drillRate
		}
		seedRecord(app, "rocket_parts", p.slug, fields)
	}

	// Mission templates
	type missionTemplate struct {
		tag, difficulty, contractorRole, payoutFormula string
		mineralKeys                                    []string
		cargoMin, cargoMax, drillTier, orbitMax        float64
		payoutMultiplier                               float64
	}
	templates := []struct {
		slug string
		missionTemplate
	}{
		{"starter-bulk", missionTemplate{"STARTER", "L1", "starter", "mineral_base_price * amount * 1600 * multiplier", []string{"iron", "silicon", "carbon"}, 4, 8, 1, 4, 1.0}},
		{"volatile-bulk", missionTemplate{"BULK", "L2", "bulk", "mineral_base_price * amount * 1450 * multiplier", []string{"ice", "carbon", "silicon"}, 8, 14, 1, 5, 1.35}},
		{"metal-prospect", missionTemplate{"PROSPECT", "L2", "prospect", "mineral_base_price * amount * 1350 * multiplier", []string{"nickel", "cobalt", "gold"}, 3, 8, 2, 5, 2.25}},
		{"command-reserve", missionTemplate{"COMMAND", "L3", "command", "mineral_base_price * amount * 1300 * multiplier", []string{"gold", "rare", "cobalt"}, 3, 6, 2, 6, 3.5}},
	}
	for _, t := range templates {
		seedRecord(app, "mission_templates", t.slug, map[string]any{
			"tag": t.tag, "difficulty": t.difficulty,
			"mineral_keys": t.mineralKeys,
			"cargo_min":    t.cargoMin, "cargo_max": t.cargoMax,
			"drill_tier_min": t.drillTier, "orbit_max": t.orbitMax,
			"payout_multiplier": t.payoutMultiplier,
			"contractor_role":   t.contractorRole,
			"payout_formula":    t.payoutFormula,
		})
	}

	mineralPrices := map[string]float64{}
	for _, m := range minerals {
		mineralPrices[m.slug] = m.price
	}

	type missionSeed struct {
		slug, title, brief, contractorSlug, templateSlug, unlockAt string
		sequence, amount, affinity                                 float64
		locked                                                     bool
		minerals                                                   map[string]float64
	}
	missionSeeds := []missionSeed{
		{"m1-iron", "Iron Reserve Order", "Contractor Slot 03A needs a starter iron shipment from a reachable asteroid.", "contractor-03a", "starter-bulk", "", 1, 6, 10, false, map[string]float64{"iron": 6}},
		{"m2-silicon", "Silicon Bulk Order", "Contractor Slot 03B needs raw silicon for electronics-grade supply contracts.", "contractor-03b", "volatile-bulk", "Complete M1", 2, 8, 8, false, map[string]float64{"silicon": 8}},
	}
	templateBySlug := map[string]missionTemplate{}
	for _, t := range templates {
		templateBySlug[t.slug] = t.missionTemplate
	}
	for _, m := range missionSeeds {
		t := templateBySlug[m.templateSlug]
		payout := 0.0
		for mineral, amount := range m.minerals {
			payout += mineralPrices[mineral] * amount * 1500 * t.payoutMultiplier
		}
		seedRecord(app, "missions_catalog", m.slug, map[string]any{
			"title": m.title, "brief": m.brief,
			"contractor_slug": m.contractorSlug, "tag": t.tag,
			"difficulty": t.difficulty, "locked": m.locked,
			"sequence": m.sequence,
			"unlock_at":          m.unlockAt,
			"requires_minerals":  m.minerals,
			"requires_cargo_min": m.amount, "requires_drill_tier": t.drillTier,
			"requires_max_orbit": t.orbitMax,
			"payout_francs":      payout, "payout_xp": payout / 10000,
			"payout_affinity": m.affinity,
		})
	}
}
