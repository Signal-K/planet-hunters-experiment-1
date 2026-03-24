package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"
)

// PocketBaseStore persists kanban state as a single JSON record in a PocketBase
// collection called "kanban_state". The whole jsonData blob lives in the `data`
// field of that record.
//
// Setup in PocketBase admin:
//   1. Create collection "kanban_state" (type: base)
//   2. Add a field "data" (type: text / JSON, no max length)
//   3. The store creates/updates a single record in that collection.
//
// Activated via: POCKETBASE_URL=http://localhost:8090

type PocketBaseStore struct {
	mu       sync.Mutex
	baseURL  string // e.g. http://localhost:8090
	recordID string // cached ID of the single kanban_state record
	data     jsonData
}

func NewPocketBaseStore() (*PocketBaseStore, error) {
	url := os.Getenv("POCKETBASE_URL")
	if url == "" {
		return nil, fmt.Errorf("POCKETBASE_URL not set")
	}
	s := &PocketBaseStore{baseURL: url}
	if err := s.load(); err != nil {
		return nil, fmt.Errorf("PocketBaseStore init: %w", err)
	}
	return s, nil
}

// ── PocketBase REST helpers ───────────────────────────────────────────────────

type pbListResponse struct {
	Items []pbRecord `json:"items"`
}

type pbRecord struct {
	ID   string `json:"id"`
	Data string `json:"data"`
}

func (s *PocketBaseStore) collectionURL() string {
	return s.baseURL + "/api/collections/kanban_state/records"
}

func (s *PocketBaseStore) load() error {
	resp, err := http.Get(s.collectionURL() + "?perPage=1&sort=-created")
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return fmt.Errorf("PocketBase GET %d: %s", resp.StatusCode, string(body))
	}

	var list pbListResponse
	if err := json.Unmarshal(body, &list); err != nil {
		return err
	}

	if len(list.Items) == 0 {
		// No record yet — start fresh and persist.
		s.data = jsonData{Projects: defaultProjects}
		return s.push()
	}

	s.recordID = list.Items[0].ID
	var d jsonData
	if err := json.Unmarshal([]byte(list.Items[0].Data), &d); err != nil {
		return fmt.Errorf("JSON parse: %w", err)
	}
	if len(d.Projects) == 0 {
		d.Projects = defaultProjects
	}
	s.data = d
	return nil
}

func (s *PocketBaseStore) push() error {
	payload, err := json.Marshal(s.data)
	if err != nil {
		return err
	}

	body := map[string]string{"data": string(payload)}
	bodyBytes, _ := json.Marshal(body)

	var (
		req  *http.Request
		resp *http.Response
	)

	if s.recordID == "" {
		// Create new record.
		req, _ = http.NewRequest("POST", s.collectionURL(), bytes.NewReader(bodyBytes))
	} else {
		// Update existing record.
		req, _ = http.NewRequest("PATCH", s.collectionURL()+"/"+s.recordID, bytes.NewReader(bodyBytes))
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("PocketBase %d: %s", resp.StatusCode, string(respBody))
	}

	// Cache the record ID for future PATCHes.
	var rec pbRecord
	if err := json.Unmarshal(respBody, &rec); err == nil && rec.ID != "" {
		s.recordID = rec.ID
	}
	return nil
}

// ── Store interface ────────────────────────────────────────────────────────────

func (s *PocketBaseStore) ListTasks() ([]*Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*Task, len(s.data.Tasks))
	copy(out, s.data.Tasks)
	return out, nil
}

func (s *PocketBaseStore) GetTask(project, id string) (*Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, t := range s.data.Tasks {
		if t.ID == id && (project == "" || t.Project == project) {
			return t, nil
		}
	}
	return nil, fmt.Errorf("not found")
}

func (s *PocketBaseStore) CreateTask(t *Task) (*Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if t.ID == "" {
		t.ID = randomID()
	}
	now := time.Now().Format(time.RFC3339)
	t.CreatedAt = now
	t.UpdatedAt = now
	if t.Labels == nil {
		t.Labels = []string{}
	}
	if t.AC == nil {
		t.AC = []ACItem{}
	}
	if t.Attachments == nil {
		t.Attachments = []string{}
	}
	s.data.Tasks = append(s.data.Tasks, t)
	return t, s.push()
}

func (s *PocketBaseStore) PatchTask(project, id string, patch map[string]any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, t := range s.data.Tasks {
		if t.ID == id && (project == "" || t.Project == project) {
			applyPatch(t, patch)
			t.UpdatedAt = time.Now().Format(time.RFC3339)
			return s.push()
		}
	}
	return fmt.Errorf("task %s not found", id)
}

func (s *PocketBaseStore) ListProjects() ([]KanbanProject, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.data.Projects, nil
}
