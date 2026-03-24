package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// ── Helpers ───────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ── Status ordering ───────────────────────────────────────────────────────────

var statusOrder = map[string]int{
	"todo": 0, "in-progress": 1, "in-review": 2, "blocked": 3, "done": 4,
}

// ── API handlers ──────────────────────────────────────────────────────────────

func listTasksHandler(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tasks, err := store.ListTasks()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		sort.Slice(tasks, func(i, j int) bool {
			oi := statusOrder[tasks[i].Status]
			oj := statusOrder[tasks[j].Status]
			if oi != oj {
				return oi < oj
			}
			return tasks[i].Title < tasks[j].Title
		})
		writeJSON(w, http.StatusOK, tasks)
	}
}

func getTaskHandler(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")
		id := r.PathValue("id")
		t, err := store.GetTask(project, id)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			return
		}
		writeJSON(w, http.StatusOK, t)
	}
}

func updateTaskHandler(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")
		id := r.PathValue("id")
		var patch map[string]any
		if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		if err := store.PatchTask(project, id, patch); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	}
}

func createTaskHandler(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")

		var req struct {
			Title       string   `json:"title"`
			Status      string   `json:"status"`
			Priority    string   `json:"priority"`
			Labels      []string `json:"labels"`
			Assignee    string   `json:"assignee"`
			Description string   `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		if req.Title == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title required"})
			return
		}

		assignee := req.Assignee
		if assignee == "" {
			assignee = "Liam"
		}
		labels := req.Labels
		hasSprintTag := false
		for _, l := range labels {
			if strings.ToLower(l) == sprintTag {
				hasSprintTag = true
				break
			}
		}
		if !hasSprintTag {
			labels = append(labels, sprintTag)
		}

		// Resolve projectName from slug
		projectName := ""
		for _, p := range defaultProjects {
			if p.Slug == project {
				projectName = p.Name
				break
			}
		}

		t := &Task{
			Project:     project,
			ProjectName: projectName,
			Title:       req.Title,
			Status:      orDefault(req.Status, "todo"),
			Priority:    orDefault(req.Priority, "medium"),
			Labels:      labels,
			Assignee:    assignee,
			Description: req.Description,
			AC:          []ACItem{},
			Attachments: []string{},
		}

		created, err := store.CreateTask(t)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusCreated, created)
	}
}

func listProjectsHandler(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projects, err := store.ListProjects()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, projects)
	}
}

func syncHandler(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// chainStore (local Docker): pull latest from Vercel Blob into local JSON.
		if cs, ok := store.(*chainStore); ok {
			cs.syncFromRemote()
			writeJSON(w, http.StatusOK, map[string]string{"status": "synced from Vercel Blob"})
			return
		}
		// VercelBlobStore on prod: re-fetch in-memory cache from Blob.
		if blob, ok := store.(*VercelBlobStore); ok {
			if err := blob.Reload(); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"status": "reloaded from Vercel Blob"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// ── Attachment handlers ───────────────────────────────────────────────────────

func uploadAttachmentHandler(store Store, attachmentsDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")
		taskID := r.PathValue("id")

		if attachmentsDir == "" {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "attachments not available in this environment"})
			return
		}

		if err := r.ParseMultipartForm(32 << 20); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid multipart: " + err.Error()})
			return
		}
		file, header, err := r.FormFile("file")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing file field"})
			return
		}
		defer file.Close()

		name := filepath.Base(header.Filename)
		if name == "." || name == "/" {
			name = "attachment"
		}

		dir := filepath.Join(attachmentsDir, taskID)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		dst, err := os.Create(filepath.Join(dir, name))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		defer dst.Close()
		if _, err := io.Copy(dst, file); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		ref := fmt.Sprintf("/api/attachments/%s/%s", taskID, name)
		t, err := store.GetTask(project, taskID)
		if err == nil {
			existing := append(t.Attachments, ref)
			_ = store.PatchTask(project, taskID, map[string]any{"attachments": sliceToAny(existing)})
		}

		writeJSON(w, http.StatusCreated, map[string]string{"url": ref, "name": name})
	}
}

func serveAttachmentHandler(attachmentsDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if attachmentsDir == "" {
			http.NotFound(w, r)
			return
		}
		taskID := r.PathValue("taskId")
		filename := r.PathValue("filename")
		clean := filepath.Base(filename)
		path := filepath.Join(attachmentsDir, taskID, clean)

		f, err := os.Open(path)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer f.Close()

		ext := filepath.Ext(clean)
		ct := mime.TypeByExtension(ext)
		if ct == "" {
			ct = "application/octet-stream"
		}
		w.Header().Set("Content-Type", ct)
		w.Header().Set("Cache-Control", "public, max-age=86400")
		_, _ = io.Copy(w, f)
	}
}

func sliceToAny(s []string) []any {
	out := make([]any, len(s))
	for i, v := range s {
		out[i] = v
	}
	return out
}
