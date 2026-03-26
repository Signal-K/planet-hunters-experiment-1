package handler

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// ── Types ─────────────────────────────────────────────────────────────────────

type Task struct {
	ID          string   `json:"id"`
	Project     string   `json:"project"`
	ProjectName string   `json:"projectName"`
	Title       string   `json:"title"`
	Status      string   `json:"status"`
	Priority    string   `json:"priority"`
	Labels      []string `json:"labels"`
	Assignee    string   `json:"assignee"`
	Description string   `json:"description"`
	Notes       string   `json:"notes"`
	Plan        string   `json:"plan"`
	AC          []ACItem `json:"ac"`
	Attachments []string `json:"attachments"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
	TimeSpent   float64  `json:"timeSpent"`
}

type ACItem struct {
	Index int    `json:"index"`
	Done  bool   `json:"done"`
	Text  string `json:"text"`
}

type KanbanProject struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}

// ── Store interface ────────────────────────────────────────────────────────────

type Store interface {
	ListTasks() ([]*Task, error)
	GetTask(project, id string) (*Task, error)
	CreateTask(t *Task) (*Task, error)
	PatchTask(project, id string, patch map[string]any) error
	ListProjects() ([]KanbanProject, error)
}

// ── Default projects ──────────────────────────────────────────────────────────

var defaultProjects = []KanbanProject{
	{Slug: "saily", Name: "Daily Game"},
	{Slug: "planet-hunters-experiment-1", Name: "Experiment 1"},
	{Slug: "client", Name: "Web"},
	{Slug: "coral", Name: "Coral"},
}

// ── JSON file store ────────────────────────────────────────────────────────────

type jsonData struct {
	Tasks    []*Task         `json:"tasks"`
	Projects []KanbanProject `json:"projects"`
	SyncedAt string          `json:"syncedAt,omitempty"`
}

type JSONStore struct {
	mu   sync.RWMutex
	path string
	data jsonData
}

func NewJSONStore(dir string) (*JSONStore, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	s := &JSONStore{path: filepath.Join(dir, "tasks.json")}
	if err := s.load(); err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	if len(s.data.Projects) == 0 {
		s.data.Projects = defaultProjects
		_ = s.save()
	}
	return s, nil
}

func (s *JSONStore) load() error {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, &s.data)
}

// Reload re-reads the JSON file from disk, picking up any external edits.
func (s *JSONStore) Reload() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.load()
}

func (s *JSONStore) save() error {
	data, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, data, 0o644)
}

func (s *JSONStore) ListTasks() ([]*Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*Task, len(s.data.Tasks))
	copy(out, s.data.Tasks)
	return out, nil
}

func (s *JSONStore) GetTask(project, id string) (*Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, t := range s.data.Tasks {
		if t.ID == id && (project == "" || t.Project == project) {
			return t, nil
		}
	}
	return nil, fmt.Errorf("not found")
}

func (s *JSONStore) CreateTask(t *Task) (*Task, error) {
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
	return t, s.save()
}

func (s *JSONStore) PatchTask(project, id string, patch map[string]any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, t := range s.data.Tasks {
		if t.ID == id && (project == "" || t.Project == project) {
			applyPatch(t, patch)
			t.UpdatedAt = time.Now().Format(time.RFC3339)
			return s.save()
		}
	}
	return fmt.Errorf("task %s not found", id)
}

func (s *JSONStore) ListProjects() ([]KanbanProject, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.Projects, nil
}

// BulkUpsert merges tasks into the store (used for sync from remote).
// Last-write-wins by updatedAt timestamp.
func (s *JSONStore) BulkUpsert(tasks []*Task) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	byID := make(map[string]*Task, len(s.data.Tasks))
	for _, t := range s.data.Tasks {
		byID[t.ID] = t
	}
	for _, incoming := range tasks {
		if existing, ok := byID[incoming.ID]; ok {
			if incoming.UpdatedAt >= existing.UpdatedAt {
				*existing = *incoming
			}
		} else {
			cp := *incoming
			byID[incoming.ID] = &cp
		}
	}
	s.data.Tasks = make([]*Task, 0, len(byID))
	for _, t := range byID {
		s.data.Tasks = append(s.data.Tasks, t)
	}
	s.data.SyncedAt = time.Now().Format(time.RFC3339)
	return s.save()
}

// ── Chain store (local JSON + remote Blob) ────────────────────────────────────
// Reads from local for speed; writes to local + remote. Syncs from remote on
// startup so Docker picks up any changes made in prod.

type chainStore struct {
	local  *JSONStore
	remote Store
}

func (c *chainStore) ListTasks() ([]*Task, error) { return c.local.ListTasks() }
func (c *chainStore) GetTask(project, id string) (*Task, error) {
	return c.local.GetTask(project, id)
}
func (c *chainStore) ListProjects() ([]KanbanProject, error) { return c.local.ListProjects() }

func (c *chainStore) CreateTask(t *Task) (*Task, error) {
	created, err := c.local.CreateTask(t)
	if err != nil {
		return nil, err
	}
	go func() {
		cp := *created
		_, _ = c.remote.CreateTask(&cp)
	}()
	return created, nil
}

func (c *chainStore) PatchTask(project, id string, patch map[string]any) error {
	if err := c.local.PatchTask(project, id, patch); err != nil {
		return err
	}
	go func() { _ = c.remote.PatchTask(project, id, patch) }()
	return nil
}

// syncFromRemote pulls all tasks from the remote store and upserts into local JSON.
// Called on startup so Docker reflects any changes made on Vercel.
func (c *chainStore) syncFromRemote() {
	tasks, err := c.remote.ListTasks()
	if err != nil {
		return
	}
	_ = c.local.BulkUpsert(tasks)
}

// ── Utilities ─────────────────────────────────────────────────────────────────

func applyPatch(t *Task, patch map[string]any) {
	if v, ok := patch["title"].(string); ok {
		t.Title = v
	}
	if v, ok := patch["status"].(string); ok {
		t.Status = v
	}
	if v, ok := patch["priority"].(string); ok {
		t.Priority = v
	}
	if v, ok := patch["assignee"].(string); ok {
		t.Assignee = v
	}
	if v, ok := patch["description"].(string); ok {
		t.Description = v
	}
	if v, ok := patch["notes"].(string); ok {
		t.Notes = v
	}
	if v, ok := patch["plan"].(string); ok {
		t.Plan = v
	}
	if arr, ok := patch["labels"].([]any); ok {
		labels := make([]string, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok {
				labels = append(labels, s)
			}
		}
		t.Labels = labels
	}
	if arr, ok := patch["attachments"].([]any); ok {
		atts := make([]string, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok {
				atts = append(atts, s)
			}
		}
		t.Attachments = atts
	}
}

func orDefault(s, def string) string {
	if s == "" {
		return def
	}
	return s
}

var rng = rand.New(rand.NewSource(time.Now().UnixNano())) //nolint:gosec

func randomID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = chars[rng.Intn(len(chars))]
	}
	return string(b)
}
