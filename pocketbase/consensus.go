package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// SSL-746: the consensus area. A player asks the community to check one of their own
// classifications; any other player can review it.
//
//   - A request carries the requester's whole instrument readout (marks, measured values,
//     the fold they used, settings) as opaque JSON. The server never interprets it.
//   - Reviewers do their own work first. The requester's readout is only released by
//     /consensus/reveal, which needs the reviewer's own readout for the same subject.
//     A verdict is only accepted from a player who has revealed, so support cannot be a
//     rubber stamp on an answer they have not worked out themselves.
//   - Reviewers never see running counts (a total would herd the vote). Requesters do.
//   - The verification threshold slides with the number of regular players: supports
//     needed = ceil(log2(active+1)) clamped to 3..9, where "active" is players whose save
//     changed in the last 30 days. A verified request also needs few disputes.
//   - Both collections are superuser-only through the records API; every player path goes
//     through /api/community/consensus*. Votes are an upsert on (user, request), so a
//     replay from the offline outbox cannot inflate a count.
//
// Mirrors web/lib/community/consensus.ts.

const (
	consensusMinRequired = 3
	consensusMaxRequired = 9
	consensusActiveDays  = 30
	consensusReadoutMax  = 16000

	consensusOpen     = "open"
	consensusVerified = "verified"
	consensusDisputed = "disputed"
)

var consensusProjects = map[string]bool{"tess": true, "asteroid": true, "saturn": true}
var consensusVerdicts = map[string]bool{"support": true, "dispute": true, "unsure": true}

// consensusRequired is how many supports verify a request, given the active player count.
func consensusRequired(active int) int {
	if active < 0 {
		active = 0
	}
	n := int(math.Ceil(math.Log2(float64(active + 1))))
	if n < consensusMinRequired {
		return consensusMinRequired
	}
	if n > consensusMaxRequired {
		return consensusMaxRequired
	}
	return n
}

// consensusState: verified once enough players support it and disputes stay under a third
// of supports; disputed once enough players dispute it and they outnumber supports.
func consensusState(supports, disputes, required int) string {
	if supports >= required && disputes*3 <= supports {
		return consensusVerified
	}
	if disputes >= required && disputes > supports {
		return consensusDisputed
	}
	return consensusOpen
}

func ensureConsensusCollections(app core.App) {
	if _, err := app.FindCollectionByNameOrId("consensus_requests"); err != nil {
		col := core.NewBaseCollection("consensus_requests")
		col.ListRule, col.ViewRule, col.CreateRule, col.UpdateRule, col.DeleteRule = nil, nil, nil, nil, nil
		col.Fields.Add(&core.TextField{Name: "requester", Required: true, Max: 64})
		col.Fields.Add(&core.SelectField{Name: "project", Required: true, MaxSelect: 1, Values: []string{"tess", "asteroid", "saturn"}})
		col.Fields.Add(&core.TextField{Name: "subject_id", Required: true, Max: 120})
		col.Fields.Add(&core.JSONField{Name: "readout", MaxSize: consensusReadoutMax})
		col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_consensus_requests_subject ON consensus_requests (requester, project, subject_id)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save consensus_requests: %v", err)
		}
	}
	if _, err := app.FindCollectionByNameOrId("consensus_votes"); err != nil {
		col := core.NewBaseCollection("consensus_votes")
		col.ListRule, col.ViewRule, col.CreateRule, col.UpdateRule, col.DeleteRule = nil, nil, nil, nil, nil
		col.Fields.Add(&core.TextField{Name: "user", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "request", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "verdict", Max: 12}) // empty until the reviewer has decided
		col.Fields.Add(&core.TextField{Name: "reason", Max: 400})
		col.Fields.Add(&core.JSONField{Name: "own_readout", MaxSize: consensusReadoutMax})
		col.Fields.Add(&core.DateField{Name: "voted_at"})
		col.Indexes = []string{
			"CREATE UNIQUE INDEX idx_consensus_votes_user_request ON consensus_votes (user, request)",
			"CREATE INDEX idx_consensus_votes_request ON consensus_votes (request)",
		}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save consensus_votes: %v", err)
		}
	}
}

type consensusVoteView struct {
	Verdict string `json:"verdict"`
	Reason  string `json:"reason,omitempty"`
}

type consensusRequestView struct {
	ID        string              `json:"id"`
	Project   string              `json:"project"`
	SubjectID string              `json:"subjectId"`
	State     string              `json:"state"`
	Supports  int                 `json:"supports"`
	Disputes  int                 `json:"disputes"`
	Unsure    int                 `json:"unsure"`
	Required  int                 `json:"required"`
	Readout   json.RawMessage     `json:"readout"`
	Reviews   []consensusVoteView `json:"reviews"`
	CreatedAt string              `json:"createdAt"`
}

// consensusQueueItem is what a reviewer sees before doing their own work: the subject, never
// the requester's readout or any tally.
type consensusQueueItem struct {
	ID        string `json:"id"`
	Project   string `json:"project"`
	SubjectID string `json:"subjectId"`
	CreatedAt string `json:"createdAt"`
	Revealed  bool   `json:"revealed"`
}

func activePlayers(app core.App, now time.Time) int {
	since := now.AddDate(0, 0, -consensusActiveDays).Format("2006-01-02 15:04:05.000Z")
	n, err := app.CountRecords("game_states", dbx.NewExp("updated >= {:t}", dbx.Params{"t": since}))
	if err != nil {
		return 0
	}
	return int(n)
}

func viewConsensusRequest(app core.App, rec *core.Record, required int) (consensusRequestView, error) {
	votes, err := app.FindRecordsByFilter("consensus_votes", "request = {:r} && verdict != ''", "voted_at", 500, 0, dbx.Params{"r": rec.Id})
	if err != nil {
		return consensusRequestView{}, err
	}
	v := consensusRequestView{
		ID: rec.Id, Project: rec.GetString("project"), SubjectID: rec.GetString("subject_id"),
		Required: required, Readout: json.RawMessage(rec.GetString("readout")), CreatedAt: rec.GetString("created"),
		Reviews: []consensusVoteView{},
	}
	if len(v.Readout) == 0 {
		v.Readout = json.RawMessage("null")
	}
	for _, vote := range votes {
		verdict := vote.GetString("verdict")
		switch verdict {
		case "support":
			v.Supports++
		case "dispute":
			v.Disputes++
		default:
			v.Unsure++
		}
		v.Reviews = append(v.Reviews, consensusVoteView{Verdict: verdict, Reason: vote.GetString("reason")})
	}
	v.State = consensusState(v.Supports, v.Disputes, required)
	return v, nil
}

func validReadout(raw json.RawMessage) bool {
	s := strings.TrimSpace(string(raw))
	return s != "" && s != "null" && len(raw) <= consensusReadoutMax && json.Valid(raw)
}

func consensusOverviewHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		now := time.Now().UTC()
		active := activePlayers(app, now)
		required := consensusRequired(active)
		mineRecs, err := app.FindRecordsByFilter("consensus_requests", "requester = {:u}", "-created", 50, 0, dbx.Params{"u": e.Auth.Id})
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to load requests", nil)
		}
		mine := make([]consensusRequestView, 0, len(mineRecs))
		for _, rec := range mineRecs {
			v, err := viewConsensusRequest(app, rec, required)
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "failed to count votes", nil)
			}
			mine = append(mine, v)
		}
		others, err := app.FindRecordsByFilter("consensus_requests", "requester != {:u}", "-created", 100, 0, dbx.Params{"u": e.Auth.Id})
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to load queue", nil)
		}
		queue := []consensusQueueItem{}
		for _, rec := range others {
			mineVote, _ := app.FindFirstRecordByFilter("consensus_votes", "user = {:u} && request = {:r}", dbx.Params{"u": e.Auth.Id, "r": rec.Id})
			if mineVote != nil && mineVote.GetString("verdict") != "" {
				continue // already reviewed
			}
			v, err := viewConsensusRequest(app, rec, required)
			if err != nil || v.State != consensusOpen {
				continue // settled requests leave the queue
			}
			queue = append(queue, consensusQueueItem{
				ID: rec.Id, Project: v.Project, SubjectID: v.SubjectID, CreatedAt: v.CreatedAt, Revealed: mineVote != nil,
			})
			if len(queue) >= 20 {
				break
			}
		}
		return e.JSON(http.StatusOK, map[string]any{"required": required, "activePlayers": active, "mine": mine, "queue": queue})
	}
}

func consensusRequestHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			Project   string          `json:"project"`
			SubjectID string          `json:"subjectId"`
			Readout   json.RawMessage `json:"readout"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		body.SubjectID = strings.TrimSpace(body.SubjectID)
		if !consensusProjects[body.Project] || body.SubjectID == "" || len(body.SubjectID) > 120 {
			return apis.NewBadRequestError("unknown project or subject", nil)
		}
		if !validReadout(body.Readout) {
			return apis.NewBadRequestError("a readout is required", nil)
		}
		col, err := app.FindCollectionByNameOrId("consensus_requests")
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "consensus unavailable", nil)
		}
		// One request per player per subject. Asking again refreshes the readout and keeps the
		// reviews already given only if the readout is unchanged; a changed readout starts over.
		rec, _ := app.FindFirstRecordByFilter("consensus_requests", "requester = {:u} && project = {:p} && subject_id = {:s}",
			dbx.Params{"u": e.Auth.Id, "p": body.Project, "s": body.SubjectID})
		if rec == nil {
			rec = core.NewRecord(col)
			rec.Set("requester", e.Auth.Id)
			rec.Set("project", body.Project)
			rec.Set("subject_id", body.SubjectID)
		} else if string(body.Readout) != rec.GetString("readout") {
			if old, err := app.FindRecordsByFilter("consensus_votes", "request = {:r}", "", 1000, 0, dbx.Params{"r": rec.Id}); err == nil {
				for _, vote := range old {
					_ = app.Delete(vote)
				}
			}
		}
		rec.Set("readout", body.Readout)
		if err := app.Save(rec); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to save request", nil)
		}
		required := consensusRequired(activePlayers(app, time.Now().UTC()))
		v, err := viewConsensusRequest(app, rec, required)
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to count votes", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"request": v})
	}
}

func loadOthersRequest(app core.App, id, userID string) (*core.Record, error) {
	rec, err := app.FindRecordById("consensus_requests", id)
	if err != nil {
		return nil, apis.NewNotFoundError("unknown request", nil)
	}
	if rec.GetString("requester") == userID {
		return nil, apis.NewBadRequestError("you cannot review your own request", nil)
	}
	return rec, nil
}

// consensusRevealHandler records the reviewer's own readout, then releases the requester's.
func consensusRevealHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			Request string          `json:"request"`
			Readout json.RawMessage `json:"readout"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		rec, err := loadOthersRequest(app, strings.TrimSpace(body.Request), e.Auth.Id)
		if err != nil {
			return err
		}
		if !validReadout(body.Readout) {
			return apis.NewBadRequestError("do the work yourself first: your own readout is required", nil)
		}
		vote, _ := app.FindFirstRecordByFilter("consensus_votes", "user = {:u} && request = {:r}", dbx.Params{"u": e.Auth.Id, "r": rec.Id})
		if vote == nil {
			col, err := app.FindCollectionByNameOrId("consensus_votes")
			if err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "consensus unavailable", nil)
			}
			vote = core.NewRecord(col)
			vote.Set("user", e.Auth.Id)
			vote.Set("request", rec.Id)
			vote.Set("own_readout", body.Readout)
			if err := app.Save(vote); err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "failed to save", nil)
			}
		}
		return e.JSON(http.StatusOK, map[string]any{
			"request": map[string]any{
				"id": rec.Id, "project": rec.GetString("project"), "subjectId": rec.GetString("subject_id"),
				"readout": json.RawMessage(rec.GetString("readout")),
			},
		})
	}
}

func consensusVoteHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			Request string `json:"request"`
			Verdict string `json:"verdict"`
			Reason  string `json:"reason"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		body.Verdict, body.Reason = strings.TrimSpace(body.Verdict), strings.TrimSpace(body.Reason)
		if !consensusVerdicts[body.Verdict] {
			return apis.NewBadRequestError("verdict must be support, dispute or unsure", nil)
		}
		if body.Verdict == "dispute" && len(body.Reason) < 3 {
			return apis.NewBadRequestError("a dispute needs a reason", nil)
		}
		if len(body.Reason) > 400 {
			body.Reason = body.Reason[:400]
		}
		rec, err := loadOthersRequest(app, strings.TrimSpace(body.Request), e.Auth.Id)
		if err != nil {
			return err
		}
		vote, _ := app.FindFirstRecordByFilter("consensus_votes", "user = {:u} && request = {:r}", dbx.Params{"u": e.Auth.Id, "r": rec.Id})
		if vote == nil {
			return apis.NewBadRequestError("review the subject yourself before voting", nil)
		}
		vote.Set("verdict", body.Verdict)
		vote.Set("reason", body.Reason)
		vote.Set("voted_at", types.NowDateTime())
		if err := app.Save(vote); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to save vote", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"ok": true})
	}
}
