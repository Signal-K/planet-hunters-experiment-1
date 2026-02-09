extends CanvasLayer

const HIDE_AFTER_SECONDS := 6.0

@onready var panel: PanelContainer = $HintPanel
@onready var hint_label: Label = $HintPanel/Margin/Text

var _app_controller: Node = null
var _hint_version: int = 0

func _ready() -> void:
	layer = 20
	visible = false
	_apply_style()
	_connect_app_controller()

func _process(_delta: float) -> void:
	if _app_controller == null:
		_connect_app_controller()

func _apply_style() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var margin = panel.get_node_or_null("Margin")
	if margin and margin is Control:
		(margin as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
	hint_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel_style.apply_panel(panel)
	panel_style.apply_body(hint_label)

func _connect_app_controller() -> void:
	var root = get_tree().root
	if root == null:
		return
	var app = root.find_child("AppController", true, false)
	if app == null:
		return
	_app_controller = app
	if _app_controller.has_signal("tutorial_hint_requested"):
		var cb = Callable(self, "_on_tutorial_hint_requested")
		if not _app_controller.tutorial_hint_requested.is_connected(cb):
			_app_controller.tutorial_hint_requested.connect(cb)

func _on_tutorial_hint_requested(message: String) -> void:
	show_hint(message)

func show_hint(message: String) -> void:
	if message.strip_edges() == "":
		return
	_hint_version += 1
	var current_version = _hint_version
	hint_label.text = message.strip_edges()
	visible = true
	await get_tree().create_timer(HIDE_AFTER_SECONDS).timeout
	if current_version == _hint_version:
		visible = false
