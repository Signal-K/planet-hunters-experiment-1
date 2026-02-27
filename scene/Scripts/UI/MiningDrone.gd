extends Node2D

signal exploded(position: Vector2, region: Dictionary)

enum State { DEPLOYING, SEEKING, EXPLODING, DONE }

const DEPLOY_SPEED = 400.0
const SEEK_SPEED = 500.0
const ROTATION_SPEED = 8.0

var state = State.DEPLOYING
var target_region = null
var _velocity = Vector2.ZERO
var _lifetime = 0.0
var _available_for_deploy := true

@onready var sprite: ColorRect = $Sprite
@onready var particles: CPUParticles2D = $Particles

func _ready():
	particles.emitting = false
	visible = false
	_set_available_for_deploy(true)

func deploy(start_pos: Vector2):
	_set_available_for_deploy(false)
	visible = true
	sprite.visible = true
	particles.emitting = false
	_lifetime = 0.0
	target_region = null
	position = start_pos
	_velocity = Vector2(0, DEPLOY_SPEED)  # Straight down
	state = State.DEPLOYING

func set_target(region):
	target_region = region
	state = State.SEEKING

func _process(delta):
	_lifetime += delta
	
	match state:
		State.DEPLOYING:
			position += _velocity * delta
			rotation += ROTATION_SPEED * delta
			if _lifetime > 0.2:  # Faster transition to seeking
				state = State.SEEKING
		
		State.SEEKING:
			if target_region and not target_region.collected:
				var target_pos = Vector2(target_region.x + target_region.width / 2, target_region.poly.polygon[0].y + 20)
				# Move straight down toward target
				_velocity = Vector2(0, SEEK_SPEED)
				position += _velocity * delta
				rotation = lerp_angle(rotation, PI, delta * 5)  # Point downward
				
				if position.y >= target_pos.y:
					_explode()
			else:
				_explode()
		
		State.EXPLODING:
			if _lifetime > 0.8:
				state = State.DONE
				_set_available_for_deploy(true)
				visible = false
				particles.emitting = false

func _explode():
	state = State.EXPLODING
	_lifetime = 0.0
	sprite.visible = false
	particles.emitting = true
	particles.amount = 20
	particles.lifetime = 0.5
	particles.explosiveness = 1.0
	particles.initial_velocity_min = 50
	particles.initial_velocity_max = 150
	if target_region:
		target_region.collected = true
		target_region.poly.modulate = Color(0.2, 0.2, 0.2, 0.3)
	exploded.emit(position, target_region if target_region else {})

func is_available_for_deploy() -> bool:
	return _available_for_deploy

func _set_available_for_deploy(value: bool) -> void:
	_available_for_deploy = value
	set_process(not value)
