package main

import (
	"encoding/json"
	"net/http"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

var siteDeedPrices = map[string]int{"moon-south-pole": 4000000, "mars-arcadia": 12000000, "europa-chaos": 24000000}

// registerTreasuryRoutes keeps public-money writes off the generic collection
// API. Price comes from this server catalogue, and the singleton update is
// serialized in PocketBase's transaction.
func registerTreasuryRoutes(app core.App) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		g := se.Router.Group("/api/treasury")
		g.Bind(apis.RequireAuth("users"))
		g.POST("/site-deed", func(e *core.RequestEvent) error {
			var body struct {
				SiteID         string `json:"siteId"`
				IdempotencyKey string `json:"idempotencyKey"`
			}
			if err := e.BindBody(&body); err != nil {
				return apis.NewBadRequestError("invalid body", err)
			}
			price, ok := siteDeedPrices[body.SiteID]
			if !ok || body.IdempotencyKey == "" {
				return apis.NewBadRequestError("unknown site or idempotency key", nil)
			}
			var state map[string]any
			err := app.RunInTransaction(func(tx core.App) error {
				record, err := tx.FindFirstRecordByFilter("public_treasury", "singleton_key = 'public'")
				if err != nil {
					return err
				}
				raw, _ := json.Marshal(record.GetRaw("state"))
				if err := json.Unmarshal(raw, &state); err != nil {
					return err
				}
				ledger, _ := state["ledger"].([]any)
				for _, item := range ledger {
					if entry, ok := item.(map[string]any); ok && entry["referenceId"] == body.IdempotencyKey {
						return nil
					}
				}
				balance, _ := state["balanceFrancs"].(float64)
				balance += float64(price)
				state["balanceFrancs"] = balance
				state["ledger"] = append(ledger, map[string]any{"id": body.IdempotencyKey, "kind": "site-deed-revenue", "referenceId": body.IdempotencyKey, "occurredAt": types.NowDateTime().Time().UnixMilli(), "amountFrancs": price, "direction": "credit", "balanceAfterFrancs": balance, "description": "Client site deed"})
				record.Set("state", state)
				return tx.Save(record)
			})
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "treasury update failed", err)
			}
			return e.JSON(http.StatusOK, map[string]any{"state": state})
		})
		return se.Next()
	})
}
