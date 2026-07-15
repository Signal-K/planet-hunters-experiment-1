.PHONY: help up pb-up pb-stop down build web-deps logs e2e e2e-open web-dev web-build web-check pb-reset docker-prune migrate seed

FRONTEND_COMPOSE := docker compose -f docker-compose.frontend.yml
PARENT_COMPOSE   := docker compose -p navigation -f ../docker-compose.yml
E2E_COMPOSE      := $(FRONTEND_COMPOSE) --profile e2e
E2E_FULL_COMPOSE := docker compose -f docker-compose.e2e.yml

help:
	@echo "Landnam — available targets"
	@echo ""
	@echo "  Dev"
	@echo "    up             Start frontend + parent-owned PocketBase (:3000 / shared :8090 / landnam :8091)"
	@echo "    pb-up          Start parent-owned shared + Landnam PocketBase only"
	@echo "    pb-stop        Stop parent-owned shared + Landnam PocketBase only"
	@echo "    down           Stop the stack"
	@echo "    build          Rebuild images — only affects a fresh volume; see web-deps"
	@echo "    web-deps       Sync node_modules inside the running web container — run this"
	@echo "                   after web/package.json changes, or 'up' will 500 on missing"
	@echo "                   modules. 'build' alone does NOT fix it: web_node_modules is a"
	@echo "                   named volume that shadows whatever the rebuilt image installs"
	@echo "    logs           Follow stack logs"
	@echo "    e2e            Run Cypress against the frontend Docker stack"
	@echo "    test-e2e       Run Cypress against full E2E stack (shared-pb + landnam-pb + next-app)"
	@echo "    e2e-open       Start stack + open Cypress UI"
	@echo "    web-dev        Run Next.js dev server locally (no Docker)"
	@echo "    web-build      Production build locally"
	@echo "    web-check      Typecheck + production build"
	@echo "    pb-stop        Stop PocketBase services only (keeps volumes)"
	@echo "    pb-reset       Remove local PocketBase data volume"
	@echo "    docker-prune   Remove all unused Docker data"

up: pb-up
	$(FRONTEND_COMPOSE) up -d --remove-orphans web
	@echo "Landnam:         http://localhost:3000/game"
	@echo "Shared PB:       http://localhost:8090/_/"
	@echo "Landnam PB:      http://localhost:8091/_/"

pb-up:
	$(PARENT_COMPOSE) up -d backend landnam-backend

pb-stop:
	$(PARENT_COMPOSE) stop landnam-backend backend

down:
	$(FRONTEND_COMPOSE) down --remove-orphans
	$(PARENT_COMPOSE) stop landnam-backend backend
	@lsof -ti :3000 | xargs kill -9 2>/dev/null && echo "Killed process on :3000" || true

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

test-e2e:
	@status=0; \
	$(E2E_FULL_COMPOSE) down --remove-orphans; \
	$(E2E_FULL_COMPOSE) up --build --remove-orphans --abort-on-container-exit --exit-code-from cypress shared-pb landnam-pb next-app cypress || status=$$?; \
	$(E2E_FULL_COMPOSE) down --remove-orphans; \
	exit $$status

e2e:
	@status=0; \
	$(E2E_COMPOSE) down --remove-orphans; \
	CYPRESS_PROFILE=with-pb $(E2E_COMPOSE) up --build --remove-orphans --abort-on-container-exit --exit-code-from cypress pocketbase web cypress || status=$$?; \
	$(E2E_COMPOSE) down --remove-orphans; \
	exit $$status

e2e-open:
	$(MAKE) up
	cd web && npx cypress open --config-file cypress.config.ts --config baseUrl=http://127.0.0.1:3000

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm run build

web-check:
	cd web && npm run typecheck
	cd web && npm run build

pb-reset:
	$(FRONTEND_COMPOSE) down -v --remove-orphans

docker-prune:
	docker system prune -a --volumes -f
	docker volume prune -a -f
	docker builder prune -a -f

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
