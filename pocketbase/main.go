package main

import (
	"log"
	"math"
	"os"
	"slices"
	"strings"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/types"

	// Registers compiled app migrations (core.AppMigrations) via each file's
	// own init(). KES-149: these only ever actually run via `migrate up`,
	// which fly.toml's release_command now invokes on every deploy — they do
	// NOT run automatically just because this package is imported, and they
	// do NOT run on a plain `serve` boot.
	_ "landnam-backend/migrations"
	"landnam-backend/sharedauth"
)

func main() {
	app := pocketbase.New()

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
	})

	sharedPBURL := os.Getenv("SHARED_PB_URL")
	if sharedPBURL == "" {
		sharedPBURL = "http://localhost:8090"
		log.Print("warning: SHARED_PB_URL is empty; defaulting to http://localhost:8090 for local dev")
	}
	sharedAuth := sharedauth.New(sharedPBURL)

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		ensureCollections(app)
		seedCatalog(app)
		registerGuestStateArchival(app)
		return se.Next()
	})

	registerLandnamAuthExchange(app, sharedAuth)
	registerFriendsRoutes(app)

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
		users.Fields.Add(&core.DateField{Name: "lastExchangeAt"})
		users.Fields.Add(&core.BoolField{Name: "guest"})
		// KES-83: player-chosen handle used for friend search/display. Not
		// unique-constrained at the field level — friends.go enforces
		// uniqueness itself (case-insensitive) before writing, since two
		// players racing the same name is a 409 we want to word ourselves.
		users.Fields.Add(&core.TextField{Name: "username", Max: 24})
		if err := app.Save(users); err != nil {
			log.Printf("failed to save users collection: %v", err)
		}
	} else {
		migrateUsers(app)
	}

	// game_states
	if _, err := app.FindCollectionByNameOrId("game_states"); err != nil {
		// Fresh install: create with open text-field schema from the start.
		gameStates := core.NewBaseCollection("game_states")
		gameStates.ListRule = types.Pointer("user = @request.auth.id")
		gameStates.ViewRule = types.Pointer("user = @request.auth.id")
		gameStates.CreateRule = types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		gameStates.UpdateRule = types.Pointer("user = @request.auth.id")
		gameStates.DeleteRule = types.Pointer("user = @request.auth.id")
		gameStates.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		gameStates.Fields.Add(&core.JSONField{Name: "state", Required: true, MaxSize: 200000})
		gameStates.Fields.Add(&core.NumberField{Name: "missions_done", Required: false})
		// Without these, a save that gets silently overwritten (e.g. STS-576,
		// where a failed reset let the persist effect re-write default state
		// over a live record) leaves no evidence of when it happened — the
		// record just looks like it was always empty.
		gameStates.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		gameStates.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
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

	// clients
	if _, err := app.FindCollectionByNameOrId("clients"); err != nil {
		col := core.NewBaseCollection("clients")
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
		col.Fields.Add(&core.BoolField{Name: "supplies_crew"})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_clients_slug ON clients (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save clients: %v", err)
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
		col.Fields.Add(&core.TextField{Name: "client_slug", Required: true, Max: 40})
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

	// onboarding_feedback — removed; surveys are handled by PostHog
	if col, err := app.FindCollectionByNameOrId("onboarding_feedback"); err == nil {
		if err := app.Delete(col); err != nil {
			log.Printf("failed to drop onboarding_feedback: %v", err)
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
		col.Fields.Add(&core.TextField{Name: "client_role", Max: 40})
		col.Fields.Add(&core.TextField{Name: "payout_formula", Max: 300})
		col.Fields.Add(&core.BoolField{Name: "scan_required"})
		col.Fields.Add(&core.NumberField{Name: "scan_count"})
		col.Fields.Add(&core.SelectField{Name: "scan_source", MaxSelect: 1, Values: []string{"station", "satellite", "rover"}})
		col.Fields.Add(&core.NumberField{Name: "deposits_to_map"})
		col.Fields.Add(&core.BoolField{Name: "reveals_minerals"})
		col.Fields.Add(&core.JSONField{Name: "reveals_landmarks", MaxSize: 1000})
		col.Fields.Add(&core.BoolField{Name: "unlocks_landing"})
		col.Fields.Add(&core.SelectField{Name: "on_world_vehicle", MaxSelect: 1, Values: []string{"starter-rover"}})
		col.Fields.Add(&core.BoolField{Name: "on_world_any_target"})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_mission_templates_slug ON mission_templates (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save mission_templates: %v", err)
		}
	}

	// skill_nodes
	if _, err := app.FindCollectionByNameOrId("skill_nodes"); err != nil {
		col := core.NewBaseCollection("skill_nodes")
		col.ListRule = emptyStr
		col.ViewRule = emptyStr
		col.Fields.Add(&core.TextField{Name: "slug", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "name", Required: true, Max: 120})
		col.Fields.Add(&core.SelectField{
			Name: "branch", Required: true, MaxSelect: 1,
			Values: []string{"mining", "cargo", "range"},
		})
		col.Fields.Add(&core.NumberField{Name: "cost", Required: true})
		col.Fields.Add(&core.TextField{Name: "description", Max: 300})
		col.Fields.Add(&core.TextField{Name: "effect_key", Required: true, Max: 80})
		col.Fields.Add(&core.NumberField{Name: "effect_value"})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_skill_nodes_slug ON skill_nodes (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save skill_nodes: %v", err)
		}
	}

	// structure_blueprints
	if _, err := app.FindCollectionByNameOrId("structure_blueprints"); err != nil {
		col := core.NewBaseCollection("structure_blueprints")
		col.ListRule = emptyStr
		col.ViewRule = emptyStr
		col.Fields.Add(&core.TextField{Name: "slug", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "name", Required: true, Max: 120})
		col.Fields.Add(&core.TextField{Name: "kind", Required: true, Max: 40})
		col.Fields.Add(&core.NumberField{Name: "cost_francs"})
		col.Fields.Add(&core.JSONField{Name: "cost_materials", MaxSize: 1000})
		col.Fields.Add(&core.SelectField{
			Name: "unlock_trigger_type", MaxSelect: 1,
			Values: []string{"always", "client-mission-trigger", "academy-research", "deep-space-telescope-unlock", "manual"},
		})
		col.Fields.Add(&core.TextField{Name: "unlocks_at", Max: 200})
		col.Fields.Add(&core.TextField{Name: "description", Max: 400})
		// Maps this canonical structure to the takeon StructureType used to
		// render/simulate it in a mining/exploration voxel scene (a launchpad
		// is one structure with two perspectives, not two structures — see
		// "Structures & worldbuilding in Landnam", Craft). Empty for
		// structures with no voxel-scene presence.
		col.Fields.Add(&core.TextField{Name: "takeon_type", Max: 40})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_structure_blueprints_slug ON structure_blueprints (slug)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save structure_blueprints: %v", err)
		}
	} else {
		migrateStructureBlueprints(app)
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

	// mission_log — append-only completed-mission log; one row per mission finished
	if _, err := app.FindCollectionByNameOrId("mission_log"); err != nil {
		missionLog := core.NewBaseCollection("mission_log")
		// Append-only, write-only from the client (see useGameLoop.ts — only
		// `.create()` is ever called). No client read path exists, so list/view/
		// update/delete are superuser-only (nil), while create is scoped to the
		// authenticated owner.
		missionLog.ListRule = nil
		missionLog.ViewRule = nil
		missionLog.CreateRule = types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		missionLog.UpdateRule = nil
		missionLog.DeleteRule = nil
		missionLog.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		missionLog.Fields.Add(&core.TextField{Name: "mission_id", Required: true, Max: 100})
		missionLog.Fields.Add(&core.TextField{Name: "target_id", Required: false, Max: 100})
		missionLog.Fields.Add(&core.NumberField{Name: "payout_francs", Required: false})
		missionLog.Fields.Add(&core.JSONField{Name: "minerals_delivered", Required: false, MaxSize: 4096})
		missionLog.Fields.Add(&core.NumberField{Name: "missions_done_after", Required: false})
		// Plain (non-autodate) field, client-settable — mirrors mission_runs'
		// completed_at. Distinct from the record's own `created` autodate:
		// `created` is always "when this row was written", which is fine for
		// real play (missions are logged as they finish) but can't be
		// backdated for seeded/dev data. completed_at can be, so seed tooling
		// (scripts/seed-dev-presets.ts) can give synthetic mission history
		// plausible historical dates instead of a burst of same-instant rows.
		missionLog.Fields.Add(&core.DateField{Name: "completed_at", Required: false})
		missionLog.Indexes = []string{
			"CREATE INDEX idx_mission_log_user ON mission_log (user)",
		}
		if err := app.Save(missionLog); err != nil {
			log.Printf("failed to save mission_log: %v", err)
		}
	} else {
		migrateMissionLog(app)
	}

	// mission_runs — mutable lifecycle record for the current mission. The
	// completed mission_log remains the append-only analytics/history stream;
	// this record is what lets the client resume an in-flight run after a
	// refresh or return to Earth Base.
	if _, err := app.FindCollectionByNameOrId("mission_runs"); err != nil {
		runs := core.NewBaseCollection("mission_runs")
		runs.ListRule = types.Pointer("user = @request.auth.id")
		runs.ViewRule = types.Pointer("user = @request.auth.id")
		runs.CreateRule = types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		runs.UpdateRule = types.Pointer("user = @request.auth.id")
		runs.DeleteRule = types.Pointer("user = @request.auth.id")
		runs.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		runs.Fields.Add(&core.TextField{Name: "mission_id", Required: true, Max: 100})
		runs.Fields.Add(&core.TextField{Name: "target_id", Required: true, Max: 100})
		runs.Fields.Add(&core.TextField{Name: "status", Required: true, Max: 30})
		runs.Fields.Add(&core.TextField{Name: "phase", Required: true, Max: 30})
		runs.Fields.Add(&core.JSONField{Name: "cargo", MaxSize: 4096})
		runs.Fields.Add(&core.NumberField{Name: "payout_francs"})
		runs.Fields.Add(&core.DateField{Name: "launched_at"})
		runs.Fields.Add(&core.DateField{Name: "completed_at"})
		runs.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		runs.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		runs.Indexes = []string{"CREATE INDEX idx_mission_runs_user_status ON mission_runs (user, status)"}
		if err := app.Save(runs); err != nil {
			log.Printf("failed to save mission_runs: %v", err)
		}
	}

	// friendships — undirected relationship between two players, stored as a
	// directed (requester -> addressee) row so a pending request has an
	// obvious owner. All reads/writes to this collection go through
	// friends.go's custom routes (which run as the server, bypassing these
	// rules) rather than the raw Records API, so the rules below only need to
	// cover the client's own read of its own relationships — never a raw
	// client-side create/update, which would let a player self-accept.
	if _, err := app.FindCollectionByNameOrId("friendships"); err != nil {
		friendships := core.NewBaseCollection("friendships")
		friendships.ListRule = types.Pointer("requester = @request.auth.id || addressee = @request.auth.id")
		friendships.ViewRule = types.Pointer("requester = @request.auth.id || addressee = @request.auth.id")
		friendships.CreateRule = nil
		friendships.UpdateRule = nil
		friendships.DeleteRule = nil
		friendships.Fields.Add(&core.TextField{Name: "requester", Required: true, Max: 64})
		friendships.Fields.Add(&core.TextField{Name: "addressee", Required: true, Max: 64})
		friendships.Fields.Add(&core.SelectField{Name: "status", Required: true, MaxSelect: 1, Values: []string{"pending", "accepted", "declined"}})
		friendships.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		friendships.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		friendships.Indexes = []string{
			"CREATE UNIQUE INDEX idx_friendships_pair ON friendships (requester, addressee)",
		}
		if err := app.Save(friendships); err != nil {
			log.Printf("failed to save friendships: %v", err)
		}
	}

	// friend_gifts — one row per gift send. Creation/claiming is
	// server-mediated only (friends.go enforces the friendship check and the
	// one-gift-per-friend-per-AEST-day limit); the client never writes this
	// collection directly.
	if _, err := app.FindCollectionByNameOrId("friend_gifts"); err != nil {
		gifts := core.NewBaseCollection("friend_gifts")
		gifts.ListRule = types.Pointer("sender = @request.auth.id || recipient = @request.auth.id")
		gifts.ViewRule = types.Pointer("sender = @request.auth.id || recipient = @request.auth.id")
		gifts.CreateRule = nil
		gifts.UpdateRule = nil
		gifts.DeleteRule = nil
		gifts.Fields.Add(&core.TextField{Name: "sender", Required: true, Max: 64})
		gifts.Fields.Add(&core.TextField{Name: "recipient", Required: true, Max: 64})
		// AEST (Australia/Sydney) calendar date the gift was sent on, as
		// "YYYY-MM-DD" — the key the daily-limit check dedupes against. Not a
		// UTC day: 00:01 AEST is mid-afternoon UTC the day before, so a plain
		// UTC-date comparison would reset the limit at the wrong wall-clock
		// moment for the AEST-anchored reset this feature was specified with.
		gifts.Fields.Add(&core.TextField{Name: "gift_date", Required: true, Max: 10})
		gifts.Fields.Add(&core.SelectField{Name: "kind", Required: true, MaxSelect: 1, Values: []string{"currency", "resource", "blueprint"}})
		gifts.Fields.Add(&core.JSONField{Name: "payload", Required: true, MaxSize: 2048})
		gifts.Fields.Add(&core.BoolField{Name: "claimed"})
		gifts.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		gifts.Indexes = []string{
			"CREATE UNIQUE INDEX idx_friend_gifts_daily ON friend_gifts (sender, recipient, gift_date)",
		}
		if err := app.Save(gifts); err != nil {
			log.Printf("failed to save friend_gifts: %v", err)
		}
	}

	// voxel_worlds — one row per (user, target): the bulk takeon MissionState
	// for that target (sparse voxel edits, rover snapshot, photos). Mirrors
	// game_states' per-user JSON-blob pattern, but keyed per target since a
	// player has one voxel world per mining/exploration target, not one
	// global world. See the parent-workspace voxel-world decision for rationale.
	if _, err := app.FindCollectionByNameOrId("voxel_worlds"); err != nil {
		col := core.NewBaseCollection("voxel_worlds")
		col.ListRule = types.Pointer("user = @request.auth.id")
		col.ViewRule = types.Pointer("user = @request.auth.id")
		col.CreateRule = types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		col.UpdateRule = types.Pointer("user = @request.auth.id")
		col.DeleteRule = types.Pointer("user = @request.auth.id")
		col.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "target_id", Required: true, Max: 80})
		col.Fields.Add(&core.NumberField{Name: "seed"})
		col.Fields.Add(&core.NumberField{Name: "schema_version"})
		col.Fields.Add(&core.TextField{Name: "status", Max: 20})
		col.Fields.Add(&core.TextField{Name: "body_id", Max: 80})
		col.Fields.Add(&core.TextField{Name: "rover_name", Max: 80})
		col.Fields.Add(&core.NumberField{Name: "time"})
		// Sparse voxel edit deltas ("x,y,z" -> material), takeon's own delta
		// save model — not a per-chunk table. Chunking is a client-side
		// render cache (takeon's chunk-cached isometric renderer), not a
		// storage concern, so there's no separate chunks collection.
		col.Fields.Add(&core.JSONField{Name: "edits", MaxSize: 2000000})
		col.Fields.Add(&core.JSONField{Name: "rover", MaxSize: 20000})
		col.Fields.Add(&core.JSONField{Name: "anomalies", MaxSize: 200000})
		col.Fields.Add(&core.JSONField{Name: "photos", MaxSize: 200000})
		col.Fields.Add(&core.JSONField{Name: "weather", MaxSize: 20000})
		col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		col.Indexes = []string{
			"CREATE UNIQUE INDEX idx_voxel_worlds_user_target ON voxel_worlds (user, target_id)",
		}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save voxel_worlds: %v", err)
		}
	} else {
		migrateVoxelWorlds(app)
	}

	// structures — one row per placed structure instance, split out from
	// voxel_worlds so placed structures are queryable/listable (e.g. "all
	// structures across my targets", contractor/notification hooks) without
	// deserialising the whole world blob. blueprint_slug always references
	// structure_blueprints.slug (the canonical structure) — a launchpad is
	// one structure with two perspectives, not two catalogs. When rendering
	// a structure inside a voxel scene, resolve
	// structure_blueprints[blueprint_slug].takeon_type to get the takeon
	// StructureType to instantiate.
	if _, err := app.FindCollectionByNameOrId("structures"); err != nil {
		col := core.NewBaseCollection("structures")
		col.ListRule = types.Pointer("user = @request.auth.id")
		col.ViewRule = types.Pointer("user = @request.auth.id")
		col.CreateRule = types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		col.UpdateRule = types.Pointer("user = @request.auth.id")
		col.DeleteRule = types.Pointer("user = @request.auth.id")
		col.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "target_id", Required: true, Max: 80})
		col.Fields.Add(&core.TextField{Name: "structure_id", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "blueprint_slug", Required: true, Max: 40})
		col.Fields.Add(&core.SelectField{
			Name: "category", MaxSelect: 1,
			Values: []string{"functional", "decorative"},
		})
		col.Fields.Add(&core.NumberField{Name: "pos_x", Required: true})
		col.Fields.Add(&core.NumberField{Name: "pos_y", Required: true})
		col.Fields.Add(&core.NumberField{Name: "facing"}) // 0-3, iso-space SE/SW/NW/NE per takeon's convention
		col.Fields.Add(&core.JSONField{Name: "buffer", MaxSize: 2000})
		col.Fields.Add(&core.NumberField{Name: "cooldown_until"})
		col.Fields.Add(&core.NumberField{Name: "progress"})
		col.Indexes = []string{
			"CREATE UNIQUE INDEX idx_structures_user_target_structure ON structures (user, target_id, structure_id)",
			"CREATE INDEX idx_structures_user_target ON structures (user, target_id)",
		}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save structures: %v", err)
		}
	}

	ensureCatalogFields(app)
}

// migrateUsers adds lastExchangeAt/guest fields (2026-07-15, for admin-UI
// visibility into who's playing — see workspace ticket
// landnam-auth-reliability-visibility-2026-07-15) to an existing users
// collection, and backfills guest for any rows created before the field
// existed so historical guest accounts aren't misclassified as full
// accounts. Safe to call on every startup.
func migrateUsers(app core.App) {
	col, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return
	}

	changed := false
	backfillGuest := col.Fields.GetByName("guest") == nil

	if col.Fields.GetByName("lastExchangeAt") == nil {
		col.Fields.Add(&core.DateField{Name: "lastExchangeAt"})
		changed = true
	}
	if backfillGuest {
		col.Fields.Add(&core.BoolField{Name: "guest"})
		changed = true
	}
	if col.Fields.GetByName("username") == nil {
		col.Fields.Add(&core.TextField{Name: "username", Max: 24})
		changed = true
	}

	if changed {
		if err := app.Save(col); err != nil {
			log.Printf("migrateUsers: failed to save: %v", err)
			return
		}
		log.Printf("migrateUsers: updated users schema")
	}

	if !backfillGuest {
		return
	}

	guests, err := app.FindRecordsByFilter(
		col.Id,
		"email ~ {:suffix}",
		"",
		0,
		0,
		map[string]any{"suffix": guestEmailSuffix},
	)
	if err != nil {
		log.Printf("migrateUsers: guest backfill query failed: %v", err)
		return
	}
	for _, rec := range guests {
		if !strings.HasSuffix(rec.GetString("email"), guestEmailSuffix) {
			continue
		}
		rec.Set("guest", true)
		if err := app.Save(rec); err != nil {
			log.Printf("migrateUsers: failed to backfill guest flag for %s: %v", rec.Id, err)
		}
	}
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

	// Ownership rules — the client now authenticates via the landnam-auth
	// token exchange (see landnam_auth.go), so @request.auth.id is populated
	// with the same id already stored in each record's "user" field.
	const ownerRule = "user = @request.auth.id"
	const createRule = "@request.auth.id != \"\" && user = @request.auth.id"
	if col.ListRule == nil || *col.ListRule != ownerRule {
		col.ListRule = types.Pointer(ownerRule)
		changed = true
	}
	if col.ViewRule == nil || *col.ViewRule != ownerRule {
		col.ViewRule = types.Pointer(ownerRule)
		changed = true
	}
	if col.CreateRule == nil || *col.CreateRule != createRule {
		col.CreateRule = types.Pointer(createRule)
		changed = true
	}
	if col.UpdateRule == nil || *col.UpdateRule != ownerRule {
		col.UpdateRule = types.Pointer(ownerRule)
		changed = true
	}
	if col.DeleteRule == nil || *col.DeleteRule != ownerRule {
		col.DeleteRule = types.Pointer(ownerRule)
		changed = true
	}

	// Add missions_done column if missing (for analytics queries without JSON parsing).
	if col.Fields.GetByName("missions_done") == nil {
		col.Fields.Add(&core.NumberField{Name: "missions_done", Required: false})
		changed = true
	}

	// This collection shipped without created/updated, so a clobbered save had
	// no timestamp at all — diagnosing STS-576 meant inferring the timeline
	// from guest-account creation dates instead of reading it off the record.
	// Backfills as empty for existing rows; populated from the next write on.
	if col.Fields.GetByName("created") == nil {
		col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		changed = true
	}
	if col.Fields.GetByName("updated") == nil {
		col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
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

// migrateMissionLog upgrades an existing mission_log collection from its
// previous fully-open rules to append-only-from-client rules: create is
// scoped to the authenticated owner, list/view/update/delete are
// superuser-only (nil) since the client never reads this collection back
// (see useGameLoop.ts — only `.create()` is ever called against it).
func migrateMissionLog(app core.App) {
	col, err := app.FindCollectionByNameOrId("mission_log")
	if err != nil {
		return
	}

	changed := false
	const createRule = "@request.auth.id != \"\" && user = @request.auth.id"

	if col.ListRule != nil {
		col.ListRule = nil
		changed = true
	}
	if col.ViewRule != nil {
		col.ViewRule = nil
		changed = true
	}
	if col.CreateRule == nil || *col.CreateRule != createRule {
		col.CreateRule = types.Pointer(createRule)
		changed = true
	}
	if col.UpdateRule != nil {
		col.UpdateRule = nil
		changed = true
	}
	if col.DeleteRule != nil {
		col.DeleteRule = nil
		changed = true
	}
	if col.Fields.GetByName("completed_at") == nil {
		col.Fields.Add(&core.DateField{Name: "completed_at", Required: false})
		changed = true
	}

	if changed {
		if err := app.Save(col); err != nil {
			log.Printf("migrateMissionLog: failed to save: %v", err)
		} else {
			log.Printf("migrateMissionLog: updated mission_log schema")
		}
	}
}

// migrateStructureBlueprints backfills the takeon_type field onto an
// existing structure_blueprints collection (added after initial launch).
func migrateStructureBlueprints(app core.App) {
	col, err := app.FindCollectionByNameOrId("structure_blueprints")
	if err != nil {
		return
	}
	changed := false
	if col.Fields.GetByName("takeon_type") == nil {
		col.Fields.Add(&core.TextField{Name: "takeon_type", Max: 40})
		changed = true
	}
	// academy-research and deep-space-telescope-unlock were added after the
	// initial three-value enum shipped; existing collections need this
	// backfilled or seeding astronaut-academy/deep-space-telescope blueprints
	// fails validation on every restart.
	if triggerField, ok := col.Fields.GetByName("unlock_trigger_type").(*core.SelectField); ok {
		want := []string{"always", "client-mission-trigger", "academy-research", "deep-space-telescope-unlock", "manual"}
		if !slices.Equal(triggerField.Values, want) {
			triggerField.Values = want
			changed = true
		}
	}
	if !changed {
		return
	}
	if err := app.Save(col); err != nil {
		log.Printf("migrateStructureBlueprints: failed to save: %v", err)
	} else {
		log.Printf("migrateStructureBlueprints: migrated fields")
	}
}

// migrateVoxelWorlds adds the remaining MissionState fields required by the
// LandnamSync adapter. Older rows keep loading because Takeon tolerates
// absent optional state and the adapter supplies safe defaults.
func migrateVoxelWorlds(app core.App) {
	col, err := app.FindCollectionByNameOrId("voxel_worlds")
	if err != nil {
		return
	}

	changed := false
	addText := func(name string, max int) {
		if col.Fields.GetByName(name) == nil {
			col.Fields.Add(&core.TextField{Name: name, Max: max})
			changed = true
		}
	}
	addNumber := func(name string) {
		if col.Fields.GetByName(name) == nil {
			col.Fields.Add(&core.NumberField{Name: name})
			changed = true
		}
	}
	addJSON := func(name string, maxSize int64) {
		if col.Fields.GetByName(name) == nil {
			col.Fields.Add(&core.JSONField{Name: name, MaxSize: maxSize})
			changed = true
		}
	}

	addText("body_id", 80)
	addText("rover_name", 80)
	addNumber("time")
	addJSON("anomalies", 200000)
	addJSON("weather", 20000)
	if col.Fields.GetByName("created") == nil {
		col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		changed = true
	}
	if col.Fields.GetByName("updated") == nil {
		col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		changed = true
	}

	if !changed {
		return
	}
	if err := app.Save(col); err != nil {
		log.Printf("migrateVoxelWorlds: failed to save: %v", err)
	} else {
		log.Printf("migrateVoxelWorlds: updated voxel_worlds schema")
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

	clients, err := app.FindCollectionByNameOrId("clients")
	if err == nil {
		addTextIfMissing(clients, "project_type", false)
		addJSONIfMissing(clients, "mineral_preferences", false)
		addTextIfMissing(clients, "payout_notes", false)
		addTextIfMissing(clients, "affinity_notes", false)
		addTextIfMissing(clients, "ui_role", false)
		addBoolIfMissing(clients, "supplies_crew", false)
		if err := app.Save(clients); err != nil {
			log.Printf("failed to update clients schema: %v", err)
		}
	}

	missionsCatalog, err := app.FindCollectionByNameOrId("missions_catalog")
	if err == nil {
		addTextIfMissing(missionsCatalog, "target_id", false)
		addSelectIfMissing(missionsCatalog, "payload_type", []string{"rover"}, false)
		addTextIfMissing(missionsCatalog, "payload_name", false)
		addNumberIfMissing(missionsCatalog, "payload_cargo_cost", false)
		hadLegacyContractorSlug := missionsCatalog.Fields.GetByName("contractor_slug") != nil
		addTextIfMissing(missionsCatalog, "client_slug", false)
		if err := app.Save(missionsCatalog); err != nil {
			log.Printf("failed to update missions_catalog schema: %v", err)
		}
		// Pre-STS-632 collections were created under the retired "contractor"
		// naming (see "Terminology: clients, not contractors" in CLAUDE.md).
		// client_slug landed as a new empty field on those, so every mission
		// record silently lost its client, which made toMission() read
		// mission.client as undefined and isOwnProgramMission() misclassify
		// ordinary client contracts as the player's own program. Backfill
		// client_slug from the legacy column once; never overwrite existing
		// client_slug data.
		if hadLegacyContractorSlug {
			records, err := app.FindRecordsByFilter("missions_catalog", "client_slug = '' && contractor_slug != ''", "", 0, 0)
			if err != nil {
				log.Printf("failed to query legacy contractor_slug records: %v", err)
			}
			for _, rec := range records {
				rec.Set("client_slug", rec.GetString("contractor_slug"))
				if err := app.Save(rec); err != nil {
					log.Printf("failed to backfill client_slug for %s: %v", rec.GetString("slug"), err)
				}
			}
		}
	}

	missionTemplates, err := app.FindCollectionByNameOrId("mission_templates")
	if err == nil {
		addBoolIfMissing(missionTemplates, "scan_required", false)
		addNumberIfMissing(missionTemplates, "scan_count", false)
		addSelectIfMissing(missionTemplates, "scan_source", []string{"station", "satellite", "rover"}, false)
		addNumberIfMissing(missionTemplates, "deposits_to_map", false)
		addBoolIfMissing(missionTemplates, "reveals_minerals", false)
		addJSONIfMissing(missionTemplates, "reveals_landmarks", false)
		addBoolIfMissing(missionTemplates, "unlocks_landing", false)
		addSelectIfMissing(missionTemplates, "on_world_vehicle", []string{"starter-rover"}, false)
		addBoolIfMissing(missionTemplates, "on_world_any_target", false)
		if err := app.Save(missionTemplates); err != nil {
			log.Printf("failed to update mission_templates schema: %v", err)
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

func addBoolIfMissing(collection *core.Collection, name string, required bool) {
	if collection.Fields.GetByName(name) == nil {
		collection.Fields.Add(&core.BoolField{Name: name, Required: required})
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

// Landnam economy scale. These MUST stay in step with web/lib/data/economy.ts —
// seedRecord upserts on every start, so whatever is here overwrites the catalog
// the game reads. See that file's header for why the scale is what it is.
const (
	mineralValueCommon   = 250_000
	mineralValueUncommon = 420_000
	mineralValueRare     = 700_000
	mineralValueExotic   = 1_100_000

	structurePriceRefinery = 8_000_000

	cargoBonusRate = 0.4
	cargoBonusCap  = 0.18
)

// contractFee is the base service fee for a mission at the given sequence,
// mirroring CONTRACT_FEES / missionPayoutFloor in economy.ts + payouts.ts.
func contractFee(sequence float64) float64 {
	switch {
	case sequence <= 1:
		return 15_000_000
	case sequence == 2:
		return 18_000_000
	case sequence == 3:
		return 22_000_000
	default:
		return 24_000_000 + (sequence-4)*2_500_000
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
		{"iron", mineral{"Iron", "Fe", "#d97150", "common", "starter bulk", "Structural frames, smelting feedstock", mineralValueCommon, 1}},
		{"silicon", mineral{"Silicon", "Si", "#b9d8ff", "common", "electronics bulk", "Electronics, solar panels", mineralValueCommon, 1}},
		{"carbon", mineral{"Carbon", "C", "#6a7280", "common", "construction blend", "Composites, fuel", mineralValueCommon, 1}},
		{"ice", mineral{"Ice", "H2O", "#9becff", "uncommon", "volatile supply", "Propellant, life support", mineralValueUncommon, 1}},
		{"nickel", mineral{"Nickel", "Ni", "#b0b8c4", "uncommon", "alloy demand", "Alloys, battery production", mineralValueUncommon, 1}},
		{"cobalt", mineral{"Cobalt", "Co", "#4f9cf7", "uncommon", "battery demand", "Battery cathodes, superalloys", mineralValueUncommon, 2}},
		{"copper", mineral{"Copper", "Cu", "#c9824b", "common", "conductive supply", "Conductors, heat exchangers, wiring", mineralValueCommon, 1}},
		{"aluminium", mineral{"Aluminium", "Al", "#c7d0dc", "common", "light structural supply", "Lightweight frames, tanks, trusses", mineralValueCommon, 1}},
		{"hydrogen", mineral{"Hydrogen", "H", "#9becff", "uncommon", "propellant logistics", "Propellant, reactor feedstock", mineralValueUncommon, 1}},
		{"uranium", mineral{"Uranium", "U", "#8fd16a", "rare", "compact power supply", "Compact power systems, shielding", mineralValueRare, 2}},
		{"gold", mineral{"Gold", "Au", "#ffd166", "rare", "premium assay", "Circuitry, radiation shielding", mineralValueRare, 2}},
		{"rare", mineral{"Xenon", "Xe", "#c084ff", "exotic", "advanced propellant", "Quantum sensors, ion propellant", mineralValueExotic, 3}},
		// Platinum-group ores. The early-game mission templates in
		// web/lib/data/mission-generator.ts have referenced these by key since
		// the M1-M3 rework, but they were never added here — so a catalog
		// served from PocketBase dropped them and those contracts had no ore
		// to price against.
		{"platinum", mineral{"Platinum", "Pt", "#e8e4d8", "rare", "catalytic supply", "Catalytic nozzle coatings, fuel cells", mineralValueRare, 1}},
		{"palladium", mineral{"Palladium", "Pd", "#d4cce8", "rare", "fuel cell demand", "Hydrogen fuel cells, electronics", mineralValueRare, 1}},
		{"iridium", mineral{"Iridium", "Ir", "#b8b4cc", "rare", "high-temp alloy demand", "High-temp alloys, ignition components", mineralValueRare, 2}},
		{"rhodium", mineral{"Rhodium", "Rh", "#f0e8d4", "exotic", "thruster lining supply", "Thruster lining, radiation-hard optics", mineralValueExotic, 2}},
	}
	for _, m := range minerals {
		seedRecord(app, "minerals", m.slug, map[string]any{
			"name": m.name, "sym": m.sym, "color": m.color, "base_price": m.price,
			"rarity": m.rarity, "demand_role": m.demandRole,
			"construction_use": m.constructionUse, "laser_access": m.laserAccess,
		})
	}

	// Clients
	type client struct {
		name, color, initial, projectType, payoutNotes, affinityNotes, uiRole string
		tier                                                                  float64
		preferences                                                           []string
		suppliesCrew                                                          bool
	}
	clients := []struct {
		slug string
		client
	}{
		{"helios-propulsion-depot", client{"Helios Propulsion Depot", "#f5a623", "HP", "fuel logistics and orbital propellant reserves", "20% premium on hydrogen and propellant runs", "+2.5% payout per completed Helios job", "starter", 1, []string{"hydrogen"}, false}},
		{"arcturus-battery-systems", client{"Arcturus Battery Systems", "#4f9cf7", "AB", "energy storage manufacturing and cathode supply", "22% premium on cobalt and copper battery inputs", "+2.5% payout per completed Arcturus job", "prospect", 1, []string{"cobalt", "copper"}, false}},
		{"ferrum-orbital-construction", client{"Ferrum Orbital Construction", "#c7d0dc", "FO", "in-space manufacturing and structural assembly", "18% premium on aluminium and copper construction cargo", "+2% payout per completed Ferrum job", "bulk", 1, []string{"aluminium", "copper"}, true}},
		{"contractor-04b", client{"Client Slot 04B", "#a8d8ea", "4B", "construction aggregates", "Low rate, large orders", "+6 per delivery", "bulk", 4, []string{"iron", "carbon"}, false}},
		{"contractor-06a", client{"Client Slot 06A", "#70e070", "6A", "deep-core sampling", "Mixed-bag premium", "+12 per delivery", "prospect", 6, []string{"nickel", "cobalt"}, false}},
		{"contractor-06b", client{"Client Slot 06B", "#c084ff", "6B", "rare-gas refining", "High tier, small batches", "+20 per delivery", "command", 6, []string{"rare", "gold"}, true}},
		{"contractor-08a", client{"Client Slot 08A", "#ff8c42", "8A", "solar-grade silicon", "Premium purity contracts", "+10 per delivery", "command", 8, []string{"silicon", "ice"}, true}},
		{"contractor-08b", client{"Client Slot 08B", "#5fcde6", "8B", "outer-belt volatiles", "Medium rate, special cargo", "+8 per delivery", "bulk", 8, []string{"ice", "carbon"}, false}},
		{"contractor-10a", client{"Client Slot 10A", "#f5a623", "10A", "strategic minerals", "High payout, rare minerals", "+25 per delivery", "science", 10, []string{"gold", "rare", "cobalt"}, true}},
		{"contractor-10b", client{"Client Slot 10B", "#39d36a", "10B", "base expansion reserves", "Balanced late-game contracts", "+12 per delivery", "starter", 10, []string{"iron", "silicon", "nickel"}, true}},
	}
	for _, c := range clients {
		seedRecord(app, "clients", c.slug, map[string]any{
			"name": c.name, "color": c.color, "initial": c.initial, "unlock_tier": c.tier,
			"project_type": c.projectType, "mineral_preferences": c.preferences,
			"payout_notes": c.payoutNotes, "affinity_notes": c.affinityNotes,
			"ui_role":       c.uiRole,
			"supplies_crew": c.suppliesCrew,
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
		// Kept in sync by hand with web/lib/data/targets.ts + target-archetypes.ts
		// (composition-archetype-derived minerals) — see the 2026-07-14
		// prod-patches-target-mineral-mismatch ticket. This Go seed is a
		// separate copy from that TS data; the live PocketBase `locations`
		// collection is what the deployed app actually reads (falling back to
		// the TS static array only when this backend is unreachable), so any
		// future change to target-archetypes.ts's mineral pools must be
		// mirrored here too, or production silently drifts from local again.
		{"mercury", location{"Mercury", "planet", "L2", "Scorched inner planet, rich in iron and trace silicates.", 1, []string{"iron", "silicon", "aluminium", "nickel"}, false}},
		{"mars", location{"Mars", "planet", "L1", "Iron-rich rusty plains, well-mapped, starter-friendly.", 4, []string{"iron", "silicon", "aluminium", "nickel", "platinum", "uranium"}, true}},
		{"jupiter", location{"Jupiter", "planet", "L3", "Gas giant moons, ice and silicate rich, high gravity penalty.", 6, []string{"ice", "silicon", "hydrogen", "uranium", "rare"}, false}},
		{"eros", location{"433 Eros", "asteroid", "L1", "Elongated near-Earth rock with dense iron-nickel core. First commercial prospect on file.", 2, []string{"iron", "silicon", "aluminium", "nickel", "platinum"}, true}},
		{"bennu", location{"101955 Bennu", "asteroid", "L1", "Carbon-rich near-Earth asteroid. Loose rubble pile, low gravity, easy approach.", 2, []string{"carbon", "ice", "hydrogen", "palladium"}, false}},
		{"itokawa", location{"25143 Itokawa", "asteroid", "L1", "Stony near-Earth rubble pile with accessible nickel-iron traces.", 2, []string{"iron", "silicon", "aluminium", "nickel", "platinum"}, false}},
		{"ryugu", location{"162173 Ryugu", "asteroid", "L1", "Carbonaceous near-Earth asteroid with hydrated minerals and dark regolith.", 3, []string{"carbon", "ice", "hydrogen", "palladium"}, false}},
		{"vesta", location{"4 Vesta", "asteroid", "L1", "Differentiated protoplanet. Basaltic crust over a heavy iron mantle.", 3, []string{"iron", "silicon", "aluminium", "nickel", "platinum"}, false}},
		{"psyche", location{"16 Psyche", "asteroid", "L2", "Exposed metallic core of an ancient body. Extremely high iron and nickel grades — the richest known prospecting site on file.", 4, []string{"iron", "nickel", "cobalt", "copper", "gold", "platinum", "palladium", "rhodium", "iridium", "rare"}, false}},
		{"ceres", location{"1 Ceres", "asteroid", "L2", "Dwarf planet at the belt's inner edge. Ice-rich mantle beneath a carbon-dark crust.", 5, []string{"carbon", "ice", "hydrogen", "palladium", "iridium", "rhodium"}, false}},
		{"lutetia", location{"21 Lutetia", "asteroid", "L2", "A large carbonaceous asteroid in the outer belt. Hydrated minerals under a dark regolith crust.", 6, []string{"carbon", "ice", "hydrogen", "palladium", "iridium", "rhodium"}, false}},
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
		{"hull-mk2", part{"Prospector Unibody Frame", "chassis", "/parts/reinforced_hull_t2.png", 2, false, 3, 10, 0, 0, 0}},
		{"hull-cargo", part{"Cargo Bay T1", "chassis", "/parts/cargo_bay_t1.png", 1, false, 2, 14, 0, 0, 0}},
		{"ion-a1", part{"Ion Drive A1", "propulsion", "/parts/basic_thruster_t1.png", 1, false, 0, 0, 40, 5, 0}},
		{"fusion-b2", part{"Fusion Drive B2", "propulsion", "/parts/fusion_drive_t2.png", 2, false, 0, 0, 80, 7, 0}},
		{"ion-a3", part{"Ion Drive A3", "propulsion", "/parts/ion_drive_t3.png", 3, true, 0, 0, 120, 9, 0}},
		{"hand-drill", part{"Hand Drill", "drill", "/parts/mining_drill_t1.png", 1, false, 0, 0, 0, 0, 1}},
		{"laser-t2", part{"Laser T2", "drill", "/parts/mining_drill_t1.png", 2, false, 0, 0, 0, 0, 2}},
		{"plasma-t3", part{"Plasma T3", "drill", "/parts/mining_drill_t1.png", 3, true, 0, 0, 0, 0, 4}},
		{"cargo-module-t1", part{"Cargo Module T1", "drill", "/parts/cargo_bay_t1.png", 1, false, 0, 0, 0, 0, 0}},
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
		tag, difficulty, clientRole, payoutFormula string
		mineralKeys                                []string
		cargoMin, cargoMax, drillTier, orbitMax    float64
		payoutMultiplier                           float64
		scanRequired, revealsMinerals              bool
		scanCount, depositsToMap                   float64
		scanSource, onWorldVehicle                 string
		revealsLandmarks                           []string
		unlocksLanding, onWorldAnyTarget           bool
	}
	templates := []struct {
		slug string
		missionTemplate
	}{
		{"starter-bulk", missionTemplate{tag: "STARTER", difficulty: "L1", clientRole: "starter", payoutFormula: "contract fee + cargo value bonus", mineralKeys: []string{"iron", "silicon", "carbon"}, cargoMin: 4, cargoMax: 8, drillTier: 1, orbitMax: 4, payoutMultiplier: 1.0}},
		{"volatile-bulk", missionTemplate{tag: "BULK", difficulty: "L2", clientRole: "bulk", payoutFormula: "contract fee + cargo value bonus", mineralKeys: []string{"ice", "carbon", "silicon"}, cargoMin: 8, cargoMax: 14, drillTier: 1, orbitMax: 5, payoutMultiplier: 1.35}},
		{"metal-prospect", missionTemplate{tag: "PROSPECT", difficulty: "L2", clientRole: "prospect", payoutFormula: "contract fee + cargo value bonus", mineralKeys: []string{"nickel", "cobalt", "gold"}, cargoMin: 3, cargoMax: 8, drillTier: 2, orbitMax: 5, payoutMultiplier: 2.25}},
		{"command-reserve", missionTemplate{tag: "COMMAND", difficulty: "L3", clientRole: "command", payoutFormula: "contract fee + cargo value bonus", mineralKeys: []string{"gold", "rare", "cobalt"}, cargoMin: 3, cargoMax: 6, drillTier: 2, orbitMax: 6, payoutMultiplier: 3.5}},
		{"freeops-delivery", missionTemplate{tag: "DELIVERY", difficulty: "L1", clientRole: "starter", payoutFormula: "contract fee + cargo value bonus", mineralKeys: []string{"hydrogen", "cobalt", "copper", "aluminium"}, cargoMin: 4, cargoMax: 10, drillTier: 1, orbitMax: 5, payoutMultiplier: 1.25}},
		{"freeops-mining-survey", missionTemplate{tag: "SURVEY", difficulty: "L1", clientRole: "prospect", payoutFormula: "contract fee + cargo value bonus", mineralKeys: []string{"cobalt", "copper", "aluminium", "gold"}, cargoMin: 3, cargoMax: 7, drillTier: 1, orbitMax: 5, payoutMultiplier: 1.55}},
		{"freeops-bulk-run", missionTemplate{tag: "BULK", difficulty: "L1", clientRole: "bulk", payoutFormula: "contract fee + cargo value bonus", mineralKeys: []string{"hydrogen", "aluminium", "copper"}, cargoMin: 8, cargoMax: 16, drillTier: 1, orbitMax: 5, payoutMultiplier: 1.15}},
		{"freeops-station-scan", missionTemplate{tag: "SCAN", difficulty: "L1", clientRole: "prospect", payoutFormula: "scan fee + mapped deposit bonus", mineralKeys: []string{"cobalt", "copper", "aluminium", "gold"}, cargoMin: 0, cargoMax: 0, drillTier: 1, orbitMax: 5, payoutMultiplier: 0.85, scanRequired: true, scanCount: 3, scanSource: "station", depositsToMap: 2, revealsMinerals: true, revealsLandmarks: []string{"crater field", "high-albedo ridge"}, unlocksLanding: true}},
		{"freeops-rover-landing", missionTemplate{tag: "ROVER", difficulty: "L1", clientRole: "starter", payoutFormula: "mineral_base_price * amount * 1500 * multiplier + landing bonus", mineralKeys: []string{"cobalt", "copper", "aluminium", "hydrogen"}, cargoMin: 2, cargoMax: 5, drillTier: 1, orbitMax: 5, payoutMultiplier: 1.7, scanRequired: true, scanCount: 1, scanSource: "rover", depositsToMap: 1, revealsMinerals: true, revealsLandmarks: []string{"surface deposit"}, unlocksLanding: true, onWorldVehicle: "starter-rover", onWorldAnyTarget: true}},
	}
	for _, t := range templates {
		fields := map[string]any{
			"tag": t.tag, "difficulty": t.difficulty,
			"mineral_keys": t.mineralKeys,
			"cargo_min":    t.cargoMin, "cargo_max": t.cargoMax,
			"drill_tier_min": t.drillTier, "orbit_max": t.orbitMax,
			"payout_multiplier":   t.payoutMultiplier,
			"client_role":         t.clientRole,
			"payout_formula":      t.payoutFormula,
			"scan_required":       t.scanRequired,
			"scan_count":          t.scanCount,
			"deposits_to_map":     t.depositsToMap,
			"reveals_minerals":    t.revealsMinerals,
			"reveals_landmarks":   t.revealsLandmarks,
			"unlocks_landing":     t.unlocksLanding,
			"on_world_any_target": t.onWorldAnyTarget,
		}
		if t.scanSource != "" {
			fields["scan_source"] = t.scanSource
		}
		if t.onWorldVehicle != "" {
			fields["on_world_vehicle"] = t.onWorldVehicle
		}
		seedRecord(app, "mission_templates", t.slug, fields)
	}

	type skillNode struct {
		name, branch, description, effectKey string
		cost, effectValue                    float64
	}
	skillNodes := []struct {
		slug string
		skillNode
	}{
		{"laser-charge-1", skillNode{"Laser Charge I", "mining", "Mining laser starts each mission with +2 charges.", "laser_charge_cap_bonus", 1, 2}},
		{"cargo-slot-1", skillNode{"Cargo Slot I", "cargo", "Cargo capacity is increased by 20%.", "cargo_capacity_multiplier", 1, 1.2}},
		{"near-range-1", skillNode{"Near-Range I", "range", "L1 travel time is reduced by 15% and near-range reach improves.", "near_range_efficiency", 2, 0.85}},
	}
	for _, s := range skillNodes {
		seedRecord(app, "skill_nodes", s.slug, map[string]any{
			"name": s.name, "branch": s.branch, "cost": s.cost,
			"description": s.description, "effect_key": s.effectKey,
			"effect_value": s.effectValue,
		})
	}

	type structureBlueprint struct {
		name, kind, unlockTrigger, unlocksAt, description, takeonType string
		cost                                                          float64
		materials                                                     map[string]float64
	}
	// A structure is one game object with (up to) two perspectives: its hub
	// view and — for structures that exist inside a mining/exploration
	// target scene — its takeon voxel-scene rendering. takeonType maps to
	// that scene's StructureType; it's not a second catalog entry. See
	// "Structures & worldbuilding in Landnam" (Craft): "clicking on the
	// launchpad will open a view... 2D & 3D perspectives."
	//
	// Costs below are real product decisions only for launchpad/refinery
	// (pre-existing). The eight new entries (solar-array through pylon) are
	// takeon's mining-outpost structures with no Landnam economy pass done
	// yet — cost_francs 0 is a placeholder, not a design decision.
	structures := []struct {
		slug string
		structureBlueprint
	}{
		{"launchpad", structureBlueprint{"Launchpad", "launchpad", "always", "always", "Rocket assembly and launch operations.", "launch-pad", 0, map[string]float64{}}},
		{"refinery", structureBlueprint{"Refinery", "refinery", "client-mission-trigger", "First client mission requiring refined minerals", "Refines raw minerals into higher-value client-grade materials.", "refinery", structurePriceRefinery, map[string]float64{"aluminium": 20, "copper": 10}}},
		{"astronaut-academy", structureBlueprint{"Astronaut Academy", "astronaut-academy", "academy-research", "Affinity level 2 with two clients, then research", "Trains named astronauts and coordinates Earth Base staffing.", "astronaut-academy", 12000000, map[string]float64{"aluminium": 24, "silicon": 12, "copper": 8}}},
		{"solar-array", structureBlueprint{"Solar Array", "solar-array", "manual", "", "Fixed panel farm. Recharges a rover quickly within range (daylight only).", "solar-array", 0, map[string]float64{}}},
		{"beacon", structureBlueprint{"Nav Beacon", "beacon", "manual", "", "Marks a site on the map and lights the area at night.", "beacon", 0, map[string]float64{}}},
		{"drill-rig", structureBlueprint{"Auto-Drill Rig", "drill-rig", "manual", "", "Slowly mines the column beneath it; buffers ore for pickup.", "drill-rig", 0, map[string]float64{}}},
		{"cache", structureBlueprint{"Supply Cache", "cache", "manual", "", "Deposit cargo here to bank it as mission yield and free up the hold.", "cache", 0, map[string]float64{}}},
		{"habitat-frame", structureBlueprint{"Habitat Frame", "habitat-frame", "manual", "", "The first bones of a permanent outpost. Completes into a habitat once powered.", "habitat-frame", 0, map[string]float64{}}},
		{"habitat", structureBlueprint{"Habitat", "habitat", "manual", "Completed by upgrading a habitat-frame — not placed directly", "A finished pressurised outpost. Recharges and slowly repairs a rover parked alongside it.", "habitat", 0, map[string]float64{}}},
		{"generator", structureBlueprint{"Generator", "generator", "manual", "", "Radioisotope plant. Powers nearby structures day and night.", "generator", 0, map[string]float64{}}},
		{"pylon", structureBlueprint{"Power Pylon", "pylon", "manual", "", "Relays power onward, extending the grid to distant drills and pads.", "pylon", 0, map[string]float64{}}},
	}
	for _, s := range structures {
		seedRecord(app, "structure_blueprints", s.slug, map[string]any{
			"name": s.name, "kind": s.kind, "cost_francs": s.cost,
			"cost_materials":      s.materials,
			"unlock_trigger_type": s.unlockTrigger,
			"unlocks_at":          s.unlocksAt,
			"description":         s.description,
			"takeon_type":         s.takeonType,
		})
	}

	mineralPrices := map[string]float64{}
	for _, m := range minerals {
		mineralPrices[m.slug] = m.price
	}

	type missionSeed struct {
		slug, title, brief, clientSlug, templateSlug, unlockAt string
		sequence, amount, affinity                             float64
		locked                                                 bool
		minerals                                               map[string]float64
	}
	missionSeeds := []missionSeed{
		{"m1-iron", "Iron Reserve Order", "Client Slot 03A needs a starter iron shipment from a reachable asteroid.", "contractor-03a", "starter-bulk", "", 1, 6, 10, false, map[string]float64{"iron": 6}},
		{"m2-silicon", "Silicon Bulk Order", "Client Slot 03B needs raw silicon for electronics-grade supply contracts.", "contractor-03b", "volatile-bulk", "Complete M1", 2, 8, 8, false, map[string]float64{"silicon": 8}},
	}
	templateBySlug := map[string]missionTemplate{}
	for _, t := range templates {
		templateBySlug[t.slug] = t.missionTemplate
	}
	for _, m := range missionSeeds {
		t := templateBySlug[m.templateSlug]
		// Fee plus a capped bonus for the cargo asked for — mirrors
		// normalizeMissionPayout in web/lib/data/payouts.ts. This previously
		// used a bare `* 1500` with no fee at all, which produced payouts
		// three orders of magnitude below what the game actually paid.
		fee := contractFee(m.sequence)
		bonus := 0.0
		for mineral, amount := range m.minerals {
			bonus += mineralPrices[mineral] * amount * cargoBonusRate * t.payoutMultiplier
		}
		payout := fee + math.Min(bonus, fee*cargoBonusCap)
		seedRecord(app, "missions_catalog", m.slug, map[string]any{
			"title": m.title, "brief": m.brief,
			"client_slug": m.clientSlug, "tag": t.tag,
			"difficulty": t.difficulty, "locked": m.locked,
			"sequence":           m.sequence,
			"unlock_at":          m.unlockAt,
			"requires_minerals":  m.minerals,
			"requires_cargo_min": m.amount, "requires_drill_tier": t.drillTier,
			"requires_max_orbit": t.orbitMax,
			"payout_francs":      payout, "payout_xp": payout / 10000,
			"payout_affinity": m.affinity,
		})
	}
}
