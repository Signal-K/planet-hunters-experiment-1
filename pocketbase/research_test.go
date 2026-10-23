package main

import "testing"

func TestResearchMonthCountsOneStampPerKindPerDay(t *testing.T) {
	stamps := map[string][]string{
		"2026-10-01": {"classification", "survey", "classification"},
		"2026-10-02": {"event", "mining"},
		"2026-09-30": {"classification"},
		"bad-key":    {"classification"},
	}
	if got := researchMonthCounts(stamps, "2026-10"); got != 3 {
		t.Fatalf("October count = %d; want 3", got)
	}
	if got := researchMonthCounts(stamps, "2026-09"); got != 1 {
		t.Fatalf("September count = %d; want 1", got)
	}
}
