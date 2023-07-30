extends CharacterBody2D

signal plantSeed

@onready var animated_sprite_2d = $AnimatedSprite2D

@export var move_speed: float = 70.0

var direction: Vector2 = Vector2.ZERO

func _ready():
	# Start with the front animation
	animated_sprite_2d.play("front")

func _physics_process(delta):
	direction = Vector2.ZERO
	
	if Input.is_action_pressed("move_left"):
		animated_sprite_2d.play("side")
		animated_sprite_2d.flip_h = true
		direction = Vector2.LEFT
		
	elif Input.is_action_pressed("move_right"):
		animated_sprite_2d.play("side")
		animated_sprite_2d.flip_h = false
		direction = Vector2.RIGHT
		
	elif Input.is_action_pressed("back"):
		animated_sprite_2d.play("back")
		animated_sprite_2d.flip_h = false
		direction = Vector2.UP
		
	elif Input.is_action_pressed("forward"):
		animated_sprite_2d.play("front")
		animated_sprite_2d.flip_h = false
		direction = Vector2.DOWN
	else:
		# Stop animation when not moving
		animated_sprite_2d.stop()
		
	if Input.is_action_just_pressed("plantSeed"):
		emit_signal("plantSeed")
		
	velocity = direction * move_speed
	move_and_slide()
