package sharedauth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Identity is the verified subset of an OIDC ID token that Landnam needs to
// find-or-create a player.
type Identity struct {
	Subject       string
	Email         string
	EmailVerified bool
	Nonce         string
}

// OIDCVerifier checks RS256 ID tokens against a provider's JWKS. It is used
// for Sign in with Apple (iss https://appleid.apple.com) and Clerk session
// tokens (iss https://<instance>.clerk.accounts.dev or a custom domain).
type OIDCVerifier struct {
	Issuer    string
	JWKSURL   string
	Audiences []string // accepted `aud` values; empty skips the check (Clerk session tokens carry no aud)
	Client    *http.Client

	mu        sync.Mutex
	keys      map[string]*rsa.PublicKey
	fetchedAt time.Time
}

const jwksTTL = time.Hour

func NewAppleVerifier(bundleIDs ...string) *OIDCVerifier {
	return &OIDCVerifier{
		Issuer:    "https://appleid.apple.com",
		JWKSURL:   "https://appleid.apple.com/auth/keys",
		Audiences: bundleIDs,
		Client:    &http.Client{Timeout: 5 * time.Second},
	}
}

func NewClerkVerifier(issuer string) *OIDCVerifier {
	issuer = strings.TrimRight(issuer, "/")
	return &OIDCVerifier{
		Issuer:  issuer,
		JWKSURL: issuer + "/.well-known/jwks.json",
		Client:  &http.Client{Timeout: 5 * time.Second},
	}
}

type jwk struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (v *OIDCVerifier) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.JWKSURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks fetch failed: %s", resp.Status)
	}
	var set struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
		return err
	}
	keys := make(map[string]*rsa.PublicKey, len(set.Keys))
	for _, k := range set.Keys {
		if k.Kty != "RSA" {
			continue
		}
		n, err1 := base64.RawURLEncoding.DecodeString(k.N)
		e, err2 := base64.RawURLEncoding.DecodeString(k.E)
		if err1 != nil || err2 != nil {
			continue
		}
		keys[k.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}
	}
	v.keys, v.fetchedAt = keys, time.Now()
	return nil
}

func (v *OIDCVerifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	stale := time.Since(v.fetchedAt) > jwksTTL
	if k, ok := v.keys[kid]; ok && !stale {
		return k, nil
	}
	// Unknown kid or stale cache: providers rotate keys, so refetch once.
	if err := v.refresh(ctx); err != nil {
		return nil, err
	}
	if k, ok := v.keys[kid]; ok {
		return k, nil
	}
	return nil, ErrTokenInvalid
}

// Verify checks signature, issuer, audience, expiry and (when expectedNonce is
// non-empty) the nonce claim. A rejected token returns ErrTokenInvalid; any
// other error is transient (JWKS unreachable).
func (v *OIDCVerifier) Verify(ctx context.Context, idToken, expectedNonce string) (*Identity, error) {
	if strings.TrimSpace(idToken) == "" {
		return nil, errors.New("missing identity token")
	}
	claims := jwt.MapClaims{}
	var keyErr error
	opts := []jwt.ParserOption{jwt.WithValidMethods([]string{"RS256"}), jwt.WithIssuer(v.Issuer), jwt.WithExpirationRequired()}
	token, err := jwt.ParseWithClaims(idToken, claims, func(t *jwt.Token) (any, error) {
		kid, _ := t.Header["kid"].(string)
		k, err := v.key(ctx, kid)
		if err != nil {
			keyErr = err
			return nil, err
		}
		return k, nil
	}, opts...)
	if err != nil || !token.Valid {
		if keyErr != nil && !errors.Is(keyErr, ErrTokenInvalid) {
			return nil, keyErr
		}
		return nil, ErrTokenInvalid
	}
	if len(v.Audiences) > 0 {
		aud, _ := claims.GetAudience()
		ok := false
		for _, a := range aud {
			for _, want := range v.Audiences {
				if a == want {
					ok = true
				}
			}
		}
		if !ok {
			return nil, ErrTokenInvalid
		}
	}
	id := &Identity{}
	id.Subject, _ = claims.GetSubject()
	if id.Subject == "" {
		return nil, ErrTokenInvalid
	}
	id.Email, _ = claims["email"].(string)
	switch ev := claims["email_verified"].(type) {
	case bool:
		id.EmailVerified = ev
	case string: // Apple sends "true"/"false" as a string
		id.EmailVerified = ev == "true"
	}
	id.Nonce, _ = claims["nonce"].(string)
	if expectedNonce != "" && id.Nonce != expectedNonce {
		return nil, ErrTokenInvalid
	}
	return id, nil
}
