extends Node
## Static utility for generating mining backgrounds

const MiningTargetTheme = preload("res://Scripts/UI/MiningTargetTheme.gd")

const PIXEL_BG_MIN_WIDTH = 160
const PIXEL_BG_MIN_HEIGHT = 90

static func generate_background(viewport_size: Vector2, target_theme: String, current_target_id: String, session_context: Dictionary) -> Texture2D:
	var target_palette = MiningTargetTheme.build_palette(target_theme, current_target_id, session_context)
	
	var pixel_w: int = max(PIXEL_BG_MIN_WIDTH, int(round(viewport_size.x / 8.0)))
	var pixel_h: int = max(PIXEL_BG_MIN_HEIGHT, int(round(viewport_size.y / 8.0)))
	
	var image := Image.create(pixel_w, pixel_h, false, Image.FORMAT_RGBA8)
	_fill_gradient(image)
	_draw_stars(image)
	_draw_planet_disc(image)
	_draw_cloud_haze(image)
	_draw_layered_ridges(image)
	_draw_foreground_flora(image)
	_apply_theme_tint(image, target_palette)
	_apply_pixel_texture(image)
	
	return ImageTexture.create_from_image(image)

static func _fill_gradient(image: Image) -> void:
	var width := image.get_width()
	var height := image.get_height()
	var colors := [
		Color8(30, 35, 54),
		Color8(42, 46, 71),
		Color8(62, 52, 76),
		Color8(78, 57, 79)
	]
	for y in range(height):
		var t := float(y) / float(max(height - 1, 1))
		var c := _sample_palette(colors, pow(t, 0.85))
		for x in range(width):
			image.set_pixel(x, y, c)

static func _sample_palette(colors: Array, t: float) -> Color:
	if colors.size() <= 1:
		return colors[0] if colors.size() == 1 else Color.BLACK
	var scaled := clampf(t, 0.0, 1.0) * float(colors.size() - 1)
	var index := int(floor(scaled))
	var next_index: int = min(index + 1, colors.size() - 1)
	var local_t := scaled - float(index)
	return (colors[index] as Color).lerp(colors[next_index] as Color, local_t)

static func _draw_stars(image: Image) -> void:
	var width := image.get_width()
	var height := image.get_height()
	var rng := RandomNumberGenerator.new()
	rng.seed = 0x534B5931
	for _i in range(90):
		var x := rng.randi_range(0, width - 1)
		var y := rng.randi_range(0, int(height * 0.5))
		var c := Color8(209, 216, 238, rng.randi_range(90, 190))
		image.set_pixel(x, y, c)

static func _draw_planet_disc(image: Image) -> void:
	var width := image.get_width()
	var height := image.get_height()
	var center := Vector2(float(width) * 0.34, float(height) * 0.34)
	var radius: float = float(min(width, height)) * 0.23
	var planet_colors := [
		Color8(114, 82, 116, 220),
		Color8(138, 91, 126, 220),
		Color8(88, 66, 101, 225)
	]
	for y in range(max(0, int(center.y - radius * 1.2)), min(height, int(center.y + radius * 1.2))):
		for x in range(max(0, int(center.x - radius * 1.2)), min(width, int(center.x + radius * 1.2))):
			var dx: float = float(x) - center.x
			var dy: float = float(y) - center.y
			var dist: float = sqrt(dx * dx + dy * dy) / max(radius, 1.0)
			if dist <= 1.0:
				var shade_t: float = clampf((dy / radius + 1.0) * 0.5, 0.0, 1.0)
				var base := _sample_palette(planet_colors, shade_t)
				if ((x + y) % 11) == 0:
					base = base.lightened(0.1)
				if ((x * 2 + y) % 13) == 0:
					base = base.darkened(0.14)
				var src: Color = image.get_pixel(x, y)
				image.set_pixel(x, y, src.lerp(base, 0.78))
				if absf(dy + radius * 0.26) < 1.5 or absf(dy - radius * 0.02) < 1.5:
					image.set_pixel(x, y, src.lerp(Color8(168, 132, 172, 200), 0.6))
				elif dist <= 1.08:
					var alpha: float = 1.0 - ((dist - 1.0) / 0.08)
					var edge_src: Color = image.get_pixel(x, y)
					image.set_pixel(x, y, edge_src.lerp(Color8(169, 140, 182, int(alpha * 160.0)), alpha * 0.35))

static func _draw_cloud_haze(image: Image) -> void:
	var width := image.get_width()
	var height := image.get_height()
	var rng := RandomNumberGenerator.new()
	rng.seed = 0x434C4453
	for _band in range(14):
		var y: int = rng.randi_range(int(height * 0.14), int(height * 0.62))
		var x_start: int = rng.randi_range(-20, width - 20)
		var cloud_w: int = rng.randi_range(16, 46)
		var cloud_h: int = rng.randi_range(2, 5)
		var haze := Color8(214, 205, 220, rng.randi_range(35, 75))
		for ix in range(max(0, x_start), min(width, x_start + cloud_w)):
			for iy in range(max(0, y - cloud_h), min(height, y + cloud_h)):
				if absf(float(iy - y)) <= float(cloud_h) * (1.0 - absf(float(ix - x_start - cloud_w / 2)) / max(float(cloud_w) * 0.5, 1.0)):
					var src := image.get_pixel(ix, iy) as Color
					image.set_pixel(ix, iy, src.lerp(haze, 0.35))

static func _draw_layered_ridges(image: Image) -> void:
	var width := image.get_width()
	var height := image.get_height()
	var horizon_y: int = int(height * 0.63)
	var rng := RandomNumberGenerator.new()
	rng.seed = 0x41355374
	var ridge_colors := [Color8(132, 119, 152), Color8(116, 100, 136), Color8(98, 84, 120)]
	for layer in range(3):
		var y_base: int = horizon_y + layer * 8
		var color: Color = ridge_colors[layer]
		var x: int = 0
		var peak_y: int = y_base
		while x < width + 16:
			var seg_w: int = rng.randi_range(6, 14)
			var y_delta: int = rng.randi_range(-8 - layer * 2, 10 + layer * 2)
			peak_y = clampi(peak_y + y_delta, y_base - (28 + layer * 8), y_base + 4)
			for ix in range(x, min(width, x + seg_w)):
				for iy in range(max(0, peak_y), height):
					var c := color
					if ((ix + iy + layer) % 9) == 0:
						c = c.lightened(0.06)
					image.set_pixel(ix, iy, c)
			x += seg_w
	for y in range(horizon_y, height):
		var dust := Color8(82, 66, 100)
		for x in range(width):
			var c := dust
			if ((x + y) % 8) == 0:
				c = c.lightened(0.1)
			elif ((x * 3 + y) % 13) == 0:
				c = c.darkened(0.12)
			image.set_pixel(x, y, c)

static func _draw_foreground_flora(image: Image) -> void:
	var width := image.get_width()
	var height := image.get_height()
	var ground_y: int = int(height * 0.78)
	var rng := RandomNumberGenerator.new()
	rng.seed = 0x464C4F52
	for _i in range(max(10, width / 22)):
		var x: int = rng.randi_range(0, width - 1)
		var y: int = rng.randi_range(ground_y - 2, min(height - 4, ground_y + 8))
		var stem_h: int = rng.randi_range(2, 6)
		for sy in range(0, stem_h):
			if y + sy < height:
				image.set_pixel(x, y + sy, Color8(38, 22, 44))
		var crown_w: int = rng.randi_range(3, 6)
		for cx in range(-crown_w, crown_w + 1):
			var px: int = x + cx
			if px < 0 or px >= width:
				continue
			var py: int = y - stem_h + int(absf(float(cx)) * 0.25)
			if py >= 0 and py < height:
				image.set_pixel(px, py, Color8(121, 32, 70))
				if py + 1 < height and (cx % 2 == 0):
					image.set_pixel(px, py + 1, Color8(90, 24, 58))

static func _apply_theme_tint(image: Image, target_palette: Dictionary) -> void:
	var tint: Color = target_palette.get("bg_tint", Color(1, 1, 1, 1))
	var strength: float = float(target_palette.get("bg_tint_strength", 0.0))
	if strength <= 0.001:
		return
	var width := image.get_width()
	var height := image.get_height()
	for y in range(height):
		for x in range(width):
			var src := image.get_pixel(x, y) as Color
			image.set_pixel(x, y, src.lerp(tint, strength))

static func _apply_pixel_texture(image: Image) -> void:
	var width := image.get_width()
	var height := image.get_height()
	var rng := RandomNumberGenerator.new()
	rng.seed = 0x50495845
	for y in range(height):
		for x in range(width):
			var n := rng.randf()
			if n < 0.065:
				var c := image.get_pixel(x, y) as Color
				image.set_pixel(x, y, c.darkened(0.08))
			elif n > 0.935:
				var c := image.get_pixel(x, y) as Color
				image.set_pixel(x, y, c.lightened(0.07))
