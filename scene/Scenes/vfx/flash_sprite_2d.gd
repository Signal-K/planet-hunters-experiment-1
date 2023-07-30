extends Sprite2D

func flash(start_duration: float = 0.2, end_duration: float = 0.2, callback_func: Callable = Callable()):
	var tween = create_tween()
	tween.tween_property(material, 'shader_parameter/Progress', 1.0, start_duration)
	if callback_func.is_valid():
		tween.tween_callback(callback_func)
	tween.tween_property(material, 'shader_parameter/Progress', 0.0, end_duration)
