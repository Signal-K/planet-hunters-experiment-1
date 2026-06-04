package main

import (
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/signal-k/landnam-backend/internal/extensions"
	"github.com/signal-k/landnam-backend/internal/sharedauth"
	_ "github.com/signal-k/landnam-backend/migrations"
)

func main() {
	if os.Getenv("LANDNAM_PB_ENCRYPTION_KEY") == "" {
		log.Print("warning: LANDNAM_PB_ENCRYPTION_KEY is empty; PocketBase settings encryption is disabled")
	}
	if os.Getenv("SHARED_PB_URL") == "" {
		log.Print("warning: SHARED_PB_URL is empty; shared auth verification endpoints will need explicit configuration")
	}

	app := pocketbase.NewWithConfig(pocketbase.Config{
		DefaultEncryptionEnv: "LANDNAM_PB_ENCRYPTION_KEY",
	})
	sharedAuth := sharedauth.New(os.Getenv("SHARED_PB_URL"))

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		return se.Next()
	})

	extensions.Register(app, sharedAuth)

	if err := app.Cron().Add("update_market_prices", "0 * * * *", func() {
		updateMarketPrices(app)
	}); err != nil {
		log.Fatalf("failed to register market price cron job: %v", err)
	}

	// Hook: when a mission is completed, update market prices
	// and calculate payout. Stub for now.
	app.OnRecordAfterCreateSuccess("missions").BindFunc(func(e *core.RecordEvent) error {
		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
		os.Exit(1)
	}
}

func updateMarketPrices(app core.App) {
	basePrices := map[string]float64{
		"iron":     100,
		"silicon":  250,
		"gold":     1500,
		"platinum": 2200,
		"titanium": 800,
	}

	collection, err := app.FindCollectionByNameOrId("market_prices")
	if err != nil {
		log.Printf("failed to find market_prices collection: %v", err)
		return
	}

	for commodity, basePrice := range basePrices {
		record, err := app.FindFirstRecordByData(collection, "commodity", commodity)
		if err != nil {
			record = core.NewRecord(collection)
			record.Set("commodity", commodity)
			record.Set("price", basePrice)
		}

		currentPrice := record.GetFloat("price")
		if currentPrice <= 0 {
			currentPrice = basePrice
		}

		fluctuation := 0.85 + rand.Float64()*0.30
		record.Set("price", currentPrice*fluctuation)
		record.Set("updated_at", time.Now().UTC().Format(time.RFC3339))

		if err := app.Save(record); err != nil {
			log.Printf("failed to update market price for %s: %v", commodity, err)
		}
	}
}
