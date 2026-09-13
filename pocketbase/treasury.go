package main

import (
	"encoding/json"
	"net/http"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

var siteDeedPrices = map[string]int{"moon-south-pole": 4000000, "mars-arcadia": 12000000, "europa-chaos": 24000000}

type treasuryLedgerEntry struct {
	ID                 string `json:"id"`
	Kind               string `json:"kind"`
	ReferenceID        string `json:"referenceId"`
	OccurredAt         int64  `json:"occurredAt"`
	AmountFrancs       int    `json:"amountFrancs"`
	Direction          string `json:"direction"`
	BalanceAfterFrancs int    `json:"balanceAfterFrancs"`
	Description        string `json:"description"`
}

type treasuryState struct {
	BalanceFrancs int                   `json:"balanceFrancs"`
	Ledger        []treasuryLedgerEntry `json:"ledger"`
	Loans         map[string]any        `json:"loans"`
}

// registerTreasuryRoutes keeps public-money writes off the generic collection
// API. Price comes from this server catalogue, and the singleton update is
// serialized in PocketBase's transaction.
func registerTreasuryRoutes(app core.App) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		g := se.Router.Group("/api/treasury")
		g.Bind(apis.RequireAuth("users"))
		g.POST("/site-deed", func(e *core.RequestEvent) error {
			var body struct {
				SiteID string `json:"siteId"`
			}
			if err := e.BindBody(&body); err != nil {
				return apis.NewBadRequestError("invalid body", err)
			}
			price, ok := siteDeedPrices[body.SiteID]
			if !ok {
				return apis.NewBadRequestError("unknown site", nil)
			}
			referenceID := "site-deed:" + e.Auth.Id + ":" + body.SiteID + ":purchase"
			state := treasuryState{}
			acquired := false
			err := app.RunInTransaction(func(tx core.App) error {
				record, err := tx.FindFirstRecordByFilter("public_treasury", "singleton_key = 'public'")
				if err != nil {
					return err
				}
				raw, _ := json.Marshal(record.GetRaw("state"))
				if err := json.Unmarshal(raw, &state); err != nil {
					return err
				}
				for _, entry := range state.Ledger {
					if entry.ReferenceID == referenceID {
						return nil
					}
				}
				state.BalanceFrancs += price
				state.Ledger = append(state.Ledger, treasuryLedgerEntry{ID: referenceID, Kind: "site-deed-revenue", ReferenceID: referenceID, OccurredAt: types.NowDateTime().Time().UnixMilli(), AmountFrancs: price, Direction: "credit", BalanceAfterFrancs: state.BalanceFrancs, Description: "Client site deed"})
				record.Set("state", state)
				if err := tx.Save(record); err != nil {
					return err
				}
				acquired = true
				return nil
			})
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "treasury update failed", err)
			}
			return e.JSON(http.StatusOK, map[string]any{"state": state, "acquired": acquired, "priceFrancs": price, "referenceId": referenceID})
		})
		return se.Next()
	})
}
