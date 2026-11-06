package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

type ledgerCalls struct {
	mu     sync.Mutex
	bodies []map[string][]ledgerRow
	keys   []string
	status int
}

func (c *ledgerCalls) handler(w http.ResponseWriter, r *http.Request) {
	raw, _ := io.ReadAll(r.Body)
	var body map[string][]ledgerRow
	_ = json.Unmarshal(raw, &body)
	c.mu.Lock()
	c.bodies = append(c.bodies, body)
	c.keys = append(c.keys, r.Header.Get("X-Internal-Api-Key"))
	status := c.status
	c.mu.Unlock()
	if status == 0 {
		status = http.StatusOK
	}
	w.WriteHeader(status)
}

func (c *ledgerCalls) count() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.bodies)
}

func newLedgerTestApp(t *testing.T) core.App {
	t.Helper()
	dir, err := os.MkdirTemp("", "ledger-report-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: dir})
	t.Cleanup(func() { _ = app.ResetBootstrapState() })
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	ensureCollections(app)
	return app
}

func ledgerTestUser(t *testing.T, app core.App, email, clerkID string) string {
	t.Helper()
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	user := core.NewRecord(users)
	user.SetEmail(email)
	user.SetPassword("password12345")
	user.Set("clerkId", clerkID)
	if err := app.Save(user); err != nil {
		t.Fatal(err)
	}
	return user.Id
}

func ledgerState(stamps string) string {
	return `{"screen":"hub","player":{"researchStamps":` + stamps + `}}`
}

func newTestReporter(url string, now time.Time) *ledgerReporter {
	return &ledgerReporter{
		url: url, key: "landnam-key", client: &http.Client{Timeout: 2 * time.Second},
		now:      func() time.Time { return now },
		reported: map[string]map[string]struct{}{}, skipped: map[string]time.Time{},
	}
}

var ledgerNow = time.Date(2026, 11, 5, 12, 0, 0, 0, time.UTC)

func TestLedgerReportsNewStampOnceAndRepeatsSendNothing(t *testing.T) {
	app := newLedgerTestApp(t)
	userID := ledgerTestUser(t, app, "a@example.com", "user_clerk_1")
	calls := &ledgerCalls{}
	server := httptest.NewServer(http.HandlerFunc(calls.handler))
	defer server.Close()
	reporter := newTestReporter(server.URL, ledgerNow)

	state := ledgerState(`{"2026-11-05":["classification","classification","mining"],"2026-11-04":["exchange-sale"]}`)
	if err := reporter.report(app, userID, state); err != nil {
		t.Fatal(err)
	}
	if calls.count() != 1 {
		t.Fatalf("calls = %d, want 1 batched call", calls.count())
	}
	rows := calls.bodies[0]["rows"]
	if len(rows) != 2 {
		t.Fatalf("rows = %+v, want classification + exchange-sale only", rows)
	}
	for _, row := range rows {
		if row.UserID != "user_clerk_1" || row.Game != "landnam" {
			t.Fatalf("row = %+v, want the Clerk subject and game landnam", row)
		}
	}
	if calls.keys[0] != "landnam-key" {
		t.Fatalf("key header = %q", calls.keys[0])
	}

	// Same stamps again, and a new stamp on top: only the new one is sent.
	if err := reporter.report(app, userID, state); err != nil || calls.count() != 1 {
		t.Fatalf("repeat sync made a call (calls=%d err=%v)", calls.count(), err)
	}
	state = ledgerState(`{"2026-11-05":["classification","survey"],"2026-11-04":["exchange-sale"]}`)
	if err := reporter.report(app, userID, state); err != nil || calls.count() != 2 {
		t.Fatalf("new stamp: calls=%d err=%v", calls.count(), err)
	}
	if rows := calls.bodies[1]["rows"]; len(rows) != 1 || rows[0].Kind != "survey" {
		t.Fatalf("second call rows = %+v, want only survey", rows)
	}
}

func TestLedgerSkipsAccountsWithoutClerkIdAndNeverBackfills(t *testing.T) {
	app := newLedgerTestApp(t)
	guestID := ledgerTestUser(t, app, "guest@landnam.guest", "")
	playerID := ledgerTestUser(t, app, "b@example.com", "user_clerk_2")
	calls := &ledgerCalls{}
	server := httptest.NewServer(http.HandlerFunc(calls.handler))
	defer server.Close()
	reporter := newTestReporter(server.URL, ledgerNow)

	stamps := ledgerState(`{"2026-11-05":["classification"]}`)
	if err := reporter.report(app, guestID, stamps); err != nil || calls.count() != 0 {
		t.Fatalf("guest report: calls=%d err=%v, want skipped", calls.count(), err)
	}
	if err := reporter.report(app, "missinguser0000", stamps); err != nil || calls.count() != 0 {
		t.Fatalf("unknown user: calls=%d err=%v, want skipped", calls.count(), err)
	}

	old := ledgerState(`{"2026-09-20":["classification"],"2026-10-02":["survey"],"2026-11-20":["event"]}`)
	if err := reporter.report(app, playerID, old); err != nil || calls.count() != 0 {
		t.Fatalf("old or future days were reported: calls=%d err=%v", calls.count(), err)
	}
}

func TestLedgerSharedBackendDownDoesNotLoseStampsOrBlockSaving(t *testing.T) {
	app := newLedgerTestApp(t)
	userID := ledgerTestUser(t, app, "c@example.com", "user_clerk_3")
	calls := &ledgerCalls{status: http.StatusInternalServerError}
	server := httptest.NewServer(http.HandlerFunc(calls.handler))
	defer server.Close()
	reporter := newTestReporter(server.URL, ledgerNow)
	state := ledgerState(`{"2026-11-05":["classification"]}`)

	if err := reporter.report(app, userID, state); err == nil {
		t.Fatal("a 500 from the shared backend should surface as an error to the caller")
	}
	calls.mu.Lock()
	calls.status = http.StatusOK
	calls.mu.Unlock()
	if err := reporter.report(app, userID, state); err != nil || calls.count() != 2 {
		t.Fatalf("retry on next sync: calls=%d err=%v", calls.count(), err)
	}
	if err := reporter.report(app, userID, state); err != nil || calls.count() != 2 {
		t.Fatalf("after success nothing is new: calls=%d err=%v", calls.count(), err)
	}

	// Backend unreachable altogether.
	server.Close()
	other := newTestReporter(server.URL, ledgerNow)
	if err := other.report(app, userID, state); err == nil {
		t.Fatal("unreachable backend should return an error, not panic")
	}
}

func TestLedgerReadsStateFromAJSONFieldRecord(t *testing.T) {
	record := core.NewRecord(core.NewBaseCollection("game_states"))
	record.Set("state", types.JSONRaw(ledgerState(`{"2026-11-05":["event"]}`)))
	reporter := newTestReporter("http://unused", ledgerNow)
	rows := reporter.pendingStamps("u1", record.GetString("state"))
	if len(rows) != 1 || rows[0].Kind != "event" {
		t.Fatalf("rows = %+v, want the event stamp", rows)
	}
}
