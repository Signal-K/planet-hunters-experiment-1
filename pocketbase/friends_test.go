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

func TestGiftPayloadCommonIsThree(t *testing.T) {
	for _, m := range []string{"iron", "aluminium", "nickel", "ice", "hydrogen"} {
		payload, err := giftPayload("resource", m)
		if err != nil {
			t.Fatalf("%s: unexpected error: %v", m, err)
		}
		if payload["mineral"] != m || payload["amount"] != 3 {
			t.Fatalf("%s: payload = %#v, want 3", m, payload)
		}
	}
}

func TestGiftPayloadRareIsOne(t *testing.T) {
	for _, m := range []string{"platinum", "gold", "uranium", "rhodium", "rare"} {
		payload, err := giftPayload("resource", m)
		if err != nil {
			t.Fatalf("%s: unexpected error: %v", m, err)
		}
		if payload["amount"] != 1 {
			t.Fatalf("%s: amount = %#v, want 1", m, payload["amount"])
		}
	}
}

func TestGiftPayloadRejectsRetiredAndUnknown(t *testing.T) {
	if _, err := giftPayload("currency", ""); err == nil {
		t.Fatal("currency gifts are retired")
	}
	if _, err := giftPayload("blueprint", ""); err == nil {
		t.Fatal("blueprint gifts are retired")
	}
	if _, err := giftPayload("resource", "leonid_debris"); err == nil {
		t.Fatal("shower debris must not be giftable")
	}
	if _, err := giftPayload("resource", ""); err == nil {
		t.Fatal("a gift needs an ore")
	}
}
