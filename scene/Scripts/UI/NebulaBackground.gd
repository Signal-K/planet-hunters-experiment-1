extends ColorRect
class_name NebulaBackground

const NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")

@onready var _gradient_texture := GradientTexture2D.new()

func _ready() -> void:
	var NebulaTheme = NebulaTheme
	
	# Create gradient
	var gradient = NebulaTheme.create_nebula_gradient()
	_gradient_texture.gradient = gradient
	_gradient_texture.fill_from = Vector2(0, 0)
	_gradient_texture.fill_to = Vector2(1, 1)
	
	# Apply as material
	var mat = CanvasItemMaterial.new()
	material = mat
	
	# Add star particles
	_add_stars()

func _add_stars() -> void:
	var particles = CPUParticles2D.new()
	particles.amount = 200
	particles.lifetime = 10.0
	particles.preprocess = 5.0
	particles.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	particles.emission_rect_extents = Vector2(2000, 2000)
	particles.direction = Vector2.ZERO
	particles.spread = 0
	particles.gravity = Vector2.ZERO
	particles.initial_velocity_min = 0
	particles.initial_velocity_max = 0
	particles.scale_amount_min = 0.5
	particles.scale_amount_max = 2.0
	particles.color = Color(1, 1, 1, 0.8)
	add_child(particles)