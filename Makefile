.PHONY: help up ensure check scene follow opener warm-studio up-ecosystem pb-up pb-stop down build web-deps logs web-dev pb-dev web-build web-check pb-reset reset-dev-data test-reset-dev-data docker-disk docker-prune migrate seed

FRONTEND_COMPOSE := docker compose -f docker-compose.frontend.yml
export LANDNAM_HOST_ROOT := $(CURDIR)
export LANDNAM_WEB_PORT ?= 4320
export LANDNAM_PB_PORT ?= 8095
export LANDNAM_PB_DEV_PORT ?= 8096
PARENT_COMPOSE   := docker compose -p navigation -f ../docker-compose.yml

help:
	@echo "Landnam — available targets"
	@echo ""
	@echo "  Dev"
	@echo "    up             Start frontend + parent-owned PocketBase (:$(LANDNAM_WEB_PORT) / shared :8090 / landnam :$(LANDNAM_PB_PORT))"
	@echo "                   Also starts the Cursor helper (lets the Studio open scripts in Cursor). The web"
	@echo "                   container warms the Studio's routes itself every time it starts."
	@echo "    follow         Start the stack and arm the persistent Cursor live preview"
	@echo "                   Landnam-only — for a full Star Sailors session (Saily/Atlas too), see up-ecosystem"
	@echo "    up-ecosystem   Start the full Star Sailors stack via the root ~/Navigation Makefile"
	@echo "                   (shared, Landnam, Saily, Atlas backends + forge-service) — opt-in, does"
	@echo "                   not change what plain 'up' starts"
	@echo "    opener         Run the Cursor helper in the foreground (make up already starts it)"
	@echo "    warm-studio    Compile the Studio's routes now and print each timing (the container does it at start)"
	@echo "    pb-up          Start parent-owned shared + Landnam PocketBase only"
	@echo "    pb-stop        Stop parent-owned shared + Landnam PocketBase only"
	@echo "    down           Stop the stack"
	@echo "    build          Rebuild images — only affects a fresh volume; see web-deps."
	@echo "                   Go backend changes (pocketbase/*.go) need this too — unlike the"
	@echo "                   web container, landnam-backend/backend do NOT hot-reload; a"
	@echo "                   running container keeps serving the old compiled binary until"
	@echo "                   you rebuild the image AND recreate the container, e.g.:"
	@echo "                     docker compose -p navigation -f ../docker-compose.yml \\"
	@echo "                       build landnam-backend && \\"
	@echo "                     docker compose -p navigation -f ../docker-compose.yml \\"
	@echo "                       up -d landnam-backend"
	@echo "    web-deps       Sync node_modules inside the running web container — run this"
	@echo "                   after web/package.json changes, or 'up' will 500 on missing"
	@echo "                   modules. 'build' alone does NOT fix it: web_node_modules is a"
	@echo "                   named volume that shadows whatever the rebuilt image installs"
	@echo "    logs           Follow stack logs"
	@echo "    web-dev        Run Next.js dev server locally (no Docker)"
	@echo "    pb-dev         Run Landnam PocketBase as a native binary on :$(LANDNAM_PB_DEV_PORT) (no Docker) —"
	@echo "                   web already defaults NEXT_PUBLIC_LANDNAM_PB_URL to this port"
	@echo "    web-build      Production build locally"
	@echo "    web-check      Typecheck + production build"
	@echo "    pb-stop        Stop PocketBase services only (keeps volumes)"
	@echo "    pb-reset       Remove local PocketBase data volume"
	@echo "    reset-dev-data Purge local test data, preserving liam@skinetics.tech"
	@echo "    test-reset-dev-data Verify reset protection with an offline mock"
	@echo "    docker-disk    Report Docker disk usage and the largest objects"
	@echo "    docker-prune   Remove stale rebuildable Docker data (never volumes)"

ensure:
	@scripts/ensure-stack.sh

# Fast in-tab check: make check NAME=orionids-board   (or: node scripts/dev-check.mjs --list)
check:
	@node scripts/dev-check.mjs $(NAME)

# All source tests, ~10s: authoring contracts + colocated unit tests (dot reporter).
test:
	@node scripts/authoring.mjs check | tail -1
	@cd web && npx vitest run --reporter=dot 2>&1 | grep -v '^$$' | tail -15

scene:
	@node scripts/scene.mjs $(NAME) $(CHECK)

up: pb-up
	$(FRONTEND_COMPOSE) up -d --remove-orphans web
	@node scripts/host-opener.mjs start || true
	@echo "Landnam:         http://localhost:$(LANDNAM_WEB_PORT)/game/hub?follow=1"
	@echo "Scene Studio:    http://localhost:$(LANDNAM_WEB_PORT)/game/studio   (every scene, editable scripts, native beside web, no login)"
	@echo "Dev mode only. make up unregisters service workers, so it is not offline-PWA proof. Use a production build on a secure origin (see web/app/layout.tsx)."
	@echo "Shared PB:       http://localhost:8090/_/"
	@echo "Landnam PB:      http://localhost:$(LANDNAM_PB_PORT)/_/"

follow: up
	@node scripts/preview-target.mjs /game/hub
	@echo "Cursor preview:  http://localhost:$(LANDNAM_WEB_PORT)/game/hub?follow=1"

up-ecosystem:
	$(MAKE) -C .. up

pb-up:
	$(PARENT_COMPOSE) up -d backend landnam-backend

pb-stop:
	$(PARENT_COMPOSE) stop landnam-backend backend

reset-dev-data:
	./scripts/reset-dev-data.sh

test-reset-dev-data:
	bash ./scripts/test-reset-dev-data.sh

# The Studio's "Open in Cursor" buttons go through a small helper on this machine (Cursor's browser blocks cursor:// links, and
# the dev server in Docker cannot launch an app). `make up` starts it in the background; this runs it in the foreground.
opener:
	node scripts/host-opener.mjs serve

warm-studio:
	node scripts/warm-studio.mjs --wait

down:
	-@node scripts/host-opener.mjs stop
	$(FRONTEND_COMPOSE) down --remove-orphans
	$(PARENT_COMPOSE) stop landnam-backend backend
	@lsof -ti :$(LANDNAM_WEB_PORT) | xargs kill -9 2>/dev/null && echo "Killed process on :$(LANDNAM_WEB_PORT)" || true

build:
	$(PARENT_COMPOSE) build backend landnam-backend
	$(FRONTEND_COMPOSE) build web

# web_node_modules is a named Docker volume — it is only ever populated from
# the image on first creation, so rebuilding the image (`make build`) does
# NOT refresh it once it exists. Run this explicitly whenever web/package.json
# or package-lock.json changes; otherwise the next `make up` serves 500s for
# every route (Module not found) against an already-running or freshly
# restarted container. Requires network access — that's expected here, this
# is the explicit maintenance action, not an automatic `make up` side effect.
web-deps:
	$(FRONTEND_COMPOSE) exec web npm install

logs:
	$(PARENT_COMPOSE) logs -f backend landnam-backend
	$(FRONTEND_COMPOSE) logs -f web

web-dev:
	cd web && npm run dev

# PocketBase is a single static Go binary — Docker buys nothing for the local
# inner dev loop and only costs build/image disk space. Data lands in
# pocketbase/pb_data (gitignored), separate from the Docker-volume-backed
# pb-up path so the two don't collide.
pb-dev:
	cd pocketbase && SHARED_PB_URL=$${SHARED_PB_URL:-http://localhost:8090} go run . serve --http=0.0.0.0:$(LANDNAM_PB_DEV_PORT)

web-build:
	cd web && npm run build

web-check:
	cd web && npm run typecheck
	cd web && npm run build

pb-reset:
	$(FRONTEND_COMPOSE) down -v --remove-orphans

docker-disk:
	./scripts/docker-maintenance.sh

docker-prune:
	./scripts/docker-maintenance.sh --prune

migrate:
	$(PARENT_COMPOSE) up -d backend landnam-backend
	@echo "Waiting for PocketBase to apply migrations..."
	@sleep 5
	@echo "Migrations applied."

seed:
	$(PARENT_COMPOSE) up -d backend landnam-backend
	@sleep 3
	@echo "Running seed data insertion..."
	@cd pocketbase && go run . seed 2>/dev/null || echo "Run pocketbase and visit /_/ to seed via UI or insert seed records manually."
