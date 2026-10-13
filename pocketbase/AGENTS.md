# AGENTS (pocketbase)

Root rules: ../AGENTS.md. PocketBase is the only state store; clients write via the outbox.

- `main.go` (69 KB) holds routes and hooks: `rg -n 'OnRecord|e.Router' main.go` then read a window. Feature files: `community.go`, `friends.go`, `treasury.go`, `landnam_auth*.go`, `sharedauth/`. Schema: `pb_migrations/` (JS) and `migrations/` (Go).
- Never read `go.sum` or `pb_data/`.
- Targeted tests: `go test -run TestSiteDeedPrices ./...` (one test), `go vet ./...`. Local only; never point tooling at a deployed instance.
