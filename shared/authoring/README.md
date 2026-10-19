# Landnam authoring sources

This folder is the player-visible game's editable source layer. It is intentionally plain text.

- `instructions/persistent.md` applies to every authoring pass until edited.
- `instructions/next.md` is consumed by the next authoring pass and then cleared through the authoring UI, with the change visible in git.
- `scenes/*.toml` describes scene objects and preview fixtures.
- `missions/*.toml` describes mission steps, availability and rewards.

The authoring studio must never invent a hidden format. “Convert to TOML” produces a diff for review; saving writes these files. Preview, web and native load the same declarations through platform adapters. Production account fixtures are read-only snapshots with secrets and personal data removed.

Each object has a stable `id`, `kind` and `slot`. Visible or interactive children are objects too. `asset`, `prefab`, `components`, `bindings` and nested `children` are optional additions, not alternatives to the object tree.
