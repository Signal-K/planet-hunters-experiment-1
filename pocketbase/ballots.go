package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// SSL-757: community ballots. Two categories, astronomy and launch, shown on the
// Community research screen.
//
//   - Ballot content is editorial. Rows in community_ballots are seeded once
//     (seedBallots) and edited afterwards in the PocketBase admin, so verified
//     dates can change without an app release. Seeding never overwrites a row.
//   - One vote per player per ballot: community_votes has a unique index on
//     (user, ballot_key) and a vote is an upsert, so the last choice counts and a
//     replayed request cannot inflate a total.
//   - The server decides when voting is open (opens_at / closes_at), never the client.
//   - Counts are withheld until the caller has voted or the ballot is closed, so the
//     running total does not steer the vote.
//   - The winner is computed from the counts, not stored, unless an admin sets
//     winner_option (for example when a launch scrubs). A tie goes to the option that
//     comes first in the ballot, which is listed in date order.
//   - Both collections are superuser-only through the records API; every player path
//     goes through /api/community/ballots and /api/community/vote.
//
// Mirrors web/lib/community/ballots.ts.

const (
	ballotStatusPending = "pending" // not open to votes yet (options are shown for context only)
	ballotStatusOpen    = "open"
	ballotStatusClosed  = "closed"
)

var ballotCategories = map[string]bool{"astronomy": true, "launch": true}

type ballotPolicy struct {
	// Template is what the community builds next if this option wins.
	Template string `json:"template"`
	// FocusRef names the event or mission the build is for.
	FocusRef string `json:"focusRef"`
}

type ballotOption struct {
	ID          string       `json:"id"`
	Label       string       `json:"label"`
	Detail      string       `json:"detail"`
	WindowStart string       `json:"windowStart"`
	WindowEnd   string       `json:"windowEnd,omitempty"`
	SourceLabel string       `json:"sourceLabel"`
	SourceURL   string       `json:"sourceUrl"`
	VerifiedAt  string       `json:"verifiedAt,omitempty"`
	Policy      ballotPolicy `json:"policy"`
}

type ballotRow struct {
	Key           string
	Category      string
	Title         string
	Blurb         string
	Disclaimer    string
	Status        string
	OpensAt       time.Time
	ClosesAt      time.Time
	DefaultOption string
	WinnerOption  string
	Options       []ballotOption
}

// ballotPhase is the state a player sees. A ballot is open only inside its window.
func ballotPhase(b ballotRow, now time.Time) string {
	if b.Status == ballotStatusPending {
		return ballotStatusPending
	}
	if !b.OpensAt.IsZero() && now.Before(b.OpensAt) {
		return ballotStatusPending
	}
	if !b.ClosesAt.IsZero() && !now.Before(b.ClosesAt) {
		return ballotStatusClosed
	}
	if b.Status == ballotStatusClosed {
		return ballotStatusClosed
	}
	return ballotStatusOpen
}

var (
	errBallotNotOpen   = errors.New("voting is not open")
	errBallotUnknownOp = errors.New("unknown option")
)

// validateVote reports whether optionID can be chosen on b at now.
func validateVote(b ballotRow, optionID string, now time.Time) error {
	if ballotPhase(b, now) != ballotStatusOpen {
		return errBallotNotOpen
	}
	for _, o := range b.Options {
		if o.ID == optionID {
			return nil
		}
	}
	return errBallotUnknownOp
}

// pickWinner returns the winning option id. An admin override wins; otherwise the
// highest count, ties to the earlier option in the list. Empty when nobody voted.
func pickWinner(b ballotRow, counts map[string]int) string {
	if b.WinnerOption != "" {
		return b.WinnerOption
	}
	best, bestN := "", 0
	for _, o := range b.Options {
		if n := counts[o.ID]; n > bestN {
			best, bestN = o.ID, n
		}
	}
	return best
}

type ballotView struct {
	Key           string         `json:"key"`
	Category      string         `json:"category"`
	Title         string         `json:"title"`
	Blurb         string         `json:"blurb"`
	Disclaimer    string         `json:"disclaimer"`
	Phase         string         `json:"phase"`
	OpensAt       int64          `json:"opensAt"`
	ClosesAt      int64          `json:"closesAt"`
	DefaultOption string         `json:"defaultOption,omitempty"`
	Options       []ballotOption `json:"options"`
	MyVote        string         `json:"myVote,omitempty"`
	Counts        map[string]int `json:"counts,omitempty"`
	Total         int            `json:"total,omitempty"`
	Winner        string         `json:"winner,omitempty"`
}

// viewBallot builds the player-facing shape. counts is withheld until the caller has
// voted or the ballot is closed.
func viewBallot(b ballotRow, now time.Time, myVote string, counts map[string]int) ballotView {
	phase := ballotPhase(b, now)
	v := ballotView{
		Key: b.Key, Category: b.Category, Title: b.Title, Blurb: b.Blurb, Disclaimer: b.Disclaimer,
		Phase: phase, DefaultOption: b.DefaultOption, Options: b.Options, MyVote: myVote,
	}
	if !b.OpensAt.IsZero() {
		v.OpensAt = b.OpensAt.UnixMilli()
	}
	if !b.ClosesAt.IsZero() {
		v.ClosesAt = b.ClosesAt.UnixMilli()
	}
	if phase == ballotStatusPending {
		return v
	}
	if phase == ballotStatusClosed || myVote != "" {
		v.Counts = counts
		for _, n := range counts {
			v.Total += n
		}
	}
	if phase == ballotStatusClosed {
		v.Winner = pickWinner(b, counts)
	}
	return v
}

func ensureBallotCollections(app core.App) {
	if _, err := app.FindCollectionByNameOrId("community_ballots"); err != nil {
		col := core.NewBaseCollection("community_ballots")
		col.ListRule, col.ViewRule, col.CreateRule, col.UpdateRule, col.DeleteRule = nil, nil, nil, nil, nil
		col.Fields.Add(&core.TextField{Name: "key", Required: true, Max: 60})
		col.Fields.Add(&core.SelectField{Name: "category", Required: true, MaxSelect: 1, Values: []string{"astronomy", "launch"}})
		col.Fields.Add(&core.TextField{Name: "title", Required: true, Max: 120})
		col.Fields.Add(&core.TextField{Name: "blurb", Max: 400})
		col.Fields.Add(&core.TextField{Name: "disclaimer", Max: 300})
		col.Fields.Add(&core.SelectField{Name: "status", Required: true, MaxSelect: 1, Values: []string{ballotStatusPending, ballotStatusOpen, ballotStatusClosed}})
		col.Fields.Add(&core.DateField{Name: "opens_at"})
		col.Fields.Add(&core.DateField{Name: "closes_at"})
		col.Fields.Add(&core.TextField{Name: "default_option", Max: 60})
		col.Fields.Add(&core.TextField{Name: "winner_option", Max: 60})
		col.Fields.Add(&core.JSONField{Name: "options", MaxSize: 20000})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_community_ballots_key ON community_ballots (key)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save community_ballots: %v", err)
		}
	}
	if _, err := app.FindCollectionByNameOrId("community_votes"); err != nil {
		col := core.NewBaseCollection("community_votes")
		col.ListRule, col.ViewRule, col.CreateRule, col.UpdateRule, col.DeleteRule = nil, nil, nil, nil, nil
		col.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "ballot_key", Required: true, Max: 60})
		col.Fields.Add(&core.TextField{Name: "option_id", Required: true, Max: 60})
		col.Fields.Add(&core.DateField{Name: "voted_at"})
		col.Indexes = []string{
			"CREATE UNIQUE INDEX idx_community_votes_user_ballot ON community_votes (user, ballot_key)",
			"CREATE INDEX idx_community_votes_ballot ON community_votes (ballot_key)",
		}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save community_votes: %v", err)
		}
	}
	seedBallots(app)
}

func mustTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return t
}

// seedBallots inserts the launch ballots that ship with the app. A ballot that already
// exists is left alone, so edits made in the admin are never overwritten.
func seedBallots(app core.App) {
	col, err := app.FindCollectionByNameOrId("community_ballots")
	if err != nil {
		return
	}
	for _, b := range initialBallots() {
		if existing, _ := app.FindFirstRecordByFilter("community_ballots", "key = {:k}", dbx.Params{"k": b.Key}); existing != nil {
			continue
		}
		rec := core.NewRecord(col)
		rec.Set("key", b.Key)
		rec.Set("category", b.Category)
		rec.Set("title", b.Title)
		rec.Set("blurb", b.Blurb)
		rec.Set("disclaimer", b.Disclaimer)
		rec.Set("status", b.Status)
		if !b.OpensAt.IsZero() {
			rec.Set("opens_at", b.OpensAt)
		}
		if !b.ClosesAt.IsZero() {
			rec.Set("closes_at", b.ClosesAt)
		}
		rec.Set("default_option", b.DefaultOption)
		rec.Set("options", b.Options)
		if err := app.Save(rec); err != nil {
			log.Printf("failed to seed ballot %s: %v", b.Key, err)
		}
	}
}

// initialBallots is the 4 Nov 2026 content. Dates are computed by Astronomy Engine (the
// source Atlas uses) and checked against a second source on 4 Nov; the launch is not yet
// confirmed by the operator, so it carries no verifiedAt.
func initialBallots() []ballotRow {
	const astroDisclaimer = "Dates come from published sky calendars."
	return []ballotRow{
		{
			Key:        "astronomy-2026-11",
			Category:   "astronomy",
			Title:      "What should we observe next?",
			Blurb:      "The winner sets what we build next.",
			Disclaimer: astroDisclaimer,
			Status:     ballotStatusOpen,
			OpensAt:    mustTime("2026-11-04T00:00:00Z"),
			ClosesAt:   mustTime("2026-11-09T00:00:00Z"),
			Options: []ballotOption{
				{
					ID: "geminids-2026", Label: "Geminids meteor shower",
					Detail:      "Peak night 13 to 14 December. Dark skies, and GEM-1 is ready.",
					WindowStart: "2026-12-13", WindowEnd: "2026-12-15",
					SourceLabel: "IMO meteor calendar, checked against EarthSky", SourceURL: "https://www.imo.net/resources/calendar/", VerifiedAt: "2026-11-04",
					Policy: ballotPolicy{Template: "observatory-instrument", FocusRef: "geminids-2026"},
				},
				{
					ID: "jupiter-opposition-2027", Label: "Jupiter at opposition",
					Detail:      "Brightest of the year, up all night.",
					WindowStart: "2027-02-11",
					SourceLabel: "Astronomy Engine, checked against EarthSky", SourceURL: "https://earthsky.org/astronomy-essentials/jupiter-at-opposition/", VerifiedAt: "2026-11-04",
					Policy: ballotPolicy{Template: "observatory-instrument", FocusRef: "jupiter-opposition-2027"},
				},
				{
					ID: "mars-opposition-2027", Label: "Mars at opposition",
					Detail:      "Closest in two years. A bright Moon dims the sky.",
					WindowStart: "2027-02-19",
					SourceLabel: "Astronomy Engine, checked against Sky at Night", SourceURL: "https://skyatnightmagazine.com/advice/skills/mars-opposition", VerifiedAt: "2026-11-04",
					Policy: ballotPolicy{Template: "observatory-instrument", FocusRef: "mars-opposition-2027"},
				},
			},
		},
		{
			Key:           "launch-2026-11",
			Category:      "launch",
			Title:         "Which launch do we follow next?",
			Blurb:         "We follow Electron first.",
			Disclaimer:    "Launch dates change often.",
			Status:        ballotStatusPending,
			DefaultOption: "electron-mountain-god-rises",
			Options: []ballotOption{
				{
					ID: "electron-mountain-god-rises", Label: "Electron: The Mountain God Rises",
					Detail:      "Rocket Lab, from New Zealand. Planned 10 November, time to be confirmed.",
					WindowStart: "2026-11-10",
					SourceLabel: "Launch Library 2 listing, not yet confirmed by Rocket Lab", SourceURL: "https://www.spacelaunchschedule.com/launch/electron-the-mountain-god-rises-iqps-launch-10/",
					Policy: ballotPolicy{Template: "spaceport-launch-site", FocusRef: "electron-mountain-god-rises"},
				},
			},
		},
	}
}

func ballotFromRecord(rec *core.Record) ballotRow {
	b := ballotRow{
		Key: rec.GetString("key"), Category: rec.GetString("category"), Title: rec.GetString("title"),
		Blurb: rec.GetString("blurb"), Disclaimer: rec.GetString("disclaimer"), Status: rec.GetString("status"),
		DefaultOption: rec.GetString("default_option"), WinnerOption: rec.GetString("winner_option"),
	}
	if d := rec.GetDateTime("opens_at"); !d.IsZero() {
		b.OpensAt = d.Time()
	}
	if d := rec.GetDateTime("closes_at"); !d.IsZero() {
		b.ClosesAt = d.Time()
	}
	raw, _ := json.Marshal(rec.GetRaw("options"))
	// A malformed options value yields no options rather than an error, so one bad
	// admin edit cannot take the whole screen down.
	_ = json.Unmarshal(raw, &b.Options)
	return b
}

func ballotCounts(app core.App, key string) (map[string]int, error) {
	rows := []struct {
		Option string `db:"option_id"`
		N      int    `db:"n"`
	}{}
	err := app.DB().
		NewQuery("SELECT option_id, COUNT(*) AS n FROM community_votes WHERE ballot_key = {:k} GROUP BY option_id").
		Bind(dbx.Params{"k": key}).
		All(&rows)
	if err != nil {
		return nil, err
	}
	out := map[string]int{}
	for _, r := range rows {
		out[r.Option] = r.N
	}
	return out, nil
}

func myBallotVote(app core.App, userID, key string) string {
	rec, _ := app.FindFirstRecordByFilter("community_votes", "user = {:u} && ballot_key = {:k}", dbx.Params{"u": userID, "k": key})
	if rec == nil {
		return ""
	}
	return rec.GetString("option_id")
}

func loadBallot(app core.App, key string) (ballotRow, error) {
	rec, err := app.FindFirstRecordByFilter("community_ballots", "key = {:k}", dbx.Params{"k": key})
	if err != nil {
		return ballotRow{}, err
	}
	return ballotFromRecord(rec), nil
}

func ballotViewFor(app core.App, b ballotRow, userID string, now time.Time) (ballotView, error) {
	mine := myBallotVote(app, userID, b.Key)
	counts, err := ballotCounts(app, b.Key)
	if err != nil {
		return ballotView{}, err
	}
	return viewBallot(b, now, mine, counts), nil
}

func communityBallotsHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		now := time.Now().UTC()
		recs, err := app.FindRecordsByFilter("community_ballots", "category != ''", "-opens_at", 20, 0)
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to load ballots", nil)
		}
		views := []ballotView{}
		for _, rec := range recs {
			b := ballotFromRecord(rec)
			if !ballotCategories[b.Category] {
				continue
			}
			v, err := ballotViewFor(app, b, e.Auth.Id, now)
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "failed to count votes", nil)
			}
			views = append(views, v)
		}
		sort.SliceStable(views, func(i, j int) bool { return views[i].Category < views[j].Category })
		return e.JSON(http.StatusOK, map[string]any{"ballots": views, "now": now.UnixMilli()})
	}
}

func communityVoteHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			Ballot string `json:"ballot"`
			Option string `json:"option"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		body.Ballot, body.Option = strings.TrimSpace(body.Ballot), strings.TrimSpace(body.Option)
		b, err := loadBallot(app, body.Ballot)
		if err != nil {
			return apis.NewNotFoundError("unknown ballot", nil)
		}
		now := time.Now().UTC()
		if err := validateVote(b, body.Option, now); err != nil {
			return apis.NewBadRequestError(err.Error(), nil)
		}
		if err := saveVote(app, e.Auth.Id, b.Key, body.Option, now); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to save vote", nil)
		}
		v, err := ballotViewFor(app, b, e.Auth.Id, now)
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to count votes", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"ballot": v})
	}
}

// saveVote is an upsert on (user, ballot_key). If two requests race to create the first
// row, the unique index rejects the loser, which then updates the winner's row.
func saveVote(app core.App, userID, key, option string, now time.Time) error {
	return app.RunInTransaction(func(tx core.App) error {
		rec, _ := tx.FindFirstRecordByFilter("community_votes", "user = {:u} && ballot_key = {:k}", dbx.Params{"u": userID, "k": key})
		if rec == nil {
			col, err := tx.FindCollectionByNameOrId("community_votes")
			if err != nil {
				return err
			}
			rec = core.NewRecord(col)
			rec.Set("user", userID)
			rec.Set("ballot_key", key)
		}
		rec.Set("option_id", option)
		rec.Set("voted_at", types.NowDateTime())
		return tx.Save(rec)
	})
}
