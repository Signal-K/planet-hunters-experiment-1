extends Node2D

class_name Flower

@export var amount: int = 2
@export var plantItem: PlantData
@export var harvest_ready: bool = false

var index = 0

func _ready():
	# Connect the timer signal
	$Timer.timeout.connect(_on_timer_timeout)
	
	# Start with animation 0
	print("Flower spawned - playing animation: ", index)
	$AnimationPlayer.play(str(index))
	
	# Start the timer manually to trigger first growth
	$Timer.start(3.0)

func _on_timer_timeout():
	print("Timer timeout! Current index: ", index)
	
	# Only grow if not at max growth
	if index < 3:
		index += 1
		print("Growing to stage: ", index)
		$AnimationPlayer.play(str(index))
		
		# Restart timer for next growth stage
		$Timer.start(2.0)
	
	# Set harvest_ready to true when reaching the final growth stage (frame 3)
	if index >= 3:
		harvest_ready = true
		print("Plant fully grown and ready for harvest!")
		
func harvest() -> void:
	plantItem.quantity += amount
	queue_free()
