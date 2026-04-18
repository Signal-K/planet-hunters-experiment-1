extends CanvasLayer
class_name BaseDialogLayer

## Base class for all modal dialogs (CanvasLayer-based overlays).
## Provides a light-mode backdrop + white panel, close() method, dialog_closed signal.
## Required scene tree:
##   CanvasLayer
##   ├── Backdrop  (ColorRect, full-screen)
##   └── Center    (CenterContainer, full-screen)
##       └── Panel (PanelContainer)

const DIALOG_LAYER   := 80
const BACKDROP_ALPHA := 0.50

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
	bg.color = Color(0.059, 0.090, 0.165, BACKDROP_ALPHA)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP

func _setup_panel_style() -> void:
	var panel := _find_main_panel()
	if panel == null:
		return
	var s := StyleBoxFlat.new()
	s.bg_color     = Color(1.0, 1.0, 1.0, 1.0)
	s.border_color = Color(0.886, 0.910, 0.941, 1.0)
	s.set_border_width_all(1)
	s.set_corner_radius_all(12)
	s.shadow_color  = Color(0.059, 0.090, 0.165, 0.20)
	s.shadow_size   = 32
	s.shadow_offset = Vector2(0, 8)
	s.content_margin_left   = 0
	s.content_margin_right  = 0
	s.content_margin_top    = 0
	s.content_margin_bottom = 0
	panel.add_theme_stylebox_override("panel", s)

func _find_main_panel() -> PanelContainer:
	return get_node_or_null("Center/Panel") as PanelContainer

func _on_dialog_ready() -> void:
	pass

func close() -> void:
	dialog_closed.emit()
	queue_free()
