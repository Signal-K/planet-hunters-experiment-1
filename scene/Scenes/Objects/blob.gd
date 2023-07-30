extends CharacterBody2D

var direction: Vector2
var speed := 20
var push_distance := 130
var push_direction: Vector2

var health := 3:
	set(value):
		health = value
		if health <= 0:
			death()

@onready var player = get_tree().get_first_node_in_group("Player")

func _physics_process(delta: float) -> void:
	direction = (player.position - position).normalized()
	velocity = direction * speed + push_direction
	move_and_slide()

func push():
	var tween = get_tree().create_tween()
	var target = (player.position - position).normalized() * -1 * push_distance
	tween.tween_property(self, "push_direction", target, 0.1)
	tween.tween_property(self, "push_direction", Vector2.ZERO, 0.2)

func death():
	speed = 0
	$AnimationPlayer.current_animation = 'explode'

func _ready():
	$AnimationPlayer.play("move")

func hit(tool: Enums.Tool):
	if tool == Enums.Tool.SWORD:
		push()
		$FlashSprite2d.flash()
		health -= 1
