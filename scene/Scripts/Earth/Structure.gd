# Structure.gd
# Base class for all interactive structures on Earth
class_name Structure
extends Node2D

@export var structure_name: String = "Structure"
@export var interactive: bool = true

var is_hovered: bool = false

func _ready() -> void:
	if interactive:
		_setup_interaction()

func _setup_interaction() -> void:
	"""Setup mouse input for this structure"""
	# Enable input processing
	set_process_unhandled_input(true)
	
	# Get the sprite child for collision detection
	var sprite = get_node("Sprite2D")
	if sprite and sprite.texture:
		# Create a collision area for mouse detection
		var area = Area2D.new()
		var collision_shape = CollisionShape2D.new()
		var rect_shape = RectangleShape2D.new()
		
		# Set the collision shape to match the sprite size and position
		var texture_size = sprite.texture.get_size()
		rect_shape.size = texture_size * sprite.scale
		
		collision_shape.shape = rect_shape
		# Position the collision shape to match the sprite's position
		collision_shape.position = sprite.position
		
		area.add_child(collision_shape)
		add_child(area)
		
		# Connect area signals
		area.input_event.connect(_on_input_event)
		area.mouse_entered.connect(on_hover_enter)
		area.mouse_exited.connect(on_hover_exit)
		
		print("Interaction setup complete for: ", structure_name, " at position: ", sprite.position)

func on_interact() -> void:
	"""Called when this structure is clicked/interacted with"""
	print("Interacting with: ", structure_name)

func on_hover_enter() -> void:
	"""Called when mouse enters structure"""
	is_hovered = true
	print("Hovering over: ", structure_name)

func on_hover_exit() -> void:
	"""Called when mouse leaves structure"""
	is_hovered = false
	print("Left: ", structure_name)

func _on_input_event(viewport: Node, event: InputEvent, shape_idx: int) -> void:
	"""Handle mouse input events"""
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			print("Mouse clicked on: ", structure_name)
			on_interact()