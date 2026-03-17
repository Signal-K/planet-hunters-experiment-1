# Local development targets
.PHONY: kanban supabase-check godot godot-dev godot-env ci-build ci-test ci-godot ci-playwright ci-export ci-all ci-clean ci-full-run sync-lock ghactions

kanban:
	@echo "Starting knowns browser without opening a browser tab..."
	@BROWSER=echo knowns browser

# Check if Supabase is running, start if not
supabase-check:
	@echo "Checking if Supabase is running..."
	@if ! curl -s -f -m 5 http://127.0.0.1:54323/project/default > /dev/null 2>&1; then \
		echo "Supabase is not running. Starting Supabase..."; \
		cd /Users/scroobz/Navigation/client && supabase start; \
	else \
		echo "Supabase is already running."; \
	fi

# Open Godot project
godot:
	@echo "Opening Godot project..."
	open -a Godot --args --path ./project

# Main target: ensure Supabase is running, then open Godot
godot-dev: supabase-check godot
	@echo "Godot development environment ready!"

# Alias for godot-dev
godot-env: godot-dev

# CI targets (mimics GitHub Actions)
IMAGE_NAME=planet-hunters-ci

# Build the CI docker image
ci-build:
	@echo "Building CI docker image..."
	docker build --platform linux/amd64 -t $(IMAGE_NAME) -f Dockerfile.ci .

# Run basic tests (unit tests)
ci-test: ci-build
	@echo "Running basic tests in Docker..."
	docker run --rm $(IMAGE_NAME) npm run test:unit

# Run Godot tests (all Godot test scripts)
ci-godot: ci-build
	@echo "Running all Godot tests in Docker..."
	docker run --rm $(IMAGE_NAME) bash -c "cd scene && \
		/opt/godot/godot --headless --path . --script res://tests/run_sync_tests.gd && \
		/opt/godot/godot --headless --path . --script res://tests/run_mission_log_tests.gd && \
		/opt/godot/godot --headless --path . --script res://tests/run_tutorial_tests.gd && \
		/opt/godot/godot --headless --path . --script res://tests/run_experience_tests.gd && \
		/opt/godot/godot --headless --path . --script res://tests/run_bug_regression_tests.gd && \
		/opt/godot/godot --headless --path . --script res://tests/SupabaseTestRunner.gd"

# Run Playwright e2e tests in Docker using Firefox (avoids Chrome QEMU crash on Apple Silicon).
# Builds from the cached linux/amd64 node layer — no Docker Hub pull needed.
# GitHub Actions uses ci-all (Dockerfile.ci, native x86_64, all browsers) instead.
PLAYWRIGHT_IMAGE_NAME=planet-hunters-playwright

ci-playwright:
	@echo "Building Playwright Docker image..."
	docker build --platform linux/amd64 -t $(PLAYWRIGHT_IMAGE_NAME) -f Dockerfile.playwright .
	@echo "Running Playwright e2e tests in Docker (Firefox)..."
	docker run --rm $(PLAYWRIGHT_IMAGE_NAME)

# Run Godot export
ci-export: ci-build
	@echo "Exporting Godot web assets in Docker..."
	docker run --rm -v $(PWD)/electron-dist:/app/electron-dist $(IMAGE_NAME) npm run godot:export:desktop

# Run all CI tests (unit + godot + e2e)
ci-all: ci-build
	@echo "Running all tests in Docker (Unit, Godot, E2E)..."
	docker run --rm $(IMAGE_NAME) npm run test:all

# Run full CI cycle (build, test, clean)
ci-full-run: ci-build ci-all ci-clean
	@echo "Full CI cycle completed and cleaned up."

# Cleanup Docker image and intermediate build artifacts
ci-clean:
	@echo "Cleaning up CI Docker image..."
	docker rmi $(IMAGE_NAME) || true
	@echo "Done."

# Run GitHub Actions pipeline locally via act (simulates GitHub Actions in Docker)
# Requires: brew install act
# Optional: pass ACT_FLAGS="--job basic-tests" to run a specific job
# Optional: pass SECRETS_FILE=".secrets" to provide secrets (e.g. VERCEL_TOKEN=xxx)
ghactions:
	@echo "Running GitHub Actions pipeline locally via act..."
	@command -v act >/dev/null 2>&1 || { echo "Error: 'act' is not installed. Install with: brew install act"; exit 1; }
	act push \
		-W .github/workflows/electron_release.yml \
		$(if $(SECRETS_FILE),--secret-file $(SECRETS_FILE),) \
		$(ACT_FLAGS)

# Sync package-lock.json (to fix npm ci issues)
sync-lock:
	@echo "Syncing package-lock.json..."
	npm install --package-lock-only --legacy-peer-deps
	@echo "package-lock.json updated."
