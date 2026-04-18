extends CanvasLayer
class_name BaseDialogLayer

## Base class for all modal dialogs (CanvasLayer-based overlays).
## Terminal Ethereal: SURFACE_BRIGHT frosted backdrop, SURFACE_LOWEST panel,
## xl radius (24px), Cyan-Mist shadow. No border.
## Required scene tree:
##   CanvasLayer
##   ├── Backdrop  (ColorRect, full-screen)
##   └── Center    (CenterContainer, full-screen)
##       └── Panel (PanelContainer)

const DIALOG_LAYER   := 80
const BACKDROP_ALPHA := 0.82

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
	bg.color = Color(0.988, 0.996, 0.992, BACKDROP_ALPHA)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP

func _setup_panel_style() -> void:
	var panel := _find_main_panel()
	if panel == null:
		return
	var s := StyleBoxFlat.new()
	s.bg_color     = Color(1.0, 1.0, 1.0, 1.0)
	s.set_border_width_all(0)
	s.set_corner_radius_all(24)
	s.shadow_color  = Color(0.0, 0.424, 0.361, 0.12)
	s.shadow_size   = 40
	s.shadow_offset = Vector2(0, 16)
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
