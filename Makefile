.PHONY: help up down build logs e2e e2e-open web-dev web-build web-check pb-reset docker-prune \
        kanban-up kanban-down

FRONTEND_COMPOSE := docker compose -f docker-compose.frontend.yml
E2E_COMPOSE      := $(FRONTEND_COMPOSE) --profile e2e

help:
	@echo "Landnam — available targets"
	@echo ""
	@echo "  Dev"
	@echo "    up             Start frontend + PocketBase (:3000 / :8093)"
	@echo "    down           Stop the stack"
	@echo "    build          (Re)build images — run after package.json changes"
	@echo "    logs           Follow stack logs"
	@echo "    e2e            Run Cypress against the Docker stack"
	@echo "    e2e-open       Start stack + open Cypress UI"
	@echo "    web-dev        Run Next.js dev server locally (no Docker)"
	@echo "    web-build      Production build locally"
	@echo "    web-check      Typecheck + production build"
	@echo "    pb-reset       Remove local PocketBase data volume"
	@echo "    docker-prune   Remove all unused Docker data"
	@echo "    kanban-up/down Kanban board on :4444"

up:
	$(FRONTEND_COMPOSE) up -d --remove-orphans pocketbase web
	@echo "Landnam:    http://localhost:3000/game"
	@echo "PocketBase: http://localhost:8093/_/"

down:
	$(FRONTEND_COMPOSE) down --remove-orphans

build:
	$(FRONTEND_COMPOSE) build pocketbase web

logs:
	$(FRONTEND_COMPOSE) logs -f pocketbase web

test-e2e:
	CYPRESS_PROFILE=with-pb start-server-and-test 'npm run dev --prefix web' http://localhost:3000 'npm run cypress:run --prefix web'

e2e:
	@status=0; \
	$(E2E_COMPOSE) down --remove-orphans; \
	CYPRESS_PROFILE=with-pb $(E2E_COMPOSE) up --build --remove-orphans --abort-on-container-exit --exit-code-from cypress pocketbase web cypress || status=$$?; \
	$(E2E_COMPOSE) down --remove-orphans; \
	exit $$status

e2e-open:
	$(MAKE) up
	npx cypress open --config baseUrl=http://127.0.0.1:3000

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
	$(FRONTEND_COMPOSE) up -d pocketbase
	@echo "Waiting for PocketBase to apply migrations..."
	@sleep 3
	@echo "Migrations applied."
	$(FRONTEND_COMPOSE) stop pocketbase

kanban-up:
	@lsof -ti :4444 | xargs kill -9 2>/dev/null || true
	@cd kanban-go && KNOWNS_DIR=$(CURDIR)/.knowns PORT=4444 go run .

kanban-down:
	@lsof -ti :4444 | xargs kill -9 2>/dev/null && echo "Stopped :4444" || echo "Nothing on :4444"
