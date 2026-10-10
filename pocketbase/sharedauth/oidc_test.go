package sharedauth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func testVerifier(t *testing.T, aud ...string) (*OIDCVerifier, *rsa.PrivateKey) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kid": "k1", "kty": "RSA",
			"n": base64.RawURLEncoding.EncodeToString(key.N.Bytes()),
			"e": "AQAB",
		}}})
	}))
	t.Cleanup(srv.Close)
	return &OIDCVerifier{Issuer: "https://appleid.apple.com", JWKSURL: srv.URL, Audiences: aud, Client: srv.Client()}, key
}

func sign(t *testing.T, key *rsa.PrivateKey, claims jwt.MapClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = "k1"
	s, err := tok.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func claims(extra jwt.MapClaims) jwt.MapClaims {
	c := jwt.MapClaims{"iss": "https://appleid.apple.com", "aud": "com.atlasskyventures.sslandnam", "sub": "001.abc", "exp": time.Now().Add(time.Hour).Unix(), "email": "a@b.co", "email_verified": "true", "nonce": "n1"}
	for k, v := range extra {
		c[k] = v
	}
	return c
}

func TestOIDCAcceptsValidToken(t *testing.T) {
	v, key := testVerifier(t, "com.atlasskyventures.sslandnam")
	id, err := v.Verify(context.Background(), sign(t, key, claims(nil)), "n1")
	if err != nil || id.Subject != "001.abc" || !id.EmailVerified || id.Email != "a@b.co" {
		t.Fatalf("got %+v, %v", id, err)
	}
}

func TestOIDCRejects(t *testing.T) {
	v, key := testVerifier(t, "com.atlasskyventures.sslandnam")
	other, _ := rsa.GenerateKey(rand.Reader, 2048)
	cases := map[string]string{
		"expired":     sign(t, key, claims(jwt.MapClaims{"exp": time.Now().Add(-time.Hour).Unix()})),
		"wrong aud":   sign(t, key, claims(jwt.MapClaims{"aud": "evil.app"})),
		"wrong iss":   sign(t, key, claims(jwt.MapClaims{"iss": "https://evil.example"})),
		"wrong nonce": sign(t, key, claims(jwt.MapClaims{"nonce": "other"})),
		"bad sig":     sign(t, other, claims(nil)),
		"no sub":      sign(t, key, claims(jwt.MapClaims{"sub": ""})),
	}
	for name, tok := range cases {
		if _, err := v.Verify(context.Background(), tok, "n1"); !errors.Is(err, ErrTokenInvalid) {
			t.Errorf("%s: want ErrTokenInvalid, got %v", name, err)
		}
	}
}
