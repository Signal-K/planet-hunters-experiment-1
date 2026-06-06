.PHONY: help \
        godot godot-dev buildit \
        test test-all \
        sandbox sandbox-build sandbox-vnc \
        ux-tour ux-tour-build ux-tour-m1 ux-tour-m2 ux-tour-m3 ux-tour-m4 ux-tour-sandbox ux-tour-mining \
        ci-build ci-test ci-godot ci-playwright ci-export ci-all ci-clean \
        up down build logs e2e e2e-open web-install web-dev web-build web-check pb-reset docker-prune \
        kanban-up kanban-down \
        sync-lock ghactions

# ── Config ────────────────────────────────────────────────────────────────────

GODOT_BIN  := /Applications/Dev/Godot4.5.app/Contents/MacOS/Godot
GODOT_PROJ := scene
SAVE_DIR   := $(HOME)/Library/Application Support/Godot/app_userdata/Landnám
SAVE_BAK   := /tmp/landnam-save-bak
SAVE_FILES := franc_balance.cfg experience.cfg rockets_state.json \
              mission_logs.json subcontractors.json satellite_station.cfg \
              tutorial.cfg mining_inventory.json

CI_IMAGE        := landnam-ci
PLAYWRIGHT_IMAGE := landnam-playwright
FRONTEND_COMPOSE := docker compose -f docker-compose.frontend.yml
E2E_COMPOSE      := $(FRONTEND_COMPOSE) --profile e2e
SANDBOX_IMAGE   := landnam-sandbox
UX_TOUR_IMAGE   := landnam-ux-tour
UX_TOUR_OUT     := $(PWD)/ux-screenshots
GHCR_UX_IMAGE   := ghcr.io/signal-k/landnam/ux-tour:latest
UX_TOUR_PLATFORM := $(shell \
	if [ -x .godot-bin/Godot_v4.5-stable_linux.arm64 ]; then echo linux/arm64; \
	elif [ -x .godot-bin/Godot_v4.5-stable_linux.x86_64 ]; then echo linux/amd64; fi)

help:
	@echo "Landnam — available targets"
	@echo ""
	@echo "  Dev"
	@echo "    godot          Open Godot (with Supabase check)"
	@echo "    up / down      New frontend + PocketBase (:3000 / :8093)"
	@echo "    build          Build frontend + PocketBase images"
	@echo "    logs           Follow frontend stack logs"
	@echo "    e2e            Run Cypress against the Docker stack"
	@echo "    web-dev        Run the Next.js frontend locally"
	@echo "    web-build      Build the Next.js frontend locally"
	@echo "    web-check      Typecheck + production build"
	@echo "    pb-reset       Remove local PocketBase data volume"
	@echo "    docker-prune   Remove all unused Docker data"
	@echo "    kanban-up/down Kanban board on :4444"
	@echo ""
	@echo "  Tests (local, save-safe)"
	@echo "    test           Run structure tests"
	@echo "    test-all       Run all Godot test scripts"
	@echo ""
	@echo "  Sandbox (VNC browser at http://localhost:6080/vnc.html)"
	@echo "    sandbox-build  Build the sandbox Docker image"
	@echo "    sandbox        Build + run sandbox (docker-compose)"
	@echo "    sandbox-vnc    Run sandbox, open vnc.html when ready"
	@echo ""
	@echo "  UX Tour (headless screenshot run)"
	@echo "    ux-tour        Run full tour (all missions)"
	@echo "    ux-tour-m1/m2/m3/m4  Run specific mission"
	@echo "    ux-tour-sandbox / ux-tour-mining"
	@echo "    ux-tour-build  Rebuild tour image"
	@echo ""
	@echo "  CI (Docker, linux/amd64)"
	@echo "    ci-build       Build CI image"
	@echo "    ci-test        Unit tests"
	@echo "    ci-godot       All Godot tests"
	@echo "    ci-playwright  E2E tests (Firefox)"
	@echo "    ci-export      Export Godot web assets"
	@echo "    ci-all         All of the above"
	@echo "    ci-clean       Remove CI image"
	@echo ""
	@echo "  Misc"
	@echo "    sync-lock      Regenerate package-lock.json"
	@echo "    ghactions      Run GitHub Actions locally (requires act)"

# ── Helpers ───────────────────────────────────────────────────────────────────

_save-backup:
	@mkdir -p "$(SAVE_BAK)"
	@for f in $(SAVE_FILES); do \
		cp -f "$(SAVE_DIR)/$$f" "$(SAVE_BAK)/$$f" 2>/dev/null || true; \
	done

_save-restore:
	@for f in $(SAVE_FILES); do \
		[ -f "$(SAVE_BAK)/$$f" ] && cp -f "$(SAVE_BAK)/$$f" "$(SAVE_DIR)/$$f" 2>/dev/null || true; \
	done

_supabase-check:
	@if ! curl -sf -m 5 http://127.0.0.1:54323/project/default > /dev/null; then \
		echo "Starting Supabase..."; \
		cd /Users/scroobz/Navigation/client && supabase start; \
	fi

# ── Dev ───────────────────────────────────────────────────────────────────────

godot: _supabase-check
	open -a Godot --args --path ./scene

buildit:
	npm run web:build
	npm run web:start

kanban-up:
	@lsof -ti :4444 | xargs kill -9 2>/dev/null || true
	@cd kanban-go && KNOWNS_DIR=$(CURDIR)/.knowns PORT=4444 go run .

kanban-down:
	@lsof -ti :4444 | xargs kill -9 2>/dev/null && echo "Stopped :4444" || echo "Nothing on :4444"

# ── New web game + PocketBase ────────────────────────────────────────────────

up:
	$(FRONTEND_COMPOSE) up --build -d --remove-orphans pocketbase web
	@echo "Landnam:    http://localhost:3000/game"
	@echo "PocketBase: http://localhost:8093/_/"

down:
	$(FRONTEND_COMPOSE) down --remove-orphans

build:
	$(FRONTEND_COMPOSE) build pocketbase web

logs:
	$(FRONTEND_COMPOSE) logs -f pocketbase web

e2e:
	@status=0; \
	$(E2E_COMPOSE) down --remove-orphans; \
	$(E2E_COMPOSE) up --build --remove-orphans --abort-on-container-exit --exit-code-from cypress pocketbase web cypress || status=$$?; \
	$(E2E_COMPOSE) down --remove-orphans; \
	exit $$status

e2e-open:
	$(MAKE) up
	npx cypress open --config baseUrl=http://127.0.0.1:3000

web-install:
	cd web && npm ci

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

# ── Tests (local, save-safe) ──────────────────────────────────────────────────

test: _save-backup
	@"$(GODOT_BIN)" --headless --path "$(GODOT_PROJ)" --script tests/run_structure_tests.gd; STATUS=$$?; \
	$(MAKE) -s _save-restore; exit $$STATUS

test-all: _save-backup
	@"$(GODOT_BIN)" --headless --path "$(GODOT_PROJ)" --script tests/run_structure_tests.gd && \
	"$(GODOT_BIN)" --headless --path "$(GODOT_PROJ)" --script tests/run_tutorial_tests.gd && \
	"$(GODOT_BIN)" --headless --path "$(GODOT_PROJ)" --script tests/run_narrative_paths_tests.gd && \
	"$(GODOT_BIN)" --headless --path "$(GODOT_PROJ)" --script tests/run_new_user_flow_tests.gd && \
	"$(GODOT_BIN)" --headless --path "$(GODOT_PROJ)" --script tests/run_later_missions_tests.gd && \
	"$(GODOT_BIN)" --headless --path "$(GODOT_PROJ)" --script tests/run_mission_e2e_flow_tests.gd; STATUS=$$?; \
	$(MAKE) -s _save-restore; exit $$STATUS

# ── Sandbox (VNC) ─────────────────────────────────────────────────────────────

sandbox-build:
	docker build -f Dockerfile.sandbox -t $(SANDBOX_IMAGE):local .

sandbox:
	docker compose -f docker-compose.sandbox.yml up --build

sandbox-vnc: sandbox-build
	docker compose -f docker-compose.sandbox.yml up -d
	@echo "Waiting for noVNC..."
	@until curl -sf http://localhost:6080/vnc.html > /dev/null; do sleep 1; done
	open http://localhost:6080/vnc.html

# ── UX Tour ───────────────────────────────────────────────────────────────────

ux-tour-build:
	@if [ -n "$(UX_TOUR_PLATFORM)" ]; then \
		docker build --platform $(UX_TOUR_PLATFORM) -t $(UX_TOUR_IMAGE) -f Dockerfile.ux-tour .; \
	else \
		docker build -t $(UX_TOUR_IMAGE) -f Dockerfile.ux-tour .; \
	fi

ux-tour: ## Run full UX screenshot tour (pulls image or builds locally)
	@if ! docker pull $(GHCR_UX_IMAGE) 2>/dev/null; then $(MAKE) ux-tour-build; \
	else docker tag $(GHCR_UX_IMAGE) $(UX_TOUR_IMAGE); fi
	@mkdir -p $(UX_TOUR_OUT)
	docker run --rm \
		-v "$(PWD)/scene:/app/scene" \
		-v "$(UX_TOUR_OUT):/output" \
		$(UX_TOUR_IMAGE) $(ARGS)
	@docker container prune -f 2>/dev/null; docker image rm -f $(UX_TOUR_IMAGE) 2>/dev/null; \
	docker volume prune -f 2>/dev/null; docker builder prune -f 2>/dev/null; true

ux-tour-m1:    ; $(MAKE) ux-tour ARGS="--mission=M1"
ux-tour-m2:    ; $(MAKE) ux-tour ARGS="--mission=M2"
ux-tour-m3:    ; $(MAKE) ux-tour ARGS="--mission=M3"
ux-tour-m4:    ; $(MAKE) ux-tour ARGS="--mission=M4"
ux-tour-sandbox: ; $(MAKE) ux-tour ARGS="--sandbox"
ux-tour-mining:  ; $(MAKE) ux-tour ARGS="--mining-only"

# ── CI ────────────────────────────────────────────────────────────────────────

ci-build:
	docker build --platform linux/amd64 -t $(CI_IMAGE) -f Dockerfile.ci .

ci-test: ci-build
	docker run --rm $(CI_IMAGE) npm run test:unit

ci-godot: ci-build
	docker run --rm $(CI_IMAGE) bash -c "cd scene && \
		/opt/godot/godot --headless --path . --script res://tests/run_sync_tests.gd && \
		/opt/godot/godot --headless --path . --script res://tests/run_mission_log_tests.gd && \
		/opt/godot/godot --headless --path . --script res://tests/run_tutorial_tests.gd && \
		/opt/godot/godot --headless --path . --script res://tests/run_experience_tests.gd && \
		/opt/godot/godot --headless --path . --script res://tests/run_bug_regression_tests.gd && \
		/opt/godot/godot --headless --path . --script res://tests/SupabaseTestRunner.gd"

ci-playwright:
	docker build --platform linux/amd64 -t $(PLAYWRIGHT_IMAGE) -f Dockerfile.playwright .
	docker run --rm $(PLAYWRIGHT_IMAGE)

ci-export: ci-build
	docker run --rm -v $(PWD)/electron-dist:/app/electron-dist $(CI_IMAGE) npm run godot:export:desktop

ci-all: ci-build
	docker run --rm $(CI_IMAGE) npm run test:all

ci-clean:
	docker rmi $(CI_IMAGE) || true

# ── Misc ──────────────────────────────────────────────────────────────────────

sync-lock:
	npm install --package-lock-only --legacy-peer-deps

ghactions:
	@command -v act >/dev/null || { echo "Install: brew install act"; exit 1; }
	act push -W .github/workflows/electron_release.yml \
		$(if $(SECRETS_FILE),--secret-file $(SECRETS_FILE),) \
		$(ACT_FLAGS)
