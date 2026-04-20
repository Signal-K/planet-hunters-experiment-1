extends Node

## UIConsistencyEnforcer — intentionally inert.
## Styling is now handled entirely by Themes/Light.tres (set as project default theme).
## Component scenes (Scenes/UI/Components/) handle variant styles (primary, danger).
## This autoload is kept registered to avoid missing-autoload errors in existing scenes
## but performs no operations.

func _ready() -> void:
	pass
