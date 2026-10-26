# Landnam Preview

This VS Code/Cursor extension is a thin web preview. It embeds one
workspace-scoped, anonymous stage fixture and exposes the follower heartbeat in
the status bar. The bridge translates ordinary game-screen targets and authored
scene files into populated, disposable stage fixtures, so it never uses a
signed-in account, persisted player progress, or the Studio grid.

The panel points straight at the local web server. Run `make ensure` separately
when the server is not already running. Scene updates use normal web hot reload
and the page bridge, so they do not require reloading Cursor.

Both Codex and Claude keep using `node scripts/scene.mjs <scene> --check`.
Neither agent needs editor-specific automation.

Commands: `Landnam Preview: Open`, `Landnam Preview: Restart preview`, and
`Landnam Preview: Show status`.
