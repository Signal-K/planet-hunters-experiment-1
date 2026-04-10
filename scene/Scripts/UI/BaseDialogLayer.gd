extends CanvasLayer
## BaseDialogLayer.gd
## Base class for all modal dialogs (CanvasLayer-based overlays).
##
## Provides:
##   - Dark backdrop
##   - Glass-styled panel at Center/Panel
##   - close() method + dialog_closed signal
##   - _on_dialog_ready() virtual hook called after backdrop + panel are styled
##
## Usage: extend this class from dialog-specific scripts.
## The .tscn root node should be type="CanvasLayer" with script attached.
## Required node tree:
##   CanvasLayer
##   ├── Backdrop  (ColorRect, full-screen)
##   └── Center    (CenterContainer, full-screen)
##       └── Panel (PanelContainer)

class_name BaseDialogLayer

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

## Layer index (above HUD at 20, below system alerts at 128).
const DIALOG_LAYER := 80
## Default backdrop opacity.
const BACKDROP_ALPHA := 0.70

signal dialog_closed

func _ready() -> void:
	layer = DIALOG_LAYER
	_setup_backdrop()
	_setup_panel_style()
	_on_dialog_ready()

func _setup_backdrop() -> void:
	var bg := get_node_or_null("Backdrop") as ColorRect
	if bg == null:
		return
	bg.color = Color(0, 0, 0, BACKDROP_ALPHA)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP

func _setup_panel_style() -> void:
	var panel := _find_main_panel()
	if panel == null:
		return
	var s := StyleBoxFlat.new()
	s.bg_color     = Color(0.06, 0.10, 0.16, 0.97)
	s.border_color = Color(0.28, 0.88, 0.96, 0.68)
	s.set_border_width_all(1)
	s.set_corner_radius_all(18)
	s.shadow_color  = Color(0.01, 0.03, 0.06, 0.40)
	s.shadow_size   = 32
	s.shadow_offset = Vector2(0, 12)
	# Zero content margins — child containers handle their own padding
	s.content_margin_left   = 0
	s.content_margin_right  = 0
	s.content_margin_top    = 0
	s.content_margin_bottom = 0
	panel.add_theme_stylebox_override("panel", s)

## Returns the main PanelContainer. Expects Center/Panel in the scene tree.
func _find_main_panel() -> PanelContainer:
	return get_node_or_null("Center/Panel") as PanelContainer

## Override in subclasses to wire up content after the base styling is done.
## All @onready vars are resolved before this is called.
func _on_dialog_ready() -> void:
	pass

## Close the dialog, emit signal, and free from tree.
func close() -> void:
	dialog_closed.emit()
	queue_free()
