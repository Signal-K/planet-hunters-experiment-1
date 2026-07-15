package main

import (
	"testing"
	"time"
)

func TestGuestStaleThreshold(t *testing.T) {
	// Verify the stale threshold constant is the expected 30-day value.
	expected := 30 * 24 * time.Hour
	if guestStaleAfter != expected {
		t.Errorf("guestStaleAfter = %v, want %v", guestStaleAfter, expected)
	}
}

func TestGuestEmailSuffix(t *testing.T) {
	if guestEmailSuffix != "@landnam.guest" {
		t.Errorf("guestEmailSuffix = %q, want %q", guestEmailSuffix, "@landnam.guest")
	}
}
