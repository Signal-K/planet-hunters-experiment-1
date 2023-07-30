class_name PlantResource extends Resource

@export var texture: Texture2D
@export var icon_texture: Texture2D
@export var grow_speed: float = 1.0
@export var h_frames: int = 3
@export var death_max: int = 3
@export var name: String

var age: float
var death_count: int = 0
var dead: bool:
	set(value):
		dead = value
		emit_changed()

func setup(seed_enum: Enums.Seed):
	var tex_val = Data.PLANT_DATA[seed_enum]['texture']
	if tex_val is String:
		texture = load(tex_val)
	elif tex_val is Texture2D:
		texture = tex_val
	else:
		texture = null

	var icon_val = Data.PLANT_DATA[seed_enum]['icon_texture']
	if icon_val is String:
		icon_texture = load(icon_val)
	elif icon_val is Texture2D:
		icon_texture = icon_val
	else:
		icon_texture = null
	grow_speed = Data.PLANT_DATA[seed_enum]['grow_speed']
	h_frames = Data.PLANT_DATA[seed_enum]['h_frames']
	death_max = Data.PLANT_DATA[seed_enum]['death_max']
	name = Data.PLANT_DATA[seed_enum]['name']

func grow(sprite: Sprite2D):
	if sprite:
		age += grow_speed
		# Frame should progress: 0, 1, 2 as age increases
		var frame = min(int(age), h_frames - 1)
		sprite.frame = frame
		death_count = 0
		print("Plant growing: age=%.2f, frame=%d, h_frames=%d, grow_speed=%.2f" % [age, frame, h_frames, grow_speed])

func decay(plant: StaticBody2D):
	death_count += 1
	if death_count >= death_max:
		emit_changed()
		plant.queue_free()

func get_complete():
	return int(age) >= h_frames - 1
