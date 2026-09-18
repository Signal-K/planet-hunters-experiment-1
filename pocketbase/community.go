package main

import (
	"log"
	"net/http"
	"strings"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// SSL-320: community layer — shared bases, read-only world visits, creations
// and discoveries in one hub. Rules live in ZenNotes
// `projects/landnam/decisions/shared-worlds-and-community-hub.md`:
//
//   - A visit is read-only by construction. This file exposes no route that
//     mutates another player's game_states record, so griefing is impossible
//     rather than moderated.
//   - Friends see `friends` and `public` shares; strangers see only `public`.
//     The filter is applied server-side (areFriends) rather than in a
//     PocketBase rule, because rule-level friendship joins are not expressible
//     without a denormalised friends list.
//   - The collections are superuser-only through the records API; every
//     player path goes through these routes.
//   - Strangers may comment on public posts (decided 2026-09-19). The
//     counterweight is moderation by construction: fixed report reasons, one
//     report per player per comment, automatic hide at commentHideAfterReports
//     distinct reports, and removal by the comment author or the post author.

const (
	shareTitleMax           = 64
	shareSummaryMax         = 280
	shareCommentMax         = 500
	feedLimitMax            = 100
	commentHideAfterReports = 3
)

// Mirrors web/lib/data/community.ts REPORT_REASONS.
var reportReasons = map[string]bool{"abuse": true, "spam": true, "off-topic": true, "personal": true}

var shareKinds = map[string]string{
	"base":      "creations",
	"creation":  "creations",
	"discovery": "discoveries",
	"world":     "worlds",
}

var shareVisibilities = map[string]bool{"private": true, "friends": true, "public": true}

func ensureCommunityCollections(app core.App) {
	if _, err := app.FindCollectionByNameOrId("share_posts"); err != nil {
		col := core.NewBaseCollection("share_posts")
		col.ListRule = nil
		col.ViewRule = nil
		col.CreateRule = nil
		col.UpdateRule = nil
		col.DeleteRule = nil
		col.Fields.Add(&core.TextField{Name: "author", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "author_name", Max: 80})
		col.Fields.Add(&core.TextField{Name: "kind", Required: true, Max: 20})
		col.Fields.Add(&core.TextField{Name: "programme_id", Required: true, Max: 80})
		col.Fields.Add(&core.TextField{Name: "title", Required: true, Max: shareTitleMax})
		col.Fields.Add(&core.TextField{Name: "summary", Max: shareSummaryMax})
		col.Fields.Add(&core.TextField{Name: "visibility", Required: true, Max: 10})
		col.Fields.Add(&core.TextField{Name: "target_id", Max: 100})
		col.Fields.Add(&core.TextField{Name: "division_id", Max: 120})
		col.Fields.Add(&core.JSONField{Name: "snapshot", MaxSize: 60000})
		col.Fields.Add(&core.NumberField{Name: "signal_count"})
		col.Fields.Add(&core.NumberField{Name: "build_count"})
		col.Fields.Add(&core.NumberField{Name: "comment_count"})
		col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		col.Indexes = []string{
			"CREATE INDEX idx_share_posts_author ON share_posts (author)",
			"CREATE INDEX idx_share_posts_kind_created ON share_posts (kind, created)",
		}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save share_posts: %v", err)
		}
	}

	if _, err := app.FindCollectionByNameOrId("share_comments"); err != nil {
		col := core.NewBaseCollection("share_comments")
		col.ListRule = nil
		col.ViewRule = nil
		col.CreateRule = nil
		col.UpdateRule = nil
		col.DeleteRule = nil
		col.Fields.Add(&core.TextField{Name: "post", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "author", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "author_name", Max: 80})
		col.Fields.Add(&core.TextField{Name: "body", Required: true, Max: shareCommentMax})
		col.Fields.Add(&core.NumberField{Name: "report_count"})
		col.Fields.Add(&core.BoolField{Name: "hidden"})
		col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		col.Indexes = []string{"CREATE INDEX idx_share_comments_post ON share_comments (post, created)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save share_comments: %v", err)
		}
	} else {
		ensureCommentModerationFields(app)
	}

	if _, err := app.FindCollectionByNameOrId("share_reports"); err != nil {
		col := core.NewBaseCollection("share_reports")
		col.ListRule = nil
		col.ViewRule = nil
		col.CreateRule = nil
		col.UpdateRule = nil
		col.DeleteRule = nil
		col.Fields.Add(&core.TextField{Name: "comment", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "reporter", Required: true, Max: 64})
		col.Fields.Add(&core.TextField{Name: "reason", Required: true, Max: 20})
		col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_share_reports_once ON share_reports (comment, reporter)"}
		if err := app.Save(col); err != nil {
			log.Printf("failed to save share_reports: %v", err)
		}
	}
}

// ensureCommentModerationFields adds the report/hide columns to a
// share_comments collection created before moderation existed.
func ensureCommentModerationFields(app core.App) {
	col, err := app.FindCollectionByNameOrId("share_comments")
	if err != nil {
		return
	}
	changed := false
	if col.Fields.GetByName("report_count") == nil {
		col.Fields.Add(&core.NumberField{Name: "report_count"})
		changed = true
	}
	if col.Fields.GetByName("hidden") == nil {
		col.Fields.Add(&core.BoolField{Name: "hidden"})
		changed = true
	}
	if changed {
		if err := app.Save(col); err != nil {
			log.Printf("failed to add moderation fields to share_comments: %v", err)
		}
	}
}

func registerCommunityRoutes(app core.App) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		g := se.Router.Group("/api/community")
		g.Bind(apis.RequireAuth("users"))

		g.GET("/feed", communityFeedHandler(app))
		g.POST("/share", communityShareHandler(app))
		g.POST("/react", communityReactHandler(app))
		g.GET("/comments/{postId}", communityCommentsHandler(app))
		g.POST("/comment", communityCommentHandler(app))
		g.POST("/comment/{commentId}/remove", communityCommentRemoveHandler(app))
		g.POST("/report", communityReportHandler(app))
		g.GET("/world/{friendId}", communityWorldHandler(app))

		return se.Next()
	})
}

// canSeePost mirrors web/lib/data/community.ts `visibleTo`.
func canSeePost(app core.App, viewerID string, post *core.Record) bool {
	if post.GetString("author") == viewerID {
		return true
	}
	switch post.GetString("visibility") {
	case "public":
		return true
	case "friends":
		return areFriends(app, viewerID, post.GetString("author"))
	default:
		return false
	}
}

func sharePostJSON(post *core.Record) map[string]any {
	return map[string]any{
		"id":           post.Id,
		"kind":         post.GetString("kind"),
		"programmeId":  post.GetString("programme_id"),
		"authorId":     post.GetString("author"),
		"authorName":   post.GetString("author_name"),
		"title":        post.GetString("title"),
		"summary":      post.GetString("summary"),
		"visibility":   post.GetString("visibility"),
		"targetId":     post.GetString("target_id"),
		"divisionId":   post.GetString("division_id"),
		"snapshot":     post.Get("snapshot"),
		"reactions":    map[string]any{"signal": post.GetInt("signal_count"), "build": post.GetInt("build_count")},
		"commentCount": post.GetInt("comment_count"),
		"createdAt":    post.GetDateTime("created").Time().UnixMilli(),
	}
}

func communityFeedHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		channel := strings.TrimSpace(e.Request.URL.Query().Get("channel"))
		filter := "1=1"
		params := dbx.Params{}
		if channel != "" && channel != "discussion" {
			kinds := []string{}
			for kind, ch := range shareKinds {
				if ch == channel {
					kinds = append(kinds, kind)
				}
			}
			if len(kinds) == 0 {
				return e.JSON(http.StatusOK, map[string]any{"posts": []any{}})
			}
			parts := make([]string, 0, len(kinds))
			for i, kind := range kinds {
				key := "k" + string(rune('a'+i))
				parts = append(parts, "kind = {:"+key+"}")
				params[key] = kind
			}
			filter = "(" + strings.Join(parts, " || ") + ")"
		}
		records, err := app.FindRecordsByFilter("share_posts", filter, "-created", 400, 0, params)
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to list shares", nil)
		}
		posts := make([]map[string]any, 0, len(records))
		for _, rec := range records {
			if !canSeePost(app, e.Auth.Id, rec) {
				continue
			}
			posts = append(posts, sharePostJSON(rec))
			if len(posts) >= feedLimitMax {
				break
			}
		}
		return e.JSON(http.StatusOK, map[string]any{"posts": posts})
	}
}

func communityShareHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			Kind        string         `json:"kind"`
			ProgrammeID string         `json:"programmeId"`
			Title       string         `json:"title"`
			Summary     string         `json:"summary"`
			Visibility  string         `json:"visibility"`
			TargetID    string         `json:"targetId"`
			DivisionID  string         `json:"divisionId"`
			Snapshot    map[string]any `json:"snapshot"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		if _, ok := shareKinds[body.Kind]; !ok {
			return apis.NewBadRequestError("unknown share kind", nil)
		}
		title := strings.TrimSpace(body.Title)
		if title == "" {
			return apis.NewBadRequestError("a share needs a title", nil)
		}
		if len(title) > shareTitleMax {
			title = title[:shareTitleMax]
		}
		if strings.TrimSpace(body.ProgrammeID) == "" {
			return apis.NewBadRequestError("a share needs a programme id", nil)
		}
		visibility := body.Visibility
		if visibility == "" {
			visibility = "friends"
		}
		if !shareVisibilities[visibility] {
			return apis.NewBadRequestError("unknown visibility", nil)
		}
		summary := strings.TrimSpace(body.Summary)
		if len(summary) > shareSummaryMax {
			summary = summary[:shareSummaryMax]
		}
		col, err := app.FindCollectionByNameOrId("share_posts")
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "share_posts missing", nil)
		}
		rec := core.NewRecord(col)
		rec.Set("author", e.Auth.Id)
		rec.Set("author_name", usernameFromUser(e.Auth))
		rec.Set("kind", body.Kind)
		rec.Set("programme_id", strings.TrimSpace(body.ProgrammeID))
		rec.Set("title", title)
		rec.Set("summary", summary)
		rec.Set("visibility", visibility)
		rec.Set("target_id", strings.TrimSpace(body.TargetID))
		rec.Set("division_id", strings.TrimSpace(body.DivisionID))
		if body.Snapshot == nil {
			body.Snapshot = map[string]any{}
		}
		rec.Set("snapshot", body.Snapshot)
		if err := app.Save(rec); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to save share", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"post": sharePostJSON(rec)})
	}
}

func communityReactHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			PostID   string `json:"postId"`
			Reaction string `json:"reaction"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		field := ""
		switch body.Reaction {
		case "signal":
			field = "signal_count"
		case "build":
			field = "build_count"
		default:
			return apis.NewBadRequestError("unknown reaction", nil)
		}
		post, err := app.FindRecordById("share_posts", body.PostID)
		if err != nil || !canSeePost(app, e.Auth.Id, post) {
			return apis.NewNotFoundError("share not found", nil)
		}
		post.Set(field, post.GetInt(field)+1)
		if err := app.Save(post); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to react", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"post": sharePostJSON(post)})
	}
}

func communityCommentsHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		postID := e.Request.PathValue("postId")
		post, err := app.FindRecordById("share_posts", postID)
		if err != nil || !canSeePost(app, e.Auth.Id, post) {
			return apis.NewNotFoundError("share not found", nil)
		}
		records, err := app.FindRecordsByFilter("share_comments", "post = {:post} && hidden = false", "created", 200, 0, dbx.Params{"post": postID})
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to list comments", nil)
		}
		comments := make([]map[string]any, 0, len(records))
		for _, rec := range records {
			comments = append(comments, map[string]any{
				"id":          rec.Id,
				"postId":      postID,
				"authorId":    rec.GetString("author"),
				"authorName":  rec.GetString("author_name"),
				"body":        rec.GetString("body"),
				"createdAt":   rec.GetDateTime("created").Time().UnixMilli(),
				"reportCount": rec.GetInt("report_count"),
			})
		}
		return e.JSON(http.StatusOK, map[string]any{"comments": comments})
	}
}

func communityCommentHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			PostID string `json:"postId"`
			Body   string `json:"body"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		text := strings.TrimSpace(body.Body)
		if text == "" {
			return apis.NewBadRequestError("a comment needs a body", nil)
		}
		if len(text) > shareCommentMax {
			text = text[:shareCommentMax]
		}
		post, err := app.FindRecordById("share_posts", body.PostID)
		if err != nil || !canSeePost(app, e.Auth.Id, post) {
			return apis.NewNotFoundError("share not found", nil)
		}
		col, err := app.FindCollectionByNameOrId("share_comments")
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "share_comments missing", nil)
		}
		rec := core.NewRecord(col)
		rec.Set("post", post.Id)
		rec.Set("author", e.Auth.Id)
		rec.Set("author_name", usernameFromUser(e.Auth))
		rec.Set("body", text)
		if err := app.Save(rec); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to save comment", nil)
		}
		post.Set("comment_count", post.GetInt("comment_count")+1)
		if err := app.Save(post); err != nil {
			log.Printf("failed to bump comment_count on %s: %v", post.Id, err)
		}
		return e.JSON(http.StatusOK, map[string]any{
			"comment": map[string]any{
				"id":         rec.Id,
				"postId":     post.Id,
				"authorId":   e.Auth.Id,
				"authorName": usernameFromUser(e.Auth),
				"body":       text,
				"createdAt":  rec.GetDateTime("created").Time().UnixMilli(),
			},
		})
	}
}

// communityReportHandler: one report per player per comment, fixed reasons
// only. At commentHideAfterReports distinct reports the comment is hidden
// from every thread and the post's comment count drops.
func communityReportHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var body struct {
			CommentID string `json:"commentId"`
			Reason    string `json:"reason"`
		}
		if err := e.BindBody(&body); err != nil {
			return apis.NewBadRequestError("invalid body", err)
		}
		if !reportReasons[body.Reason] {
			return apis.NewBadRequestError("unknown report reason", nil)
		}
		comment, err := app.FindRecordById("share_comments", body.CommentID)
		if err != nil {
			return apis.NewNotFoundError("comment not found", nil)
		}
		if comment.GetString("author") == e.Auth.Id {
			return apis.NewBadRequestError("you cannot report your own comment", nil)
		}
		post, err := app.FindRecordById("share_posts", comment.GetString("post"))
		if err != nil || !canSeePost(app, e.Auth.Id, post) {
			return apis.NewNotFoundError("comment not found", nil)
		}
		if existing, _ := app.FindFirstRecordByFilter("share_reports", "comment = {:c} && reporter = {:r}", dbx.Params{"c": comment.Id, "r": e.Auth.Id}); existing != nil {
			return e.JSON(http.StatusOK, map[string]any{"reportCount": comment.GetInt("report_count"), "hidden": comment.GetBool("hidden")})
		}
		col, err := app.FindCollectionByNameOrId("share_reports")
		if err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "share_reports missing", nil)
		}
		rec := core.NewRecord(col)
		rec.Set("comment", comment.Id)
		rec.Set("reporter", e.Auth.Id)
		rec.Set("reason", body.Reason)
		if err := app.Save(rec); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to save report", nil)
		}
		count := comment.GetInt("report_count") + 1
		comment.Set("report_count", count)
		hidden := comment.GetBool("hidden")
		if !hidden && count >= commentHideAfterReports {
			hidden = true
			comment.Set("hidden", true)
			post.Set("comment_count", max(0, post.GetInt("comment_count")-1))
			if err := app.Save(post); err != nil {
				log.Printf("failed to drop comment_count on %s: %v", post.Id, err)
			}
		}
		if err := app.Save(comment); err != nil {
			return apis.NewApiError(http.StatusInternalServerError, "failed to record report", nil)
		}
		return e.JSON(http.StatusOK, map[string]any{"reportCount": count, "hidden": hidden})
	}
}

// communityCommentRemoveHandler: the comment author or the post author can
// remove a comment. Removal is a hide, so a report trail survives.
func communityCommentRemoveHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		comment, err := app.FindRecordById("share_comments", e.Request.PathValue("commentId"))
		if err != nil {
			return apis.NewNotFoundError("comment not found", nil)
		}
		post, err := app.FindRecordById("share_posts", comment.GetString("post"))
		if err != nil {
			return apis.NewNotFoundError("comment not found", nil)
		}
		if comment.GetString("author") != e.Auth.Id && post.GetString("author") != e.Auth.Id {
			return apis.NewForbiddenError("only the comment author or the post author can remove this", nil)
		}
		if !comment.GetBool("hidden") {
			comment.Set("hidden", true)
			if err := app.Save(comment); err != nil {
				return apis.NewApiError(http.StatusInternalServerError, "failed to remove comment", nil)
			}
			post.Set("comment_count", max(0, post.GetInt("comment_count")-1))
			if err := app.Save(post); err != nil {
				log.Printf("failed to drop comment_count on %s: %v", post.Id, err)
			}
		}
		return e.JSON(http.StatusOK, map[string]any{"removed": true})
	}
}

// communityWorldHandler is the read-only world visit: what a friend has
// placed and claimed, with no economy state. It is the only path a visitor
// has into another player's world and it cannot write.
func communityWorldHandler(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		friendID := e.Request.PathValue("friendId")
		if friendID != e.Auth.Id && !areFriends(app, e.Auth.Id, friendID) {
			return apis.NewForbiddenError("you can only visit a friend's world", nil)
		}
		state, err := app.FindFirstRecordByFilter("game_states", "user = {:id}", dbx.Params{"id": friendID})
		if err != nil {
			return apis.NewNotFoundError("this player has no world yet", nil)
		}
		friend, err := loadUser(app, friendID)
		if err != nil {
			return apis.NewNotFoundError("player not found", nil)
		}
		asMap, _ := state.Get("state").(map[string]any)
		player, _ := asMap["player"].(map[string]any)
		world := map[string]any{
			"username": usernameFromUser(friend),
			"readOnly": true,
		}
		if player != nil {
			world["fieldStructures"] = player["fieldStructures"]
			world["territoryClaims"] = player["territoryClaims"]
			world["biosphereSeeds"] = player["biosphereSeeds"]
			world["discoveredExoplanetTargets"] = player["discoveredExoplanetTargets"]
		}
		return e.JSON(http.StatusOK, map[string]any{"world": world})
	}
}

var _ = types.Pointer[string]
