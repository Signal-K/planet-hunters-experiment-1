extends StaticBody2D

func interact(_player):
	$AnimatedSprite2D.play("rain" if Data.forecast_rain else "sun")
	await get_tree().create_timer(3.0).timeout
	$AnimatedSprite2D.play("default")

func _on_timer_timeout() -> void:
	$AnimatedSprite2D.play("default")
