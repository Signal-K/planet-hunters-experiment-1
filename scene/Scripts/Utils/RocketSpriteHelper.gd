extends RefCounted
class_name RocketSpriteHelper

static var _stage2_frames: SpriteFrames = null

static func apply_orbit_sprite(sprite: AnimatedSprite2D, rocket_id: String) -> void:
	if sprite == null:
		return
	var rocket_type = _rocket_type_from_id(rocket_id)
	if rocket_type == "starterrocket1":
		sprite.sprite_frames = _get_stage2_sprite_frames()
		sprite.animation = &"default"
		sprite.play()
		return
	var frames := SpriteFrames.new()
	frames.add_animation("default")
	frames.set_animation_speed("default", 1.0)
	frames.set_animation_loop("default", false)
	frames.add_frame("default", _rocket_texture_for_id(rocket_id))
	sprite.sprite_frames = frames
	sprite.animation = &"default"
	sprite.stop()

static func _get_stage2_sprite_frames() -> SpriteFrames:
	if _stage2_frames != null:
		return _stage2_frames
	var frames := SpriteFrames.new()
	frames.add_animation("default")
	frames.set_animation_speed("default", 8.0)
	frames.set_animation_loop("default", true)
	var paths = [
		"res://assets/Vehicles/StarterRocketStage2Frame1.png",
		"res://assets/Vehicles/StarterRocketStage2Frame2.png",
		"res://assets/Vehicles/StarterRocketStage2Frame3.png",
		"res://assets/Vehicles/StarterRocketStage2Frame4.png",
		"res://assets/Vehicles/StarterRocketStage2Frame5.png",
		"res://assets/Vehicles/StarterRocketStage2Frame6.png",
		"res://assets/Vehicles/StarterRocketStage2Frame7.png",
		"res://assets/Vehicles/StarterRocketStage2Frame8.png"
	]
	for path in paths:
		frames.add_frame("default", load(path))
	_stage2_frames = frames
	return frames

static func _rocket_texture_for_id(rocket_id: String) -> Texture2D:
	var rocket_type = _rocket_type_from_id(rocket_id)
	var textures = {
		"starterrocket1": preload("res://assets/Vehicles/StarterRocket1.png")
	}
	return textures.get(rocket_type, textures["starterrocket1"])

static func _rocket_type_from_id(rocket_id: String) -> String:
	if rocket_id.find("-") != -1:
		var parts = rocket_id.split("-")
		if parts.size() > 0:
			return str(parts[0])
	return rocket_id
