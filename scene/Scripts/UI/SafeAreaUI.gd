extends Node
## SafeAreaUI — autoload that reports device safe-area insets and orientation.
## Used by scenes that need to respect notches, home indicators, and status bars.

signal orientation_changed(is_portrait: bool)

var _is_portrait: bool = true

func _ready() -> void:
	_update_orientation()
	get_tree().root.size_changed.connect(_on_viewport_size_changed)

func _on_viewport_size_changed() -> void:
	var prev := _is_portrait
	_update_orientation()
	if _is_portrait != prev:
		emit_signal("orientation_changed", _is_portrait)

func _update_orientation() -> void:
	var size := get_viewport().get_visible_rect().size
	_is_portrait = size.y >= size.x

## Returns true if the device is in portrait orientation.
func is_portrait() -> bool:
	return _is_portrait

## Returns the safe-area insets as a Rect2.
## position = (left, top) insets, size = (right, bottom) insets.
func get_safe_insets() -> Rect2:
	# On desktop/editor there are no hardware notches; return zero insets.
	# On device, DisplayServer.get_display_safe_area() provides the safe rect.
	if DisplayServer.has_method("get_display_safe_area"):
		var safe: Rect2i = DisplayServer.get_display_safe_area()
		var screen: Rect2i = DisplayServer.screen_get_usable_rect()
		return Rect2(
			safe.position.x - screen.position.x,
			safe.position.y - screen.position.y,
			(screen.position.x + screen.size.x) - (safe.position.x + safe.size.x),
			(screen.position.y + screen.size.y) - (safe.position.y + safe.size.y)
		)
	return Rect2(0, 0, 0, 0)

## Returns the usable viewport rect after applying safe-area insets.
func get_safe_rect() -> Rect2:
	var vp := get_viewport().get_visible_rect()
	var ins := get_safe_insets()
	return Rect2(
		vp.position.x + ins.position.x,
		vp.position.y + ins.position.y,
		vp.size.x - ins.position.x - ins.size.x,
		vp.size.y - ins.position.y - ins.size.y
	)
