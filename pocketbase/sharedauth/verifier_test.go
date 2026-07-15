package sharedauth

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestVerifyBearerToken_InvalidTokenIsErrTokenInvalid(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	v := New(srv.URL)
	_, err := v.VerifyBearerToken("some-token")
	if !errors.Is(err, ErrTokenInvalid) {
		t.Fatalf("expected ErrTokenInvalid, got %v", err)
	}
}

func TestVerifyBearerToken_ForbiddenIsErrTokenInvalid(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	v := New(srv.URL)
	_, err := v.VerifyBearerToken("some-token")
	if !errors.Is(err, ErrTokenInvalid) {
		t.Fatalf("expected ErrTokenInvalid, got %v", err)
	}
}

func TestVerifyBearerToken_ServerErrorIsNotErrTokenInvalid(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer srv.Close()

	v := New(srv.URL)
	_, err := v.VerifyBearerToken("some-token")
	if err == nil {
		t.Fatal("expected an error")
	}
	if errors.Is(err, ErrTokenInvalid) {
		t.Fatalf("5xx should not classify as ErrTokenInvalid (it's transient, not a rejected token), got %v", err)
	}
}

func TestVerifyBearerToken_Unreachable(t *testing.T) {
	// Server closed before use — connection refused.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	srv.Close()

	v := New(srv.URL)
	_, err := v.VerifyBearerToken("some-token")
	if err == nil {
		t.Fatal("expected an error")
	}
	if errors.Is(err, ErrTokenInvalid) {
		t.Fatalf("unreachable backend should not classify as ErrTokenInvalid, got %v", err)
	}
}

func TestVerifyBearerToken_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"token":"newtoken","record":{"id":"abc123","email":"guest_x@landnam.guest"}}`))
	}))
	defer srv.Close()

	v := New(srv.URL)
	user, err := v.VerifyBearerToken("some-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.ID != "abc123" || user.Email != "guest_x@landnam.guest" || user.Token != "newtoken" {
		t.Fatalf("unexpected user: %+v", user)
	}
}
