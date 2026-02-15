.PHONY: kanban supabase-check godot godot-dev godot-env

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
