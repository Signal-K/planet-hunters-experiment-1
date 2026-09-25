package main

import (
	"testing"
	"time"
)

func TestAestDateKey(t *testing.T) {
	// 2026-01-15 13:30 UTC is 2026-01-16 00:30 AEDT (UTC+11, daylight saving
	// in January) — a UTC-date comparison would get this wrong by a day,
	// which is exactly the bug this helper exists to avoid.
	utc := time.Date(2026, 1, 15, 13, 30, 0, 0, time.UTC)
	got := aestDateKey(utc)
	if got != "2026-01-16" {
		t.Errorf("aestDateKey(%v) = %q, want %q", utc, got, "2026-01-16")
	}
}

func TestAestDateKeyJustAfterMidnightReset(t *testing.T) {
	// 00:01 AEST (UTC+10, non-DST — June) is 14:01 UTC the previous day.
	utc := time.Date(2026, 6, 14, 14, 1, 0, 0, time.UTC)
	got := aestDateKey(utc)
	if got != "2026-06-15" {
		t.Errorf("aestDateKey(%v) = %q, want %q", utc, got, "2026-06-15")
	}
}

func TestIsValidUsernameFormat(t *testing.T) {
	tests := []struct {
		name string
		want bool
	}{
		{"IRON_DRIFTER_042", true},
		{"abc", true},
		{"ab", false},                        // too short
		{"a234567890123456789012345", false}, // 26 chars, too long
		{"bad name", false},                  // space
		{"bad-name", false},                  // hyphen
		{"", false},
	}
	for _, tc := range tests {
		if got := isValidUsernameFormat(tc.name); got != tc.want {
			t.Errorf("isValidUsernameFormat(%q) = %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestRollGiftPayloadCurrency(t *testing.T) {
	for i := 0; i < 50; i++ {
		payload, err := rollGiftPayload("currency")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		amount, ok := payload["amount"].(int)
		if !ok || amount < 50 || amount > 150 {
			t.Fatalf("currency amount out of bounds: %#v", payload["amount"])
		}
	}
}

func TestRollGiftPayloadResource(t *testing.T) {
	validMinerals := map[string]bool{}
	for _, m := range friendGiftMinerals {
		validMinerals[m] = true
	}
	for i := 0; i < 50; i++ {
		payload, err := rollGiftPayload("resource")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		mineral, _ := payload["mineral"].(string)
		if !validMinerals[mineral] {
			t.Fatalf("resource mineral %q not in friendGiftMinerals", mineral)
		}
		amount, ok := payload["amount"].(int)
		if !ok || amount < 3 || amount > 8 {
			t.Fatalf("resource amount out of bounds: %#v", payload["amount"])
		}
	}
}

func TestRollGiftPayloadBlueprint(t *testing.T) {
	validSlugs := map[string]bool{}
	for _, s := range friendGiftBlueprints {
		validSlugs[s] = true
	}
	payload, err := rollGiftPayload("blueprint")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	slug, _ := payload["slug"].(string)
	if !validSlugs[slug] {
		t.Fatalf("blueprint slug %q not in friendGiftBlueprints", slug)
	}
}

func TestRollGiftPayloadRejectsUnknownKind(t *testing.T) {
	if _, err := rollGiftPayload("trade"); err == nil {
		t.Fatal("expected error for unsupported gift kind, got nil")
	}
}
