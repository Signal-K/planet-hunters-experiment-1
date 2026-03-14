# Local development targets
.PHONY: kanban supabase-check godot godot-dev godot-env ci-build ci-test ci-godot ci-export ci-all ci-clean ci-full-run sync-lock

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
	docker build -t $(IMAGE_NAME) -f Dockerfile.ci .

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
		/opt/godot/godot --headless --path . --script res://tests/SupabaseTestRunner.gd"

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

# Sync package-lock.json (to fix npm ci issues)
sync-lock:
	@echo "Syncing package-lock.json..."
	npm install --package-lock-only --legacy-peer-deps
	@echo "package-lock.json updated."
