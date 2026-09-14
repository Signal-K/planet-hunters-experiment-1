package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// These prices must remain aligned with web/lib/data/economy.ts. The browser
// uses that catalogue only to present and preflight an offer; this server map
// is authoritative for the treasury credit. Keeping the values equal prevents
// a deed from charging a player one amount while crediting the public ledger
// another.
var siteDeedPrices = map[string]int{"moon-south-pole": 4000000, "mars-arcadia": 5500000, "europa-chaos": 7500000}

const bankruptcyLoanPrincipal = 5_000_000

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
		g.POST("/bankruptcy-loan", func(e *core.RequestEvent) error {
			loanID := "bankruptcy-loan:" + e.Auth.Id
			state := treasuryState{}
			changed := false
			err := app.RunInTransaction(func(tx core.App) error {
				treasury, err := tx.FindFirstRecordByFilter("public_treasury", "singleton_key = 'public'")
				if err != nil {
					return err
				}
				raw, _ := json.Marshal(treasury.GetRaw("state"))
				if err := json.Unmarshal(raw, &state); err != nil {
					return err
				}
				if state.Loans == nil {
					state.Loans = map[string]any{}
				}
				if _, exists := state.Loans[loanID]; exists || state.BalanceFrancs < bankruptcyLoanPrincipal {
					return nil
				}

				gameState, err := tx.FindFirstRecordByFilter("game_states", "user = {:user}", dbx.Params{"user": e.Auth.Id})
				if err != nil {
					return err
				}
				gameRaw, _ := json.Marshal(gameState.GetRaw("state"))
				var saved map[string]any
				if err := json.Unmarshal(gameRaw, &saved); err != nil {
					return err
				}
				player, ok := saved["player"].(map[string]any)
				if !ok {
					return apis.NewBadRequestError("invalid player state", nil)
				}
				francs, ok := player["francs"].(float64)
				if !ok {
					return apis.NewBadRequestError("invalid player balance", nil)
				}
				now := types.NowDateTime().Time().UnixMilli()
				state.BalanceFrancs -= bankruptcyLoanPrincipal
				state.Loans[loanID] = map[string]any{"id": loanID, "playerId": e.Auth.Id, "principalFrancs": bankruptcyLoanPrincipal, "outstandingFrancs": bankruptcyLoanPrincipal, "issuedAt": now, "status": "open"}
				state.Ledger = append(state.Ledger, treasuryLedgerEntry{ID: "bankruptcy-loan-issue:" + e.Auth.Id, Kind: "bankruptcy-loan-issued", ReferenceID: loanID, OccurredAt: now, AmountFrancs: bankruptcyLoanPrincipal, Direction: "debit", BalanceAfterFrancs: state.BalanceFrancs, Description: "No-interest emergency loan"})
				player["francs"] = francs + bankruptcyLoanPrincipal
				player["loanDebt"] = bankruptcyLoanPrincipal
				player["loanOffered"] = true
				gameState.Set("state", saved)
				treasury.Set("state", state)
				if err := tx.Save(gameState); err != nil {
					return err
				}
				if err := tx.Save(treasury); err != nil {
					return err
				}
				changed = true
				return nil
			})
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "treasury loan failed", err)
			}
			return e.JSON(http.StatusOK, map[string]any{"state": state, "changed": changed, "principalFrancs": bankruptcyLoanPrincipal})
		})
		g.POST("/bankruptcy-loan/repayment", func(e *core.RequestEvent) error {
			var body struct {
				AmountFrancs int `json:"amountFrancs"`
			}
			if err := e.BindBody(&body); err != nil {
				return apis.NewBadRequestError("invalid body", err)
			}
			if body.AmountFrancs <= 0 {
				return apis.NewBadRequestError("invalid repayment", nil)
			}
			loanID := "bankruptcy-loan:" + e.Auth.Id
			state := treasuryState{}
			paid := 0
			err := app.RunInTransaction(func(tx core.App) error {
				treasury, err := tx.FindFirstRecordByFilter("public_treasury", "singleton_key = 'public'")
				if err != nil {
					return err
				}
				raw, _ := json.Marshal(treasury.GetRaw("state"))
				if err := json.Unmarshal(raw, &state); err != nil {
					return err
				}
				loan, ok := state.Loans[loanID].(map[string]any)
				if !ok {
					return nil
				}
				outstanding, ok := loan["outstandingFrancs"].(float64)
				if !ok || outstanding <= 0 {
					return nil
				}
				paid = min(body.AmountFrancs, int(outstanding))
				if paid == 0 {
					return nil
				}
				now := types.NowDateTime().Time().UnixMilli()
				loan["outstandingFrancs"] = outstanding - float64(paid)
				if loan["outstandingFrancs"].(float64) == 0 {
					loan["status"] = "repaid"
					loan["repaidAt"] = now
				}
				state.BalanceFrancs += paid
				state.Ledger = append(state.Ledger, treasuryLedgerEntry{ID: "bankruptcy-loan-repayment:" + e.Auth.Id + ":" + fmt.Sprint(now), Kind: "bankruptcy-loan-repayment", ReferenceID: loanID, OccurredAt: now, AmountFrancs: paid, Direction: "credit", BalanceAfterFrancs: state.BalanceFrancs, Description: "Emergency loan repayment"})
				treasury.Set("state", state)
				return tx.Save(treasury)
			})
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "treasury repayment failed", err)
			}
			return e.JSON(http.StatusOK, map[string]any{"state": state, "paidFrancs": paid})
		})
		return se.Next()
	})
}
