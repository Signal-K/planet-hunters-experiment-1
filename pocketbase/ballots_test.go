package main

import (
	"testing"
	"time"
)

func testBallot() ballotRow {
	return ballotRow{
		Key: "t", Category: "astronomy", Status: ballotStatusOpen,
		OpensAt:  time.Date(2026, 11, 4, 0, 0, 0, 0, time.UTC),
		ClosesAt: time.Date(2026, 11, 9, 0, 0, 0, 0, time.UTC),
		Options:  []ballotOption{{ID: "a"}, {ID: "b"}, {ID: "c"}},
	}
}

func TestBallotPhaseFollowsTheServerClock(t *testing.T) {
	b := testBallot()
	cases := []struct {
		at   time.Time
		want string
	}{
		{time.Date(2026, 11, 3, 23, 59, 0, 0, time.UTC), ballotStatusPending},
		{time.Date(2026, 11, 4, 0, 0, 0, 0, time.UTC), ballotStatusOpen},
		{time.Date(2026, 11, 8, 23, 59, 59, 0, time.UTC), ballotStatusOpen},
		{time.Date(2026, 11, 9, 0, 0, 0, 0, time.UTC), ballotStatusClosed},
	}
	for _, c := range cases {
		if got := ballotPhase(b, c.at); got != c.want {
			t.Errorf("phase at %v = %s, want %s", c.at, got, c.want)
		}
	}
	b.Status = ballotStatusPending
	if got := ballotPhase(b, time.Date(2026, 11, 5, 0, 0, 0, 0, time.UTC)); got != ballotStatusPending {
		t.Errorf("a pending ballot must stay pending inside its window, got %s", got)
	}
}

func TestValidateVoteRejectsClosedAndUnknown(t *testing.T) {
	b := testBallot()
	inside := time.Date(2026, 11, 5, 0, 0, 0, 0, time.UTC)
	if err := validateVote(b, "b", inside); err != nil {
		t.Fatalf("a valid option inside the window should pass, got %v", err)
	}
	if err := validateVote(b, "zzz", inside); err != errBallotUnknownOp {
		t.Errorf("unknown option: got %v", err)
	}
	if err := validateVote(b, "b", time.Date(2026, 11, 9, 0, 0, 0, 0, time.UTC)); err != errBallotNotOpen {
		t.Errorf("a vote at the close instant must be rejected, got %v", err)
	}
}

func TestPickWinnerTiesGoToTheEarlierOption(t *testing.T) {
	b := testBallot()
	if got := pickWinner(b, map[string]int{}); got != "" {
		t.Errorf("no votes should give no winner, got %q", got)
	}
	if got := pickWinner(b, map[string]int{"b": 2, "c": 2, "a": 1}); got != "b" {
		t.Errorf("tie between b and c should go to b, got %q", got)
	}
	if got := pickWinner(b, map[string]int{"a": 1, "c": 5}); got != "c" {
		t.Errorf("most votes should win, got %q", got)
	}
	b.WinnerOption = "a"
	if got := pickWinner(b, map[string]int{"c": 5}); got != "a" {
		t.Errorf("an admin override should win, got %q", got)
	}
}

func TestViewBallotWithholdsCountsUntilVotedOrClosed(t *testing.T) {
	b := testBallot()
	counts := map[string]int{"a": 3, "b": 1}
	open := time.Date(2026, 11, 5, 0, 0, 0, 0, time.UTC)

	if v := viewBallot(b, open, "", counts); v.Counts != nil || v.Total != 0 || v.Winner != "" {
		t.Errorf("an open ballot must not show counts to someone who has not voted: %+v", v)
	}
	if v := viewBallot(b, open, "b", counts); v.Total != 4 || v.Counts["a"] != 3 || v.Winner != "" {
		t.Errorf("after voting the counts show, with no winner yet: %+v", v)
	}
	closed := time.Date(2026, 11, 10, 0, 0, 0, 0, time.UTC)
	if v := viewBallot(b, closed, "", counts); v.Winner != "a" || v.Total != 4 {
		t.Errorf("a closed ballot shows counts and the winner: %+v", v)
	}
	b.Status = ballotStatusPending
	if v := viewBallot(b, open, "", counts); v.Phase != ballotStatusPending || v.Counts != nil {
		t.Errorf("a pending ballot shows no counts: %+v", v)
	}
}

func TestInitialBallotsAreWellFormed(t *testing.T) {
	seen := map[string]bool{}
	for _, b := range initialBallots() {
		if seen[b.Key] {
			t.Errorf("duplicate ballot key %s", b.Key)
		}
		seen[b.Key] = true
		if !ballotCategories[b.Category] || b.Title == "" || len(b.Options) == 0 {
			t.Errorf("ballot %s is missing a category, title or options", b.Key)
		}
		ids := map[string]bool{}
		for _, o := range b.Options {
			if o.ID == "" || ids[o.ID] || o.SourceURL == "" || o.Policy.Template == "" {
				t.Errorf("ballot %s option %q needs a unique id, a source and a policy", b.Key, o.ID)
			}
			ids[o.ID] = true
		}
		if b.Status == ballotStatusOpen && (b.OpensAt.IsZero() || b.ClosesAt.IsZero() || !b.ClosesAt.After(b.OpensAt)) {
			t.Errorf("open ballot %s needs a window", b.Key)
		}
		if b.DefaultOption != "" && !ids[b.DefaultOption] {
			t.Errorf("ballot %s default %q is not one of its options", b.Key, b.DefaultOption)
		}
	}
}
