extends RefCounted
class_name RocketSpriteHelper

static var _stage2_frames: SpriteFrames = null
static var _launch_frames: SpriteFrames = null

static func apply_orbit_sprite(sprite: AnimatedSprite2D, rocket_id: String) -> void:
	if sprite == null:
		return
	sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var rocket_type = _rocket_type_from_id(rocket_id)
	if rocket_type == "starterrocket1" or rocket_type == "starterrocket2":
		sprite.sprite_frames = _get_stage2_sprite_frames()
		sprite.animation = &"default"
		sprite.play()
		return
	var frames := SpriteFrames.new()
	if not frames.has_animation("default"):
		frames.add_animation("default")
	frames.set_animation_speed("default", 1.0)
	frames.set_animation_loop("default", false)
	frames.add_frame("default", _rocket_texture_for_id(rocket_id))
	sprite.sprite_frames = frames
	sprite.animation = &"default"
	sprite.stop()

static func apply_launch_sprite(sprite: AnimatedSprite2D, rocket_id: String) -> void:
	if sprite == null:
		return
	sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var rocket_type = _rocket_type_from_id(rocket_id)
	if rocket_type == "starterrocket1":
		sprite.sprite_frames = _get_launch_sprite_frames()
		sprite.animation = &"default"
		sprite.play()
		return
	apply_orbit_sprite(sprite, rocket_id)

static func _get_stage2_sprite_frames() -> SpriteFrames:
	if _stage2_frames != null:
		return _stage2_frames
	var frames := SpriteFrames.new()
	if not frames.has_animation("default"):
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

static func _get_launch_sprite_frames() -> SpriteFrames:
	if _launch_frames != null:
		return _launch_frames
	var frames := SpriteFrames.new()
	if not frames.has_animation("default"):
		frames.add_animation("default")
	frames.set_animation_speed("default", 20.0)
	frames.set_animation_loop("default", true)
	var sheet: Texture2D = load("res://assets/Vehicles/StarterRocket1LaunchSpritesheet.png")
	if sheet == null:
		# Fallback to orbit stage frames when launch sheet is unavailable.
		_launch_frames = _get_stage2_sprite_frames()
		return _launch_frames
	var frame_size := Vector2i(170, 256)
	var columns := int(sheet.get_width() / frame_size.x)
	var rows := int(sheet.get_height() / frame_size.y)
	for y in range(rows):
		for x in range(columns):
			var atlas := AtlasTexture.new()
			atlas.atlas = sheet
			atlas.region = Rect2(x * frame_size.x, y * frame_size.y, frame_size.x, frame_size.y)
			frames.add_frame("default", atlas)
	_launch_frames = frames
	return frames

static func _rocket_texture_for_id(rocket_id: String) -> Texture2D:
	var rocket_type = _rocket_type_from_id(rocket_id)
	var textures = {
		"starterrocket1": "res://assets/Vehicles/StarterRocket1.png",
		"starterrocket2": "res://assets/Vehicles/Starter Rocket L2.png"
	}
	var path = str(textures.get(rocket_type, textures["starterrocket1"]))
	return load(path)

static func _rocket_type_from_id(rocket_id: String) -> String:
	if rocket_id.find("-") != -1:
		var parts = rocket_id.split("-")
		if parts.size() > 0:
			return str(parts[0])
	return rocket_id
