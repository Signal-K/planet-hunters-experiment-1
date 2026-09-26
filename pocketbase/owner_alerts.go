package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

type ownerAlertRelay struct {
	url   string
	token string
}

func newOwnerAlertRelay() ownerAlertRelay {
	sharedURL := strings.TrimRight(strings.TrimSpace(os.Getenv("SHARED_PB_URL")), "/")
	return ownerAlertRelay{
		url:   sharedURL + "/api/internal/owner-alerts",
		token: strings.TrimSpace(os.Getenv("OWNER_ALERTS_RELAY_TOKEN")),
	}
}

func (r ownerAlertRelay) enabled() bool {
	return r.token != "" && strings.HasPrefix(r.url, "http")
}

// registerLandnamOwnerAlerts forwards the durable mission_log event only after
// PocketBase has committed it. The relay is optional: without a production
// token, local development and player mission completion are unchanged.
func registerLandnamOwnerAlerts(app core.App) {
	relay := newOwnerAlertRelay()
	if !relay.enabled() {
		return
	}
	app.OnRecordAfterCreateSuccess("mission_log").BindFunc(func(e *core.RecordEvent) error {
		eventKey := "landnam-mission:" + e.Record.Id
		go relay.send(eventKey)
		return e.Next()
	})
}

func (r ownerAlertRelay) send(eventKey string) {
	body, err := json.Marshal(map[string]string{
		"eventKey": eventKey,
		"kind":     "landnam-mission",
		"title":    "Landnam mission complete",
		"message":  "A player completed a Landnam mission.",
	})
	if err != nil {
		return
	}
	req, err := http.NewRequest(http.MethodPost, r.url, bytes.NewReader(body))
	if err != nil {
		log.Printf("owner alert relay: create request failed: %v", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+r.token)
	req.Header.Set("Content-Type", "application/json")
	response, err := (&http.Client{Timeout: 5 * time.Second}).Do(req)
	if err != nil {
		log.Printf("owner alert relay: request failed: %v", err)
		return
	}
	defer response.Body.Close()
	if response.StatusCode >= http.StatusMultipleChoices {
		log.Printf("owner alert relay: shared backend returned %d", response.StatusCode)
	}
}
