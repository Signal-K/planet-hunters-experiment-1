package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

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

// Cycle 12: one share per pilot, reserved and paid within server transactions.
const asteroidWindow = 72 * time.Hour
const cometWindow = 48 * time.Hour
const anomalySchedule = "0 12 * * 1,3,5" // UTC, independent of connected players.
var anomalyMinerals = map[string]string{"asteroid": "iron", "comet": "hydrogen"}

func ensureAnomalies(app core.App) error {
	for _, name := range []string{"anomalies", "claims"} {
		if existing, err := app.FindCollectionByNameOrId(name); err == nil {
			if name == "claims" {
				addMiningClaimFields(existing)
				if err := app.Save(existing); err != nil {
					return err
				}
			}
			continue
		}
		c := core.NewBaseCollection(name)
		if name == "anomalies" {
			c.Fields.Add(&core.SelectField{Name: "type", Values: []string{"asteroid", "comet"}, MaxSelect: 1, Required: true})
			for _, key := range []string{"slot", "spawned", "expires", "capacity", "left"} {
				c.Fields.Add(&core.NumberField{Name: key})
			}
			c.ListRule = types.Pointer("@request.auth.id != ''")
			c.ViewRule = c.ListRule
		} else {
			for _, key := range []string{"user", "anomaly"} {
				c.Fields.Add(&core.TextField{Name: key, Required: true})
			}
			for _, key := range []string{"amount"} {
				c.Fields.Add(&core.NumberField{Name: key})
			}
			c.Fields.Add(&core.BoolField{Name: "collected"})
			addMiningClaimFields(c)
			c.ListRule = types.Pointer("user = @request.auth.id")
			c.ViewRule = c.ListRule
			c.AddIndex("idx_claim_user_anomaly", true, "user, anomaly", "")
		}
		// Generic writes are locked; only the transactional routes below mutate these.
		if err := app.Save(c); err != nil {
			return err
		}
	}
	return nil
}

func spawnAnomaly(app core.App, kind string, now time.Time, window time.Duration) (*core.Record, error) {
	var spawned *core.Record
	err := app.RunInTransaction(func(tx core.App) error {
		live, err := tx.FindRecordsByFilter("anomalies", "expires > {:now} && left > 0", "", 0, 0, dbx.Params{"now": now.UnixMilli()})
		if err != nil {
			return err
		}
		used := map[int]bool{}
		for _, r := range live {
			used[r.GetInt("slot")] = true
		}
		slot := 0
		for ; slot < 6 && used[slot]; slot++ {
		}
		if slot == 6 {
			return nil
		}
		col, err := tx.FindCollectionByNameOrId("anomalies")
		if err != nil {
			return err
		}
		r := core.NewRecord(col)
		r.Set("type", kind)
		r.Set("slot", slot)
		r.Set("spawned", now.UnixMilli())
		r.Set("expires", now.Add(window).UnixMilli())
		// TODO: no weekly classification counter is stored here; use level 1.
		r.Set("capacity", 2)
		r.Set("left", 2)
		if err := tx.Save(r); err != nil {
			return err
		}
		spawned = r
		return nil
	})
	return spawned, err
}

func reserveAnomaly(app core.App, user, id string, now time.Time) (*core.Record, error) {
	var claim *core.Record
	err := app.RunInTransaction(func(tx core.App) error {
		old, err := tx.FindFirstRecordByFilter("claims", "user = {:user} && anomaly = {:id}", dbx.Params{"user": user, "id": id})
		if err == nil {
			claim = old
			return nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		r, err := tx.FindRecordById("anomalies", id)
		if err != nil {
			return err
		}
		if r.GetInt("left") < 1 || r.GetInt("expires") <= int(now.UnixMilli()) {
			return apis.NewBadRequestError("Target is no longer reachable", nil)
		}
		col, err := tx.FindCollectionByNameOrId("claims")
		if err != nil {
			return err
		}
		claim = core.NewRecord(col)
		claim.Set("user", user)
		claim.Set("anomaly", id)
		claim.Set("amount", 1)
		claim.Set("kind", r.GetString("type"))
		claim.Set("mineral", anomalyMinerals[r.GetString("type")])
		claim.Set("units", 10)

		r.Set("left", r.GetInt("left")-1)
		if err := tx.Save(r); err != nil {
			return err
		}
		return tx.Save(claim)
	})
	return claim, err
}

// Claims double as the immutable contribution log: a collected claim is one
// weekly treasury receipt. No client-supplied mineral, quantity or week is used.
func addMiningClaimFields(c *core.Collection) {
	for _, key := range []string{"week", "mineral", "kind"} {
		if c.Fields.GetByName(key) == nil {
			c.Fields.Add(&core.TextField{Name: key})
		}
	}
	for _, key := range []string{"units", "challenge_start", "last_hit", "hits", "completed"} {
		if c.Fields.GetByName(key) == nil {
			c.Fields.Add(&core.NumberField{Name: key})
		}
	}
}

func strikeAnomaly(app core.App, user, id string, now time.Time) (*core.Record, error) {
	var claim *core.Record
	err := app.RunInTransaction(func(tx core.App) error {
		r, err := tx.FindRecordById("claims", id)
		if err != nil {
			return err
		}
		if r.GetString("user") != user {
			return apis.NewForbiddenError("Not your ship", nil)
		}
		claim = r
		if r.GetBool("collected") || r.GetInt("hits") >= 3 {
			return nil
		}
		ms := now.UnixMilli()
		if r.GetInt("challenge_start") == 0 {
			r.Set("challenge_start", ms)
			return tx.Save(r)
		}
		elapsed := ms - int64(r.GetInt("challenge_start"))
		// Two-second sweep, central 40% is a valid strike. Server checks timing.
		phase := elapsed % 2000
		if elapsed < 0 || ms-int64(r.GetInt("last_hit")) < 500 {
			return nil
		}
		r.Set("last_hit", ms)
		if phase >= 600 && phase <= 1400 {
			r.Set("hits", r.GetInt("hits")+1)
		}
		return tx.Save(r)
	})
	return claim, err
}

func collectAnomaly(app core.App, user, id string, now time.Time) (map[string]any, error) {
	var receipt map[string]any
	err := app.RunInTransaction(func(tx core.App) error {
		r, err := tx.FindRecordById("claims", id)
		if err != nil {
			return err
		}
		if r.GetString("user") != user {
			return apis.NewForbiddenError("Not your ship", nil)
		}
		if !r.GetBool("collected") {
			if r.GetInt("hits") < 3 {
				return apis.NewBadRequestError("Hit three pockets first", nil)
			}
			r.Set("week", passportWeekKey(now))
			r.Set("completed", now.UnixMilli())
			r.Set("collected", true)
			if err := tx.Save(r); err != nil {
				return err
			}
		}
		receipt = map[string]any{"week": r.GetString("week"), "mineral": r.GetString("mineral"), "units": r.GetInt("units"), "claim": r.Id}
		return nil
	})
	return receipt, err
}

func miningTreasury(app core.App, week string) (map[string]int, error) {
	rows, err := app.FindRecordsByFilter("claims", "collected = true && week = {:week}", "", 0, 0, dbx.Params{"week": week})
	if err != nil {
		return nil, err
	}
	totals := map[string]int{"iron": 0, "hydrogen": 0}
	for _, r := range rows {
		totals[r.GetString("mineral")] += r.GetInt("units")
	}
	return totals, nil
}

func registerAnomalyRoutes(app core.App) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if err := ensureAnomalies(app); err != nil {
			return err
		}
		app.Cron().MustAdd("timed_anomalies", anomalySchedule, func() {
			now := time.Now().UTC()
			kind, window := "asteroid", asteroidWindow
			if now.Weekday() == time.Wednesday {
				kind, window = "comet", cometWindow
			}
			if _, err := spawnAnomaly(app, kind, now, window); err != nil {
				log.Printf("spawn anomaly: %v", err)
			}
		})
		g := se.Router.Group("/api/anomalies")
		g.Bind(apis.RequireAuth("users"))
		g.GET("/treasury", func(e *core.RequestEvent) error {
			week := e.Request.URL.Query().Get("week")
			if week == "" {
				week = passportWeekKey(time.Now())
			}
			if _, err := time.Parse("2006-01-02", week); err != nil {
				return apis.NewBadRequestError("Invalid week", nil)
			}
			totals, err := miningTreasury(app, week)
			if err != nil {
				return err
			}
			return e.JSON(200, map[string]any{"week": week, "minerals": totals})
		})
		g.POST("/{id}/strike", func(e *core.RequestEvent) error {
			r, err := strikeAnomaly(app, e.Auth.Id, e.Request.PathValue("id"), time.Now())
			if err != nil {
				return err
			}
			return e.JSON(200, r)
		})
		g.POST("/{id}/send", func(e *core.RequestEvent) error {
			r, err := reserveAnomaly(app, e.Auth.Id, e.Request.PathValue("id"), time.Now())
			if err != nil {
				return err
			}
			return e.JSON(200, r)
		})
		g.POST("/{id}/collect", func(e *core.RequestEvent) error {
			state, err := collectAnomaly(app, e.Auth.Id, e.Request.PathValue("id"), time.Now())
			if err != nil {
				return err
			}
			return e.JSON(200, map[string]any{"receipt": state})
		})
		if os.Getenv("LANDNAM_DEV_ANOMALIES") == "1" {
			g.POST("/spawn", func(e *core.RequestEvent) error {
				var body struct {
					Type    string `json:"type"`
					Seconds int    `json:"seconds"`
				}
				if err := e.BindBody(&body); err != nil {
					return err
				}
				if _, ok := anomalyMinerals[body.Type]; !ok {
					return apis.NewBadRequestError("Choose asteroid or comet", nil)
				}
				window := asteroidWindow
				if body.Type == "comet" {
					window = cometWindow
				}
				if body.Seconds > 0 {
					window = time.Duration(body.Seconds) * time.Second
				}
				r, err := spawnAnomaly(app, body.Type, time.Now(), window)
				if err != nil {
					return err
				}
				return e.JSON(200, r)
			})
		}
		return se.Next()
	})
}
