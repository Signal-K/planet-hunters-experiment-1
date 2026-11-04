package main

import "testing"

func TestConsensusRequiredSlidesWithActivePlayers(t *testing.T) {
	cases := []struct{ active, want int }{{0, 3}, {1, 3}, {7, 3}, {8, 4}, {100, 7}, {1000, 9}, {1_000_000, 9}}
	prev := 0
	for _, c := range cases {
		got := consensusRequired(c.active)
		if got != c.want {
			t.Errorf("active %d: required %d, want %d", c.active, got, c.want)
		}
		if got < prev {
			t.Errorf("threshold must never fall as players grow (%d after %d)", got, prev)
		}
		prev = got
	}
}

func TestConsensusState(t *testing.T) {
	cases := []struct {
		s, d, req int
		want      string
	}{
		{0, 0, 3, consensusOpen},
		{2, 0, 3, consensusOpen},
		{3, 0, 3, consensusVerified},
		{3, 1, 3, consensusVerified},
		{3, 2, 3, consensusOpen}, // too contested to verify
		{6, 2, 3, consensusVerified},
		{1, 3, 3, consensusDisputed},
		{3, 3, 3, consensusOpen},
	}
	for _, c := range cases {
		if got := consensusState(c.s, c.d, c.req); got != c.want {
			t.Errorf("supports %d disputes %d required %d: %s, want %s", c.s, c.d, c.req, got, c.want)
		}
	}
}
