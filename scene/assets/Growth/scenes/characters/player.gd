extends CharacterBody2D

var direction: Vector2
var facing_direction: Vector2 = Vector2.DOWN  # Default facing down
var last_direction: Vector2 = Vector2.ZERO
var speed := 50

var can_move: bool = true

@onready var animation_tree = $Animation/AnimationTree
@onready var move_state_machine = $Animation/AnimationTree.get("parameters/MoveStateMachine/playback")
@onready var tool_state_machine = $Animation/AnimationTree.get("parameters/ToolStateMachine/playback")
@onready var tool_ui = $ToolUI

var current_tool: Enums.Tool
var current_seed: Enums.Seed

signal tool_use(tool: Enums.Tool, pos: Vector2)
signal day_change

func _ready():
	animation_tree.active = true

func _physics_process(_delta: float) -> void:
	if can_move:
		get_basic_inputs()
		move()
		animate()
		
	if direction:
		last_direction = direction
		var ray_y = int(direction.y) if not direction.x else 0
		$RayCast2D.target_position = (Vector2(direction.x, ray_y).normalized() * 20)
	
func _on_player_day_change() -> void:
	day_restart()

func day_restart() -> void:
	day_change_emit()
	
func get_basic_inputs():
	if Input.is_action_just_pressed("tool_forward") or Input.is_action_just_pressed("tool_backward"):
		var dir = Input.get_axis("tool_backward", "tool_forward")
		current_tool = posmod(current_tool + int(dir), Enums.Tool.size()) as Enums.Tool
		tool_ui.reveal(true)
	
	if Input.is_action_just_pressed("seed_change"):
		current_seed = posmod(current_seed + 1, Enums.Seed.size()) as Enums.Seed
		$ToolUI.reveal(false)
	
	if Input.is_action_just_pressed("action"):
		if not $RayCast2D.get_collider():
			tool_state_machine.travel(Data.TOOL_STATE_ANIMATIONS[current_tool])
			$Animation/AnimationTree.set("parameters/ToolOneShot/request", AnimationNodeOneShot.ONE_SHOT_REQUEST_FIRE)
		else:
			$RayCast2D.get_collider().interact(self)

func move():
	direction = Input.get_vector("left", "right", "up", "down")
	velocity = direction * speed
	move_and_slide()
	
func animate():
	if direction:
		# Update facing direction when moving
		facing_direction = Vector2(round(direction.x), round(direction.y))
		move_state_machine.travel('Walk')
		var direction_animation = Vector2(round(direction.x), round(direction.y))
		$Animation/AnimationTree.set('parameters/MoveStateMachine/Idle/blend_position', direction_animation)
		$Animation/AnimationTree.set('parameters/MoveStateMachine/Walk/blend_position', direction_animation)
		for animation in Data.TOOL_STATE_ANIMATIONS.values():
			var animation_name: String = "parameters/ToolStateMachine/" + animation +  "/blend_position"
			$Animation/AnimationTree.set(animation_name, direction_animation)
	else:
		move_state_machine.travel('Idle')
		# Use persistent facing direction for idle animations
		$Animation/AnimationTree.set('parameters/MoveStateMachine/Idle/blend_position', facing_direction)
		for animation in Data.TOOL_STATE_ANIMATIONS.values():
			var animation_name: String = "parameters/ToolStateMachine/" + animation +  "/blend_position"
			$Animation/AnimationTree.set(animation_name, facing_direction)

func tool_use_emit():
	# Calculate target position based on facing direction
	var target_pos = position + (facing_direction * Data.TILE_SIZE)
	print("Emitting tool_use signal: ", current_tool, " facing: ", facing_direction, " target pos: ", target_pos)
	tool_use.emit(current_tool, target_pos)

func _on_animation_tree_animation_started(_anim_name: StringName) -> void:
	can_move = false
	
func _on_animation_tree_animation_finished(_anim_name: StringName) -> void:
	can_move = true
 
func day_change_emit():
	day_change.emit()
	pass
