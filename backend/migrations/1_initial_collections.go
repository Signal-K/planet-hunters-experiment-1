package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		// --- contractors ---
		contractors := core.NewBaseCollection("contractors")

		contractors.Fields.Add(&core.TextField{
			Name:     "name",
			Required: true,
		})
		contractors.Fields.Add(&core.TextField{
			Name:     "commodity",
			Required: true,
		})
		contractors.Fields.Add(&core.NumberField{
			Name:     "price_per_unit",
			Required: true,
		})
		contractors.Fields.Add(&core.JSONField{
			Name: "contract_terms",
		})

		if err := app.Save(contractors); err != nil {
			return err
		}

		// --- locations ---
		locations := core.NewBaseCollection("locations")

		locations.Fields.Add(&core.TextField{
			Name:     "name",
			Required: true,
		})
		locations.Fields.Add(&core.TextField{
			Name:     "shared_body_id",
			Required: true,
		})
		locations.Fields.Add(&core.NumberField{
			Name: "surface_x",
		})
		locations.Fields.Add(&core.NumberField{
			Name: "surface_y",
		})
		locations.Fields.Add(&core.NumberField{
			Name: "surface_z",
		})
		locations.Fields.Add(&core.SelectField{
			Name:   "location_type",
			Values: []string{"base", "outpost", "mining_site", "orbit"},
		})
		locations.Fields.Add(&core.JSONField{
			Name: "configuration",
		})

		if err := app.Save(locations); err != nil {
			return err
		}

		// --- deposits ---
		deposits := core.NewBaseCollection("deposits")

		deposits.Fields.Add(&core.RelationField{
			Name:          "location",
			Required:      true,
			CollectionId:  locations.Id,
			CascadeDelete: true,
		})
		deposits.Fields.Add(&core.TextField{
			Name:     "mineral_type",
			Required: true,
		})
		deposits.Fields.Add(&core.NumberField{
			Name:     "quantity",
			Required: true,
		})
		deposits.Fields.Add(&core.NumberField{
			Name: "purity",
		})
		deposits.Fields.Add(&core.BoolField{
			Name: "depleted",
		})
		deposits.Fields.Add(&core.JSONField{
			Name: "configuration",
		})

		if err := app.Save(deposits); err != nil {
			return err
		}

		// --- structures ---
		structures := core.NewBaseCollection("structures")

		structures.Fields.Add(&core.RelationField{
			Name:          "location",
			Required:      true,
			CollectionId:  locations.Id,
			CascadeDelete: true,
		})
		structures.Fields.Add(&core.TextField{
			Name:     "owner",
			Required: true,
		})
		structures.Fields.Add(&core.SelectField{
			Name:   "structure_type",
			Values: []string{"control_station", "launchpad", "satellite_station", "market", "outpost"},
		})
		structures.Fields.Add(&core.SelectField{
			Name:   "status",
			Values: []string{"under_construction", "active", "damaged", "offline"},
		})
		structures.Fields.Add(&core.JSONField{
			Name: "configuration",
		})

		if err := app.Save(structures); err != nil {
			return err
		}

		// --- rockets ---
		rockets := core.NewBaseCollection("rockets")

		rockets.Fields.Add(&core.TextField{
			Name:     "owner",
			Required: true,
		})
		rockets.Fields.Add(&core.TextField{
			Name:     "name",
			Required: true,
		})
		rockets.Fields.Add(&core.SelectField{
			Name:   "rocket_type",
			Values: []string{"starter_1", "starter_2", "advanced"},
		})
		rockets.Fields.Add(&core.SelectField{
			Name:   "status",
			Values: []string{"on_pad", "in_flight", "returning", "maintenance"},
		})
		rockets.Fields.Add(&core.RelationField{
			Name:          "location",
			CollectionId:  locations.Id,
			CascadeDelete: false,
		})
		rockets.Fields.Add(&core.TextField{
			Name: "shared_body_id",
		})
		rockets.Fields.Add(&core.JSONField{
			Name: "cargo",
		})
		rockets.Fields.Add(&core.TextField{
			Name: "launched_at",
		})
		rockets.Fields.Add(&core.TextField{
			Name: "eta",
		})
		rockets.Fields.Add(&core.JSONField{
			Name: "configuration",
		})

		if err := app.Save(rockets); err != nil {
			return err
		}

		// --- missions ---
		missions := core.NewBaseCollection("missions")

		missions.Fields.Add(&core.TextField{
			Name:     "user",
			Required: true,
		})
		missions.Fields.Add(&core.RelationField{
			Name:          "rocket",
			Required:      true,
			CollectionId:  rockets.Id,
			CascadeDelete: false,
		})
		missions.Fields.Add(&core.RelationField{
			Name:          "contractor",
			CollectionId:  contractors.Id,
			CascadeDelete: false,
		})
		missions.Fields.Add(&core.SelectField{
			Name:   "status",
			Values: []string{"active", "returning", "completed", "failed"},
		})
		missions.Fields.Add(&core.TextField{
			Name:     "shared_body_id",
			Required: true,
		})
		missions.Fields.Add(&core.TextField{
			Name: "shared_classification_id",
		})
		missions.Fields.Add(&core.TextField{
			Name: "started_at",
		})
		missions.Fields.Add(&core.TextField{
			Name: "completed_at",
		})
		missions.Fields.Add(&core.NumberField{
			Name: "reward_francs",
		})
		missions.Fields.Add(&core.JSONField{
			Name: "configuration",
		})

		if err := app.Save(missions); err != nil {
			return err
		}

		// --- inventory ---
		inventory := core.NewBaseCollection("inventory")

		inventory.Fields.Add(&core.TextField{
			Name:     "owner",
			Required: true,
		})
		inventory.Fields.Add(&core.TextField{
			Name:     "mineral_type",
			Required: true,
		})
		inventory.Fields.Add(&core.NumberField{
			Name:     "quantity",
			Required: true,
		})
		inventory.Fields.Add(&core.RelationField{
			Name:          "source_deposit",
			CollectionId:  deposits.Id,
			CascadeDelete: false,
		})
		inventory.Fields.Add(&core.JSONField{
			Name: "configuration",
		})

		if err := app.Save(inventory); err != nil {
			return err
		}

		// --- market_prices ---
		marketPrices := core.NewBaseCollection("market_prices")

		marketPrices.Fields.Add(&core.TextField{
			Name:     "commodity",
			Required: true,
		})
		marketPrices.Fields.Add(&core.NumberField{
			Name:     "price",
			Required: true,
		})
		marketPrices.Fields.Add(&core.TextField{
			Name: "updated_at",
		})

		if err := app.Save(marketPrices); err != nil {
			return err
		}

		// --- research ---
		research := core.NewBaseCollection("research")

		research.Fields.Add(&core.TextField{
			Name:     "user",
			Required: true,
		})
		research.Fields.Add(&core.TextField{
			Name:     "tech_type",
			Required: true,
		})
		research.Fields.Add(&core.TextField{
			Name:     "tech_id",
			Required: true,
		})
		research.Fields.Add(&core.TextField{
			Name: "unlocked_at",
		})

		if err := app.Save(research); err != nil {
			return err
		}

		return nil

	}, func(app core.App) error {
		// down — remove in reverse order
		for _, name := range []string{
			"research",
			"market_prices",
			"inventory",
			"missions",
			"rockets",
			"structures",
			"deposits",
			"locations",
			"contractors",
		} {
			col, err := app.FindCollectionByNameOrId(name)
			if err == nil {
				if err := app.Delete(col); err != nil {
					return err
				}
			}
		}
		return nil
	})
}
