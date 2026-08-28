package main

import (
	"errors"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

// KES-83: simple friend system — friend requests, a read-only base view, and
// one free gift per friend per AEST day. Trading/resource-sharing/research-
// sharing are explicitly out of scope for this pass (see the Linear issue).
//
// All routes below require a normal Landnam auth token (the same one every
// other authenticated Landnam request uses, minted via the shared-backend
// exchange in landnam_auth.go) and operate purely within Landnam's own
// PocketBase — no cross-backend call is needed, because game_states.user and
// the Landnam "users" record ID are already the shared-backend user ID
// (see landnam_auth.go's doc comment).

var friendGiftMinerals = []string{"iron", "silicon", "carbon", "copper", "aluminium", "nickel", "cobalt", "ice"}
var friendGiftBlueprints = []string{"scan-station", "deep-space-telescope", "astronaut-academy", "garage"}

func registerFriendsRoutes(app core.App) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		g := se.Router.Group("/api/friends")
		g.Bind(apis.RequireAuth("users"))

		g.GET("/search", friendsSearchHandler(app))
		g.POST("/username", friendsSetUsernameHandler(app))
		g.POST("/request", friendsRequestHandler(app))
		g.POST("/respond", friendsRespondHandler(app))
		g.DELETE("/{id}", friendsRemoveHandler(app))
		g.GET("/list", friendsListHandler(app))
		g.GET("/base/{friendId}", friendsBaseHandler(app))
		g.POST("/gift/send", friendsGiftSendHandler(app))
		g.GET("/gift/inbox", friendsGiftInboxHandler(app))
		g.POST("/gift/claim", friendsGiftClaimHandler(app))

		return se.Next()
	})
}

// ── helpers ──────────────────────────────────────────────────────────────

// aestDateKey returns the current calendar date in Australia/Sydney as
// "YYYY-MM-DD" — the key the daily gift limit is keyed on, per the feature
// spec's "once a day (00:01 AEST)" reset. Falls back to a fixed UTC+10
// offset (ignoring AEDT daylight saving) if the zoneinfo database isn't
// available in the runtime environment, which is close enough for a daily
// gift cadence to not be worth failing the request over.
func aestDateKey(now time.Time) string {
	loc, err := time.LoadLocation("Australia/Sydney")
	if err != nil {
		loc = time.FixedZone("AEST", 10*3600)
	}
	return now.In(loc).Format("2006-01-02")
}

func usernameFromUser(user *core.Record) string {
	if u := strings.TrimSpace(user.GetString("username")); u != "" {
		return u
	}
	return user.Id
}

func publicUser(user *core.Record) map[string]any {
	return map[string]any{
		"id":       user.Id,
		"username": usernameFromUser(user),
	}
}

func loadUser(app core.App, id string) (*core.Record, error) {
	return app.FindRecordById("users", id)
}

// ── handlers ─────────────────────────────────────────────────────────────

func friendsSearchHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		q := strings.TrimSpace(e.Request.URL.Query().Get("q"))
		if len(q) < 2 {
			return e.JSON(http.StatusOK, map[string]any{"results": []any{}})
		}
		self := e.Auth.Id
		records, err := app.FindRecordsByFilter(
			"users", "username ~ {:q} && id != {:self}", "username", 20, 0,
			dbx.Params{"q": q, "self": self},
		)
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "search failed", nil)
		}
		results := make([]map[string]any, 0, len(records))
		for _, r := range records {
			if strings.TrimSpace(r.GetString("username")) == "" {
				continue
			}
			results = append(results, publicUser(r))
		}
		return e.JSON(http.StatusOK, map[string]any{"results": results})
	}
}

func friendsSetUsernameHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			Username string `json:"username"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		name := strings.TrimSpace(body.Username)
		if len(name) < 3 || len(name) > 24 {
			return apis.NewBadRequestError("username must be 3-24 characters", nil)
		}
		for _, r := range name {
			if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '_') {
				return apis.NewBadRequestError("username may only contain letters, numbers, and underscores", nil)
			}
		}
		existing, _ := app.FindFirstRecordByFilter(
			"users", "username = {:name} && id != {:self}",
			dbx.Params{"name": name, "self": e.Auth.Id},
		)
		if existing != nil {
			return apis.NewApiError(http.StatusConflict, "that username is taken", nil)
		}
		e.Auth.Set("username", name)
		if err := app.Save(e.Auth); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to save username", nil)
		}
		return e.JSON(http.StatusOK, publicUser(e.Auth))
	}
}

func friendsRequestHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			Username string `json:"username"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		name := strings.TrimSpace(body.Username)
		if name == "" {
			return apis.NewBadRequestError("username required", nil)
		}
		target, err := app.FindFirstRecordByFilter("users", "username = {:name}", dbx.Params{"name": name})
		if err != nil || target == nil {
			return apis.NewNotFoundError("no player with that username", nil)
		}
		if target.Id == e.Auth.Id {
			return apis.NewBadRequestError("you can't friend yourself", nil)
		}

		// A friendship already exists in either direction — surface it
		// instead of creating a duplicate/conflicting row (the unique index
		// on (requester, addressee) only blocks one direction).
		existing, _ := app.FindFirstRecordByFilter(
			"friendships", "(requester = {:a} && addressee = {:b}) || (requester = {:b} && addressee = {:a})",
			dbx.Params{"a": e.Auth.Id, "b": target.Id},
		)
		if existing != nil {
			return e.JSON(http.StatusOK, map[string]any{"friendship": friendshipView(existing)})
		}

		col, err := app.FindCollectionByNameOrId("friendships")
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "server misconfiguration", nil)
		}
		rec := core.NewRecord(col)
		rec.Set("requester", e.Auth.Id)
		rec.Set("addressee", target.Id)
		rec.Set("status", "pending")
		if err := app.Save(rec); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to send request", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"friendship": friendshipView(rec)})
	}
}

func friendsRespondHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			FriendshipID string `json:"friendshipId"`
			Accept       bool   `json:"accept"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		rec, err := app.FindRecordById("friendships", body.FriendshipID)
		if err != nil {
			return apis.NewNotFoundError("request not found", nil)
		}
		if rec.GetString("addressee") != e.Auth.Id {
			return apis.NewForbiddenError("only the recipient can respond to this request", nil)
		}
		rec.Set("status", map[bool]string{true: "accepted", false: "declined"}[body.Accept])
		if err := app.Save(rec); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to save response", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"friendship": friendshipView(rec)})
	}
}

func friendsRemoveHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		id := e.Request.PathValue("id")
		rec, err := app.FindRecordById("friendships", id)
		if err != nil {
			return apis.NewNotFoundError("not found", nil)
		}
		if rec.GetString("requester") != e.Auth.Id && rec.GetString("addressee") != e.Auth.Id {
			return apis.NewForbiddenError("not your friendship", nil)
		}
		if err := app.Delete(rec); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to remove", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"ok": true})
	}
}

func friendshipView(rec *core.Record) map[string]any {
	return map[string]any{
		"id":        rec.Id,
		"requester": rec.GetString("requester"),
		"addressee": rec.GetString("addressee"),
		"status":    rec.GetString("status"),
	}
}

func friendsListHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		self := e.Auth.Id
		records, err := app.FindRecordsByFilter(
			"friendships", "requester = {:self} || addressee = {:self}", "-created", 200, 0,
			dbx.Params{"self": self},
		)
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to list friendships", nil)
		}

		today := aestDateKey(time.Now())

		friends := []map[string]any{}
		incoming := []map[string]any{}
		outgoing := []map[string]any{}

		for _, rec := range records {
			otherID := rec.GetString("addressee")
			if otherID == self {
				otherID = rec.GetString("requester")
			}
			other, err := loadUser(app, otherID)
			if err != nil {
				continue
			}
			entry := publicUser(other)
			entry["friendshipId"] = rec.Id

			switch rec.GetString("status") {
			case "accepted":
				sentToday, _ := app.FindFirstRecordByFilter(
					"friend_gifts", "sender = {:self} && recipient = {:other} && gift_date = {:day}",
					dbx.Params{"self": self, "other": otherID, "day": today},
				)
				entry["giftSentToday"] = sentToday != nil
				friends = append(friends, entry)
			case "pending":
				if rec.GetString("addressee") == self {
					incoming = append(incoming, entry)
				} else {
					outgoing = append(outgoing, entry)
				}
			}
		}

		return e.JSON(http.StatusOK, map[string]any{
			"me":       publicUser(e.Auth),
			"friends":  friends,
			"incoming": incoming,
			"outgoing": outgoing,
		})
	}
}

func areFriends(app core.App, a, b string) bool {
	rec, _ := app.FindFirstRecordByFilter(
		"friendships",
		"status = 'accepted' && ((requester = {:a} && addressee = {:b}) || (requester = {:b} && addressee = {:a}))",
		dbx.Params{"a": a, "b": b},
	)
	return rec != nil
}

// friendsBaseHandler returns a read-only, deliberately narrow snapshot of a
// friend's base — enough to browse, nothing that exposes an economy state a
// friend could copy/exploit (raw cargo counts, in-flight mission timers,
// etc. are left out on purpose; expand only with a new design decision).
func friendsBaseHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		friendID := e.Request.PathValue("friendId")
		if !areFriends(app, e.Auth.Id, friendID) {
			return apis.NewForbiddenError("you can only view a friend's base", nil)
		}
		state, err := app.FindFirstRecordByFilter("game_states", "user = {:id}", dbx.Params{"id": friendID})
		if err != nil {
			return apis.NewNotFoundError("this player hasn't started a base yet", nil)
		}
		friend, err := loadUser(app, friendID)
		if err != nil {
			return apis.NewNotFoundError("player not found", nil)
		}

		blob := state.Get("state")
		asMap, _ := blob.(map[string]any)
		player, _ := asMap["player"].(map[string]any)

		snapshot := map[string]any{
			"username": usernameFromUser(friend),
		}
		if player != nil {
			snapshot["missionsDone"] = player["missionsDone"]
			snapshot["placed"] = player["placed"]
			snapshot["freeOperations"] = player["freeOperations"]
			snapshot["unlockedBlueprints"] = player["unlockedBlueprints"]
		}

		return e.JSON(http.StatusOK, map[string]any{"base": snapshot})
	}
}

func rollGiftPayload(kind string) (map[string]any, error) {
	switch kind {
	case "currency":
		return map[string]any{"amount": 50 + rand.Intn(101)}, nil // 50-150 francs
	case "resource":
		mineral := friendGiftMinerals[rand.Intn(len(friendGiftMinerals))]
		return map[string]any{"mineral": mineral, "amount": 3 + rand.Intn(6)}, nil // 3-8 units
	case "blueprint":
		slug := friendGiftBlueprints[rand.Intn(len(friendGiftBlueprints))]
		return map[string]any{"slug": slug}, nil
	default:
		return nil, errors.New("unknown gift kind")
	}
}

func friendsGiftSendHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			RecipientID string `json:"recipientId"`
			Kind        string `json:"kind"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		if !areFriends(app, e.Auth.Id, body.RecipientID) {
			return apis.NewForbiddenError("you can only gift a friend", nil)
		}
		today := aestDateKey(time.Now())
		existing, _ := app.FindFirstRecordByFilter(
			"friend_gifts", "sender = {:self} && recipient = {:other} && gift_date = {:day}",
			dbx.Params{"self": e.Auth.Id, "other": body.RecipientID, "day": today},
		)
		if existing != nil {
			return apis.NewApiError(http.StatusConflict, "you already sent this friend a gift today", nil)
		}

		payload, err := rollGiftPayload(body.Kind)
		if err != nil {
			return apis.NewBadRequestError(err.Error(), nil)
		}

		col, err := app.FindCollectionByNameOrId("friend_gifts")
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "server misconfiguration", nil)
		}
		rec := core.NewRecord(col)
		rec.Set("sender", e.Auth.Id)
		rec.Set("recipient", body.RecipientID)
		rec.Set("gift_date", today)
		rec.Set("kind", body.Kind)
		rec.Set("payload", payload)
		rec.Set("claimed", false)
		if err := app.Save(rec); err != nil {
			log.Printf("friends: failed to save gift: %v", err)
			return apis.NewApiError(http.StatusInternalServerError, "failed to send gift", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"ok": true, "giftId": rec.Id})
	}
}

func friendsGiftInboxHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		records, err := app.FindRecordsByFilter(
			"friend_gifts", "recipient = {:self} && claimed = false", "-created", 50, 0,
			dbx.Params{"self": e.Auth.Id},
		)
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to load gifts", nil)
		}
		gifts := make([]map[string]any, 0, len(records))
		for _, rec := range records {
			sender, err := loadUser(app, rec.GetString("sender"))
			senderName := rec.GetString("sender")
			if err == nil {
				senderName = usernameFromUser(sender)
			}
			gifts = append(gifts, map[string]any{
				"id":         rec.Id,
				"from":       senderName,
				"kind":       rec.GetString("kind"),
				"payload":    rec.Get("payload"),
				"receivedAt": rec.GetDateTime("created").String(),
			})
		}
		return e.JSON(http.StatusOK, map[string]any{"gifts": gifts})
	}
}

func friendsGiftClaimHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			GiftID string `json:"giftId"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		rec, err := app.FindRecordById("friend_gifts", body.GiftID)
		if err != nil {
			return apis.NewNotFoundError("gift not found", nil)
		}
		if rec.GetString("recipient") != e.Auth.Id {
			return apis.NewForbiddenError("not your gift", nil)
		}
		if rec.GetBool("claimed") {
			return apis.NewApiError(http.StatusConflict, "already claimed", nil)
		}
		rec.Set("claimed", true)
		if err := app.Save(rec); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to claim gift", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{
			"kind":    rec.GetString("kind"),
			"payload": rec.Get("payload"),
		})
	}
}
