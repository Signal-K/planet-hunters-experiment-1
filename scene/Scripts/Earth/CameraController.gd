# CameraController.gd
# Handles camera movement and controls
class_name CameraController
extends Node

@export var scroll_speed: float = 500.0
var camera: Camera2D

func initialize(camera_node: Camera2D) -> void:
	camera = camera_node

func _process(delta: float) -> void:
	if not camera:
		return
		
	if Input.is_action_pressed("ui_left"):
		camera.global_position.x -= scroll_speed * delta
	
	if Input.is_action_pressed("ui_right"):
		camera.global_position.x += scroll_speed * delta