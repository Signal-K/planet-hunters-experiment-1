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
		return se.Next()
	})

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
		gameStates := core.NewBaseCollection("game_states")
		gameStates.ListRule = types.Pointer("user = @request.auth.id")
		gameStates.ViewRule = types.Pointer("user = @request.auth.id")
		gameStates.CreateRule = types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		gameStates.UpdateRule = types.Pointer("user = @request.auth.id")
		gameStates.DeleteRule = types.Pointer("user = @request.auth.id")
		gameStates.Fields.Add(&core.RelationField{
			Name: "user", Required: true, MaxSelect: 1,
			CollectionId: users.Id, CascadeDelete: true,
		})
		gameStates.Fields.Add(&core.JSONField{Name: "state", Required: true, MaxSize: 200000})
		gameStates.Indexes = []string{
			"CREATE UNIQUE INDEX idx_game_states_user ON game_states (user)",
		}
		if err := app.Save(gameStates); err != nil {
			log.Printf("failed to save game_states: %v", err)
		}
	}

	// classifications
	if _, err := app.FindCollectionByNameOrId("classifications"); err != nil {
		classifications := core.NewBaseCollection("classifications")
		classifications.ListRule = types.Pointer("user = @request.auth.id")
		classifications.ViewRule = types.Pointer("user = @request.auth.id")
		classifications.CreateRule = types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		classifications.UpdateRule = types.Pointer("user = @request.auth.id")
		classifications.DeleteRule = types.Pointer("user = @request.auth.id")
		classifications.Fields.Add(&core.RelationField{
			Name: "user", Required: true, MaxSelect: 1,
			CollectionId: users.Id, CascadeDelete: true,
		})
		classifications.Fields.Add(&core.TextField{Name: "candidate", Required: true, Max: 80})
		classifications.Fields.Add(&core.SelectField{
			Name: "verdict", Required: true, MaxSelect: 1,
			Values: []string{"planet", "not_planet"},
		})
		classifications.Indexes = []string{
			"CREATE INDEX idx_classifications_user_candidate ON classifications (user, candidate)",
		}
		if err := app.Save(classifications); err != nil {
			log.Printf("failed to save classifications: %v", err)
		}
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
		col.Fields.Add(&core.BoolField{Name: "requires_classification"})
		col.Fields.Add(&core.TextField{Name: "unlock_at", Max: 100})
		col.Fields.Add(&core.JSONField{Name: "requires_minerals", MaxSize: 1000})
		col.Fields.Add(&core.NumberField{Name: "requires_cargo_min"})
		col.Fields.Add(&core.NumberField{Name: "requires_drill_tier"})
		col.Fields.Add(&core.NumberField{Name: "requires_max_orbit"})
		col.Fields.Add(&core.NumberField{Name: "payout_francs"})
		col.Fields.Add(&core.NumberField{Name: "payout_xp"})
		col.Fields.Add(&core.NumberField{Name: "payout_affinity"})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_missions_catalog_slug ON missions_catalog (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save missions_catalog: %v", err)
		}
	}
}

func seedRecord(app core.App, collection string, slug string, fields map[string]any) {
	_, err := app.FindFirstRecordByData(collection, "slug", slug)
	if err == nil {
		return // already seeded
	}
	col, err := app.FindCollectionByNameOrId(collection)
	if err != nil {
		log.Printf("seedRecord: collection %q not found: %v", collection, err)
		return
	}
	rec := core.NewRecord(col)
	rec.Set("slug", slug)
	for k, v := range fields {
		rec.Set(k, v)
	}
	if err := app.Save(rec); err != nil {
		log.Printf("seedRecord: failed to save %s/%s: %v", collection, slug, err)
	}
}

func seedCatalog(app core.App) {
	// Minerals
	type mineral struct{ name, sym, color string; price float64 }
	minerals := []struct {
		slug string
		mineral
	}{
		{"iron", mineral{"Iron", "Fe", "#d97150", 120}},
		{"silicon", mineral{"Silicon", "Si", "#b9d8ff", 180}},
		{"ice", mineral{"Ice", "H2O", "#9becff", 90}},
		{"carbon", mineral{"Carbon", "C", "#6a7280", 60}},
		{"gold", mineral{"Gold", "Au", "#ffd166", 800}},
		{"rare", mineral{"Rare", "Xe", "#c084ff", 2000}},
	}
	for _, m := range minerals {
		seedRecord(app, "minerals", m.slug, map[string]any{
			"name": m.name, "sym": m.sym, "color": m.color, "base_price": m.price,
		})
	}

	// Contractors
	type contractor struct{ name, color, initial string; tier float64 }
	contractors := []struct {
		slug string
		contractor
	}{
		{"foundry3", contractor{"Foundry-3 Corp", "#d97150", "F3", 1}},
		{"cryos", contractor{"Cryos Mining", "#9becff", "CM", 1}},
		{"beltgold", contractor{"Belt Gold Ltd", "#ffd166", "BG", 3}},
	}
	for _, c := range contractors {
		seedRecord(app, "contractors", c.slug, map[string]any{
			"name": c.name, "color": c.color, "initial": c.initial, "unlock_tier": c.tier,
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
		{"vesta", location{"4 Vesta", "asteroid", "L1", "Differentiated protoplanet. Basaltic crust over a heavy iron mantle.", 3, []string{"iron", "silicon"}, false}},
		{"psyche", location{"16 Psyche", "asteroid", "L2", "Exposed metallic core of an ancient body. Extremely high iron and nickel grades.", 4, []string{"iron", "silicon", "gold"}, false}},
		{"belt", location{"Asteroid Belt", "asteroid", "L2", "Varied deposits — iron, silicon, gold, rare. The prospector's playground.", 5, []string{"iron", "silicon", "gold", "rare"}, true}},
		{"ceres", location{"1 Ceres", "asteroid", "L2", "Dwarf planet at the belt's inner edge. Ice-rich mantle beneath a silicate crust.", 5, []string{"ice", "silicon"}, false}},
		{"tess-451b", location{"TESS-451 b", "asteroid", "L3", "Transit candidate selected by the science team. Spectral returns indicate gold and rare compounds.", 5, []string{"gold", "rare"}, true}},
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
		name, partType, img string
		tier                float64
		locked              bool
		mass, cargo, power, maxOrbit, drillRate float64
	}
	parts := []struct {
		slug string
		part
	}{
		{"hull-mk1", part{"Hull MK1", "chassis", "/parts/basic_hull_t1.png", 1, false, 2, 6, 0, 0, 0}},
		{"hull-mk2", part{"Hull MK2", "chassis", "/parts/reinforced_hull_t2.png", 2, false, 3, 10, 0, 0, 0}},
		{"hull-cargo", part{"Cargo Bay T1", "chassis", "/parts/cargo_bay_t1.png", 1, false, 2, 14, 0, 0, 0}},
		{"ion-a1", part{"Ion Drive A1", "propulsion", "/parts/basic_thruster_t1.png", 1, false, 0, 0, 40, 5, 0}},
		{"fusion-b2", part{"Fusion Drive B2", "propulsion", "/parts/fusion_drive_t2.png", 2, false, 0, 0, 80, 7, 0}},
		{"ion-a3", part{"Ion Drive A3", "propulsion", "/parts/ion_drive_t3.png", 3, true, 0, 0, 120, 9, 0}},
		{"hand-drill", part{"Hand Drill", "drill", "/parts/mining_drill_t1.png", 1, false, 0, 0, 0, 0, 1}},
		{"laser-t2", part{"Laser T2", "drill", "/parts/mining_drill_t1.png", 2, false, 0, 0, 0, 0, 2}},
		{"plasma-t3", part{"Plasma T3", "drill", "/parts/mining_drill_t1.png", 3, true, 0, 0, 0, 0, 4}},
	}
	for _, p := range parts {
		fields := map[string]any{
			"name": p.name, "part_type": p.partType, "img": p.img,
			"tier": p.tier, "locked": p.locked,
		}
		if p.mass > 0 { fields["mass"] = p.mass }
		if p.cargo > 0 { fields["cargo_capacity"] = p.cargo }
		if p.power > 0 { fields["power"] = p.power }
		if p.maxOrbit > 0 { fields["max_orbit"] = p.maxOrbit }
		if p.drillRate > 0 { fields["drill_rate"] = p.drillRate }
		seedRecord(app, "rocket_parts", p.slug, fields)
	}

	// Missions catalog
	type mission struct {
		title, brief, contractorSlug, tag, difficulty, unlockAt string
		sequence, cargoMin, drillTier, maxOrbit                 float64
		locked, requiresClassification                           bool
		minerals                                                 map[string]float64
		payoutFrancs, payoutXP, payoutAffinity                  float64
	}
	missions := []struct {
		slug string
		mission
	}{
		{"m1-iron", mission{
			"Iron for Foundry-3",
			"Foundry-3 needs a fresh iron shipment to keep their smelters running. Belt region preferred.",
			"foundry3", "STARTER", "L1", "",
			1, 6, 1, 4, false, false,
			map[string]float64{"iron": 6},
			1200000, 120, 10,
		}},
		{"m2-silicon", mission{
			"Silicon Mass Order",
			"Cryos needs raw silicon for their electronics division. Any asteroid source accepted.",
			"cryos", "BULK", "L2", "Complete M1",
			2, 8, 1, 5, false, false,
			map[string]float64{"silicon": 8},
			1800000, 180, 8,
		}},
		{"m3-gold", mission{
			"Belt Gold Prospect",
			"Belt Gold Ltd runs a premium grade — they want gold ore from the outer belt.",
			"beltgold", "PROSPECT", "L3", "Complete M2",
			3, 4, 2, 6, true, true,
			map[string]float64{"gold": 4},
			4500000, 450, 15,
		}},
		{"m4-rare", mission{
			"Signal in the Dark",
			"A confirmed transit candidate needs a surface assay. Choose any reachable body and bring back rare material.",
			"cryos", "COMMAND", "L3", "Complete M3",
			4, 4, 2, 6, true, false,
			map[string]float64{"rare": 4},
			6200000, 620, 20,
		}},
	}
	for _, m := range missions {
		seedRecord(app, "missions_catalog", m.slug, map[string]any{
			"title": m.title, "brief": m.brief,
			"contractor_slug": m.contractorSlug, "tag": m.tag,
			"difficulty": m.difficulty, "locked": m.locked,
			"sequence": m.sequence, "requires_classification": m.requiresClassification,
			"unlock_at": m.unlockAt,
			"requires_minerals": m.minerals,
			"requires_cargo_min": m.cargoMin, "requires_drill_tier": m.drillTier,
			"requires_max_orbit": m.maxOrbit,
			"payout_francs": m.payoutFrancs, "payout_xp": m.payoutXP,
			"payout_affinity": m.payoutAffinity,
		})
	}
}
