# Landnam Preview

This VS Code/Cursor extension owns the editor preview lifecycle. It opens one
workspace-scoped, anonymous stage fixture, starts the stack only when its dev
bridge is unavailable, and exposes the follower's heartbeat in the status bar.
It never uses a signed-in account or persisted player progress.

Both Codex and Claude keep using `node scripts/scene.mjs <scene> --check`.
Neither agent needs editor-specific automation.

Commands: `Landnam Preview: Open`, `Landnam Preview: Restart preview`, and
`Landnam Preview: Show status`.
