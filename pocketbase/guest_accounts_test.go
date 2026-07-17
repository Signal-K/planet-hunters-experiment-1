package main

import (
	"testing"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
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

func TestIsArchivedState(t *testing.T) {
	record := core.NewRecord(core.NewBaseCollection("game_states"))
	record.Set("state", types.JSONRaw(`{"dormant":true,"archivedAt":"2026-07-17 09:00:00.000Z"}`))

	if !isArchivedState(record) {
		t.Fatal("isArchivedState() = false, want true for dormant archive stub")
	}
}

func TestIsArchivedStateRejectsActiveOrMalformedState(t *testing.T) {
	tests := []struct {
		name string
		raw  types.JSONRaw
	}{
		{name: "active save", raw: types.JSONRaw(`{"screen":"hub","player":{"missionsDone":1}}`)},
		{name: "explicit non-dormant", raw: types.JSONRaw(`{"dormant":false}`)},
		{name: "malformed json", raw: types.JSONRaw(`{"dormant":`)},
		{name: "empty json", raw: nil},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			record := core.NewRecord(core.NewBaseCollection("game_states"))
			record.Set("state", tc.raw)
			if isArchivedState(record) {
				t.Fatalf("isArchivedState() = true for %s, want false", tc.name)
			}
		})
	}
}
