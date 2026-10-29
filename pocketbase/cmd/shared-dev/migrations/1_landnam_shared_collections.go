// Package migrations holds the subset of the shared Star Sailors backend
// schema that Landnam reads and writes. Each collection is copied from
// signal-k/tickets-please backend/migrations (file named beside it); keep
// them in step when the shared schema changes.
package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	ptr := func(s string) *string { return &s }

	m.Register(func(app core.App) error {
		// 7_subjects_pipeline.go, 9_subject_confirmation.go, 27_subjects_star_teff.go
		subjects := core.NewBaseCollection("subjects")
		subjects.ListRule = ptr("@request.auth.id != ''")
		subjects.ViewRule = ptr("@request.auth.id != ''")
		subjects.Fields.Add(&core.TextField{Name: "tic_id", Required: true, Max: 20})
		subjects.Fields.Add(&core.TextField{Name: "toi_id", Max: 20})
		subjects.Fields.Add(&core.TextField{Name: "sectors", Max: 80})
		subjects.Fields.Add(&core.SelectField{Name: "subject_type", Required: true, Values: []string{"transit", "rv", "spectra", "ttv"}})
		subjects.Fields.Add(&core.JSONField{Name: "lightcurve_points"})
		subjects.Fields.Add(&core.NumberField{Name: "period_days"})
		subjects.Fields.Add(&core.NumberField{Name: "depth_pct"})
		subjects.Fields.Add(&core.NumberField{Name: "duration_hrs"})
		subjects.Fields.Add(&core.BoolField{Name: "is_calibration"})
		subjects.Fields.Add(&core.SelectField{Name: "gold_label", Values: []string{"planet", "not_planet"}})
		subjects.Fields.Add(&core.NumberField{Name: "vote_count"})
		subjects.Fields.Add(&core.NumberField{Name: "unsure_count"})
		subjects.Fields.Add(&core.SelectField{Name: "consensus", Values: []string{"planet", "not_planet", "unsure"}})
		subjects.Fields.Add(&core.NumberField{Name: "planet_vote_count"})
		subjects.Fields.Add(&core.BoolField{Name: "confirmed"})
		subjects.Fields.Add(&core.DateField{Name: "confirmed_at"})
		subjects.Fields.Add(&core.NumberField{Name: "st_teff"})
		subjects.Indexes = []string{"CREATE UNIQUE INDEX idx_subjects_tic_toi ON subjects (tic_id, toi_id)"}
		if err := app.Save(subjects); err != nil {
			return err
		}

		sc := core.NewBaseCollection("subject_classifications")
		sc.ListRule = ptr("user = @request.auth.id")
		sc.ViewRule = ptr("user = @request.auth.id")
		sc.CreateRule = ptr("@request.auth.id != '' && user = @request.auth.id")
		sc.Fields.Add(&core.RelationField{Name: "subject", Required: true, CollectionId: subjects.Id})
		sc.Fields.Add(&core.RelationField{Name: "user", Required: true, CollectionId: "_pb_users_auth_"})
		sc.Fields.Add(&core.SelectField{Name: "verdict", Required: true, Values: []string{"planet", "not_planet", "unsure"}})
		sc.Fields.Add(&core.JSONField{Name: "dip_markers"})
		sc.Fields.Add(&core.NumberField{Name: "response_time_ms"})
		sc.Indexes = []string{"CREATE UNIQUE INDEX idx_subject_classifications_user_subject ON subject_classifications (user, subject)"}
		if err := app.Save(sc); err != nil {
			return err
		}

		// 22_comments.go
		comments := core.NewBaseCollection("comments")
		comments.ListRule = ptr("@request.auth.id != ''")
		comments.ViewRule = ptr("@request.auth.id != ''")
		comments.CreateRule = ptr("@request.auth.id != '' && author = @request.auth.id")
		comments.Fields.Add(&core.SelectField{Name: "record_type", Required: true, Values: []string{"classification"}})
		comments.Fields.Add(&core.TextField{Name: "record_id", Required: true, Max: 64})
		comments.Fields.Add(&core.RelationField{Name: "author", Required: true, CollectionId: "_pb_users_auth_"})
		comments.Fields.Add(&core.TextField{Name: "body", Required: true, Max: 2000})
		comments.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		comments.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		comments.Indexes = []string{
			"CREATE INDEX idx_comments_record ON comments (record_type, record_id)",
			"CREATE INDEX idx_comments_author ON comments (author)",
		}
		if err := app.Save(comments); err != nil {
			return err
		}

		// 29_asteroid_candidates_pipeline.go
		candidates := core.NewBaseCollection("asteroid_candidates")
		candidates.ListRule = ptr("@request.auth.id != ''")
		candidates.ViewRule = ptr("@request.auth.id != ''")
		candidates.Fields.Add(&core.TextField{Name: "temp_desig", Required: true, Max: 20})
		candidates.Fields.Add(&core.NumberField{Name: "score", Required: true})
		candidates.Fields.Add(&core.DateField{Name: "discovery_date", Required: true})
		candidates.Fields.Add(&core.NumberField{Name: "ra"})
		candidates.Fields.Add(&core.NumberField{Name: "decl"})
		candidates.Fields.Add(&core.NumberField{Name: "v_mag"})
		candidates.Fields.Add(&core.NumberField{Name: "h_mag"})
		candidates.Fields.Add(&core.NumberField{Name: "n_obs"})
		candidates.Fields.Add(&core.NumberField{Name: "arc_days"})
		candidates.Fields.Add(&core.NumberField{Name: "last_seen_days"})
		candidates.Fields.Add(&core.BoolField{Name: "resolved"})
		candidates.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		candidates.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		candidates.Indexes = []string{"CREATE UNIQUE INDEX idx_asteroid_candidates_temp_desig ON asteroid_candidates (temp_desig)"}
		if err := app.Save(candidates); err != nil {
			return err
		}

		ac := core.NewBaseCollection("asteroid_classifications")
		ac.ListRule = ptr("user = @request.auth.id")
		ac.ViewRule = ptr("user = @request.auth.id")
		ac.CreateRule = ptr("@request.auth.id != '' && user = @request.auth.id")
		ac.Fields.Add(&core.RelationField{Name: "candidate", Required: true, CollectionId: candidates.Id})
		ac.Fields.Add(&core.RelationField{Name: "user", Required: true, CollectionId: "_pb_users_auth_"})
		ac.Fields.Add(&core.SelectField{Name: "verdict", Required: true, Values: []string{"likely_real", "likely_artifact", "unsure"}})
		ac.Fields.Add(&core.NumberField{Name: "response_time_ms"})
		ac.Indexes = []string{"CREATE UNIQUE INDEX idx_asteroid_classifications_user_candidate ON asteroid_classifications (user, candidate)"}
		if err := app.Save(ac); err != nil {
			return err
		}

		// 106_ss_saturn_storm_pool.go
		frames := core.NewBaseCollection("ss_saturn_storm_frames")
		frames.ListRule = ptr("@request.auth.id != ''")
		frames.ViewRule = ptr("@request.auth.id != ''")
		frames.Fields.Add(&core.TextField{Name: "subject_id", Required: true, Max: 40})
		frames.Fields.Add(&core.TextField{Name: "opus_id", Required: true, Max: 80})
		frames.Fields.Add(&core.URLField{Name: "image_url", Required: true})
		frames.Fields.Add(&core.TextField{Name: "subject_set_id", Max: 40})
		frames.Fields.Add(&core.NumberField{Name: "answer_count"})
		frames.Fields.Add(&core.NumberField{Name: "yes_count"})
		frames.Fields.Add(&core.NumberField{Name: "no_count"})
		frames.Fields.Add(&core.NumberField{Name: "maybe_count"})
		frames.Fields.Add(&core.BoolField{Name: "retired"})
		frames.Fields.Add(&core.DateField{Name: "retired_at"})
		frames.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		frames.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
		frames.Indexes = []string{"CREATE UNIQUE INDEX idx_ss_saturn_storm_frames_subject_id ON ss_saturn_storm_frames (subject_id)"}
		if err := app.Save(frames); err != nil {
			return err
		}

		cls := core.NewBaseCollection("ss_saturn_storm_classifications")
		cls.ListRule = ptr("user = @request.auth.id")
		cls.ViewRule = ptr("user = @request.auth.id")
		cls.CreateRule = ptr("@request.auth.id != '' && user = @request.auth.id")
		cls.Fields.Add(&core.RelationField{Name: "frame", Required: true, CollectionId: frames.Id})
		cls.Fields.Add(&core.RelationField{Name: "user", Required: true, CollectionId: "_pb_users_auth_"})
		cls.Fields.Add(&core.SelectField{Name: "answer", Required: true, Values: []string{"yes", "no", "maybe"}})
		cls.Fields.Add(&core.NumberField{Name: "response_time_ms"})
		cls.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		cls.Indexes = []string{"CREATE UNIQUE INDEX idx_ss_saturn_storm_classifications_user_frame ON ss_saturn_storm_classifications (user, frame)"}
		return app.Save(cls)
	}, nil)
}
