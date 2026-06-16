package main

import (
	"testing"
	"time"
)

func TestGuestSignupRateLimiter_AllowsWithinLimit(t *testing.T) {
	limiter := newGuestSignupRateLimiter(5, 10*time.Minute)

	ip := "192.0.2.1"
	for i := 0; i < 5; i++ {
		if !limiter.allow(ip) {
			t.Fatalf("expected allow on attempt %d, got denied", i+1)
		}
	}
}

func TestGuestSignupRateLimiter_DeniesOverLimit(t *testing.T) {
	limiter := newGuestSignupRateLimiter(5, 10*time.Minute)

	ip := "192.0.2.2"
	for i := 0; i < 5; i++ {
		limiter.allow(ip)
	}

	if limiter.allow(ip) {
		t.Fatal("expected deny on 6th attempt, got allow")
	}
}

func TestGuestSignupRateLimiter_IndependentPerIP(t *testing.T) {
	limiter := newGuestSignupRateLimiter(2, 10*time.Minute)

	ip1 := "192.0.2.10"
	ip2 := "192.0.2.11"

	limiter.allow(ip1)
	limiter.allow(ip1)

	// ip1 is now at limit; ip2 should still be allowed
	if !limiter.allow(ip2) {
		t.Fatal("expected ip2 to be allowed independently of ip1")
	}
}

func TestGuestSignupRateLimiter_ResetsAfterWindow(t *testing.T) {
	window := 50 * time.Millisecond
	limiter := newGuestSignupRateLimiter(2, window)

	ip := "192.0.2.3"
	limiter.allow(ip)
	limiter.allow(ip)

	if limiter.allow(ip) {
		t.Fatal("expected deny before window expiry")
	}

	time.Sleep(window + 10*time.Millisecond)

	if !limiter.allow(ip) {
		t.Fatal("expected allow after window expired")
	}
}

func TestGuestStaleThreshold(t *testing.T) {
	// Verify the stale threshold constant is the expected 30-day value.
	expected := 30 * 24 * time.Hour
	if guestStaleAfter != expected {
		t.Errorf("guestStaleAfter = %v, want %v", guestStaleAfter, expected)
	}
}

func TestGuestUsernamePrefix(t *testing.T) {
	if guestUsernamePrefix != "guest_" {
		t.Errorf("guestUsernamePrefix = %q, want %q", guestUsernamePrefix, "guest_")
	}
}
