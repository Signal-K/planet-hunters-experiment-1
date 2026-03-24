package handler

import (
	"log"
	"net/http"
	"os"
	"sync"
)

var (
	initOnce     sync.Once
	globalStore  Store
	globalMux    http.Handler
	globalAttDir string
)

// Handler is the Vercel serverless function entry point.
// For local dev, main.go wraps this with a static file server.
func Handler(w http.ResponseWriter, r *http.Request) {
	initOnce.Do(setup)
	globalMux.ServeHTTP(w, r)
}

func setup() {
	globalStore = newStore()
	globalAttDir = attachmentsDir()
	globalMux = corsMiddleware(buildMux(globalStore, globalAttDir))

	// Sync from Vercel Blob on startup so local Docker reflects prod changes.
	if cs, ok := globalStore.(*chainStore); ok {
		log.Println("kanban: syncing from Vercel Blob…")
		go cs.syncFromRemote()
	}
}

func buildMux(store Store, attDir string) http.Handler {
	mux := http.NewServeMux()

	// UI — served by Vercel CDN in prod; by main.go FileServer in local dev.
	// These handlers return 404 in Vercel context (routes never reach them).

	// Tasks API
	mux.HandleFunc("GET /api/tasks", listTasksHandler(store))
	mux.HandleFunc("GET /api/tasks/{project}/{id}", getTaskHandler(store))
	mux.HandleFunc("PUT /api/tasks/{project}/{id}", updateTaskHandler(store))
	mux.HandleFunc("POST /api/tasks/{project}", createTaskHandler(store))
	mux.HandleFunc("GET /api/projects", listProjectsHandler(store))

	// Sync endpoint (pull remote → local)
	mux.HandleFunc("POST /api/sync", syncHandler(store))

	// Attachments
	mux.HandleFunc("POST /api/tasks/{project}/{id}/attachments", uploadAttachmentHandler(store, attDir))
	mux.HandleFunc("GET /api/attachments/{taskId}/{filename}", serveAttachmentHandler(attDir))

	// Health
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	return mux
}

// newStore selects the appropriate store based on environment:
//
//   VERCEL=1                       → VercelBlobStore only (prod)
//   BLOB_READ_WRITE_TOKEN locally  → chainStore(JSONStore + VercelBlobStore)
//                                    reads local, writes to both, syncs from Blob on startup
//   POCKETBASE_URL                 → PocketBaseStore (standalone local)
//   default                        → JSONStore (local file, no sync)
func newStore() Store {
	onVercel := os.Getenv("VERCEL") == "1"
	blobToken := os.Getenv("BLOB_READ_WRITE_TOKEN")

	// ── Vercel prod ───────────────────────────────────────────────────────────
	if onVercel {
		if blobToken != "" {
			blob, err := NewVercelBlobStore()
			if err != nil {
				log.Printf("kanban: VercelBlobStore error (%v) — falling back to bundled JSON", err)
			} else {
				log.Println("kanban: using Vercel Blob store (prod)")
				return blob
			}
		} else {
			log.Println("kanban: no BLOB_READ_WRITE_TOKEN — using bundled kanban-data/tasks.json (read-only)")
		}
		// Fall through to JSONStore which reads the committed tasks.json.
		// Writes are ephemeral on Vercel until Blob is configured.
		local, err := NewJSONStore("kanban-data")
		if err != nil {
			log.Fatalf("kanban: cannot open bundled tasks.json: %v", err)
		}
		return local
	}

	// ── Local with Blob token: chain store (JSON + Blob sync) ─────────────────
	if blobToken != "" {
		dataDir := os.Getenv("KANBAN_DATA_DIR")
		if dataDir == "" {
			dataDir = "kanban-data"
		}
		local, err := NewJSONStore(dataDir)
		if err != nil {
			log.Fatalf("kanban: cannot create JSON store: %v", err)
		}
		blob, err := NewVercelBlobStore()
		if err != nil {
			log.Printf("kanban: VercelBlobStore error (%v) — using JSON only", err)
			return local
		}
		log.Println("kanban: using chain store (local JSON + Vercel Blob sync)")
		return &chainStore{local: local, remote: blob}
	}

	// ── Local PocketBase ──────────────────────────────────────────────────────
	if os.Getenv("POCKETBASE_URL") != "" {
		pb, err := NewPocketBaseStore()
		if err != nil {
			log.Printf("kanban: PocketBaseStore error (%v) — falling back to JSON", err)
		} else {
			log.Printf("kanban: using PocketBase store at %s", os.Getenv("POCKETBASE_URL"))
			return pb
		}
	}

	// ── Default: local JSON file ──────────────────────────────────────────────
	dataDir := os.Getenv("KANBAN_DATA_DIR")
	if dataDir == "" {
		dataDir = "kanban-data"
	}
	local, err := NewJSONStore(dataDir)
	if err != nil {
		log.Fatalf("kanban: cannot create JSON store: %v", err)
	}
	log.Printf("kanban: using local JSON store at %s", dataDir)
	return local
}

func attachmentsDir() string {
	d := os.Getenv("KANBAN_ATTACHMENTS_DIR")
	if d != "" {
		return d
	}
	if os.Getenv("VERCEL") == "1" {
		return "" // No persistent filesystem on Vercel
	}
	return "kanban-data/attachments"
}
