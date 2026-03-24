package main

import (
	"log"
	"net/http"
	"os"

	handler "kanban/api"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4444"
	}

	mux := http.NewServeMux()

	// Serve PWA static files from ./public/
	publicDir := os.Getenv("KANBAN_PUBLIC_DIR")
	if publicDir == "" {
		publicDir = "public"
	}
	mux.Handle("/", http.FileServer(http.Dir(publicDir)))

	// Forward all /api/* requests to the handler package
	mux.HandleFunc("/api/", handler.Handler)

	log.Printf("⭐ Kanban → http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
