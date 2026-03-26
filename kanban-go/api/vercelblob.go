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

// VercelBlobStore persists kanban state as a single JSON file in Vercel Blob
// storage. On Vercel this is the sole store; locally it acts as the remote half
// of a chainStore so Docker stays in sync with prod.
//
// Required env var:
//   BLOB_READ_WRITE_TOKEN — auto-provided by Vercel when you link a Blob store;
//                           copy the same token into docker-compose.yml for local sync.

const blobPathname = "kanban-tasks.json"
const blobUploadURL = "https://blob.vercel-storage.com/" + blobPathname + "?allowOverwrite=1"

// Vercel Blob filters by URL path (which includes a content-hash suffix), not by pathname.
// Using the stem without ".json" ensures the prefix matches "kanban-tasks-<hash>.json".
const blobListURL = "https://blob.vercel-storage.com?prefix=kanban-tasks&limit=1"

type VercelBlobStore struct {
	mu      sync.Mutex
	token   string
	blobURL string // cached public URL returned after first PUT
	data    jsonData
}

func NewVercelBlobStore() (*VercelBlobStore, error) {
	token := os.Getenv("BLOB_READ_WRITE_TOKEN")
	if token == "" {
		return nil, fmt.Errorf("BLOB_READ_WRITE_TOKEN not set")
	}
	s := &VercelBlobStore{token: token}
	if err := s.loadFromBlob(); err != nil {
		return nil, fmt.Errorf("VercelBlobStore init: %w", err)
	}
	return s, nil
}

// ── Blob REST helpers ─────────────────────────────────────────────────────────

func (s *VercelBlobStore) authHeader() string {
	return "Bearer " + s.token
}

// loadFromBlob fetches the existing JSON file from Blob storage.
// If no file exists yet, starts with an empty state.
func (s *VercelBlobStore) loadFromBlob() error {
	// List blobs to find the existing file and its public URL.
	req, _ := http.NewRequest("GET", blobListURL, nil)
	req.Header.Set("Authorization", s.authHeader())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return fmt.Errorf("Blob list %d: %s", resp.StatusCode, string(body))
	}

	var list struct {
		Blobs []struct {
			URL         string `json:"url"`
			DownloadURL string `json:"downloadUrl"`
			Pathname    string `json:"pathname"`
		} `json:"blobs"`
	}
	if err := json.Unmarshal(body, &list); err != nil {
		return err
	}

	if len(list.Blobs) == 0 {
		// Nothing stored yet — start fresh.
		s.data = jsonData{Projects: defaultProjects}
		return nil
	}

	s.blobURL = list.Blobs[0].URL

	// GET the blob content directly (public URL, no auth needed).
	getResp, err := http.Get(s.blobURL)
	if err != nil {
		return err
	}
	defer getResp.Body.Close()
	content, _ := io.ReadAll(getResp.Body)

	var d jsonData
	if err := json.Unmarshal(content, &d); err != nil {
		return fmt.Errorf("parse tasks JSON: %w", err)
	}
	if len(d.Projects) == 0 {
		d.Projects = defaultProjects
	}
	s.data = d
	return nil
}

// Reload re-fetches from Blob — used by the sync endpoint.
func (s *VercelBlobStore) Reload() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.loadFromBlob()
}

// pushToBlob serialises current state and PUTs it to Blob storage.
func (s *VercelBlobStore) pushToBlob() error {
	payload, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}

	req, _ := http.NewRequest("PUT", blobUploadURL, bytes.NewReader(payload))
	req.Header.Set("Authorization", s.authHeader())
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-content-type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Blob PUT %d: %s", resp.StatusCode, string(respBody))
	}

	// Cache the public URL for future loads.
	var result struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(respBody, &result); err == nil && result.URL != "" {
		s.blobURL = result.URL
	}
	return nil
}

// ── Store interface ────────────────────────────────────────────────────────────

func (s *VercelBlobStore) ListTasks() ([]*Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*Task, len(s.data.Tasks))
	copy(out, s.data.Tasks)
	return out, nil
}

func (s *VercelBlobStore) GetTask(project, id string) (*Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, t := range s.data.Tasks {
		if t.ID == id && (project == "" || t.Project == project) {
			return t, nil
		}
	}
	return nil, fmt.Errorf("not found")
}

func (s *VercelBlobStore) CreateTask(t *Task) (*Task, error) {
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
	return t, s.pushToBlob()
}

func (s *VercelBlobStore) PatchTask(project, id string, patch map[string]any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, t := range s.data.Tasks {
		if t.ID == id && (project == "" || t.Project == project) {
			applyPatch(t, patch)
			t.UpdatedAt = time.Now().Format(time.RFC3339)
			return s.pushToBlob()
		}
	}
	return fmt.Errorf("task %s not found", id)
}

func (s *VercelBlobStore) ListProjects() ([]KanbanProject, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.data.Projects, nil
}
