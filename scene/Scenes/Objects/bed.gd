extends StaticBody2D

func interact(player: CharacterBody2D):
	player.day_change_emit()
