package sharedauth

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type User struct {
	ID    string
	Email string
	Token string
}

type Verifier struct {
	SharedBaseURL string
	Client        *http.Client
}

type authRefreshResponse struct {
	Token  string `json:"token"`
	Record struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	} `json:"record"`
}

func New(sharedBaseURL string) *Verifier {
	return &Verifier{
		SharedBaseURL: strings.TrimRight(sharedBaseURL, "/"),
		Client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (v *Verifier) VerifyBearerToken(token string) (*User, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, errors.New("missing bearer token")
	}

	if v.SharedBaseURL == "" {
		return nil, errors.New("missing shared Pocketbase URL")
	}

	req, err := http.NewRequest(
		http.MethodPost,
		v.SharedBaseURL+"/api/collections/users/auth-refresh",
		nil,
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := v.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("shared auth refresh failed: %s", resp.Status)
	}

	var payload authRefreshResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if payload.Record.ID == "" {
		return nil, errors.New("shared auth refresh returned no user")
	}

	return &User{
		ID:    payload.Record.ID,
		Email: payload.Record.Email,
		Token: payload.Token,
	}, nil
}

func BearerToken(r *http.Request) string {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if header == "" {
		return ""
	}

	prefix := "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return ""
	}

	return strings.TrimSpace(strings.TrimPrefix(header, prefix))
}
