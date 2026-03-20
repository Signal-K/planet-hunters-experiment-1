extends RefCounted
class_name ProceduralBodyBuilder

static func build_asteroid(mesh_instance: MeshInstance3D, seed_key: String, min_radius: float = 0.72, max_radius: float = 0.96, emission: Color = Color(0.35, 0.35, 0.35)) -> void:
	if mesh_instance == null:
		return
	var seed = _hash_string(seed_key)
	var rng = RandomNumberGenerator.new()
	rng.seed = seed

	var shape_noise = FastNoiseLite.new()
	shape_noise.seed = seed
	shape_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	shape_noise.frequency = rng.randf_range(1.4, 2.4)
	shape_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	shape_noise.fractal_octaves = int(rng.randi_range(4, 6))
	shape_noise.fractal_gain = 0.55
	shape_noise.fractal_lacunarity = rng.randf_range(1.8, 2.2)

	var detail_noise = FastNoiseLite.new()
	detail_noise.seed = seed + 31
	detail_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	detail_noise.frequency = rng.randf_range(2.6, 3.6)
	detail_noise.fractal_type = FastNoiseLite.FRACTAL_RIDGED
	detail_noise.fractal_octaves = 2
	detail_noise.fractal_gain = 0.5

	var color_noise = FastNoiseLite.new()
	color_noise.seed = seed + 77
	color_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	color_noise.frequency = rng.randf_range(1.2, 2.0)
	color_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	color_noise.fractal_octaves = 3
	color_noise.fractal_gain = 0.5

	var base_mesh = SphereMesh.new()
	base_mesh.radial_segments = 12
	base_mesh.rings = 8
	base_mesh.radius = 1.0

	var arrays = base_mesh.get_mesh_arrays()
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var colors := PackedColorArray()
	colors.resize(verts.size())

	var base_radius = rng.randf_range(min_radius, max_radius)
	var palette_rng = RandomNumberGenerator.new()
	palette_rng.seed = _hash_string("palette:%s" % seed_key)
	var palette_dir = palette_rng.randf_range(0.0, 1.0)
	var primary = _palette_color(palette_dir, 0.0, palette_rng)
	var secondary = _palette_color(palette_dir, 0.45, palette_rng)
	var accent = _palette_color(palette_dir, 0.85, palette_rng)

	for i in range(verts.size()):
		var v = verts[i]
		var n = v.normalized()
		var nval = shape_noise.get_noise_3d(n.x * 1.6, n.y * 1.6, n.z * 1.6)
		var detail = detail_noise.get_noise_3d(n.x * 3.0, n.y * 3.0, n.z * 3.0)
		var displacement = (nval * 0.22) + (detail * 0.08)
		verts[i] = n * (base_radius + displacement)

		var cval = color_noise.get_noise_3d(n.x * 2.0, n.y * 2.0, n.z * 2.0)
		var band = clamp((cval + 1.0) * 0.5, 0.0, 1.0)
		var mix_a = primary.lerp(secondary, band)
		var mix_b = mix_a.lerp(accent, clamp((nval + 0.35) * 0.55, 0.0, 1.0))
		colors[i] = mix_b

	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_COLOR] = colors

	var temp_mesh = ArrayMesh.new()
	temp_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)

	var st = SurfaceTool.new()
	st.create_from(temp_mesh, 0)
	st.index()
	st.generate_normals(true)
	var final_mesh = st.commit()

	mesh_instance.mesh = final_mesh

	var material = StandardMaterial3D.new()
	material.vertex_color_use_as_albedo = true
	material.roughness = 0.95
	material.metallic = 0.0
	material.emission_enabled = true
	material.emission = emission
	material.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	mesh_instance.material_override = material

static func build_earth(mesh_instance: MeshInstance3D, seed_key: String, emission: Color = Color(0.1, 0.2, 0.4)) -> void:
	if mesh_instance == null:
		return
	var seed = _hash_string(seed_key)
	var rng = RandomNumberGenerator.new()
	rng.seed = seed

	var shape_noise = FastNoiseLite.new()
	shape_noise.seed = seed
	shape_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	shape_noise.frequency = 1.6
	shape_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	shape_noise.fractal_octaves = 4
	shape_noise.fractal_gain = 0.55

	var base_mesh = SphereMesh.new()
	base_mesh.radial_segments = 24
	base_mesh.rings = 16
	base_mesh.radius = 1.1

	var arrays = base_mesh.get_mesh_arrays()
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var colors := PackedColorArray()
	colors.resize(verts.size())

	for i in range(verts.size()):
		var v = verts[i]
		var n = v.normalized()
		var nval = shape_noise.get_noise_3d(n.x * 1.5, n.y * 1.5, n.z * 1.5)
		verts[i] = n * (1.0 + nval * 0.03)
		var ocean = Color(0.18, 0.35, 0.65)
		var land = Color(0.22, 0.55, 0.35)
		var ice = Color(0.85, 0.9, 0.95)
		var band = clamp((nval + 1.0) * 0.5, 0.0, 1.0)
		var base = ocean.lerp(land, band)
		var polar = abs(n.y)
		if polar > 0.75:
			base = base.lerp(ice, (polar - 0.75) / 0.25)
		colors[i] = base

	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_COLOR] = colors

	var temp_mesh = ArrayMesh.new()
	temp_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)

	var st = SurfaceTool.new()
	st.create_from(temp_mesh, 0)
	st.index()
	st.generate_normals(true)
	var final_mesh = st.commit()

	mesh_instance.mesh = final_mesh
	var material = StandardMaterial3D.new()
	material.vertex_color_use_as_albedo = true
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.roughness = 0.7
	material.metallic = 0.05
	material.emission_enabled = true
	material.emission = emission
	material.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	mesh_instance.material_override = material

## Build a procedurally coloured planet sphere. 5 planet archetypes chosen by
## seed so the same target ID always produces the same planet appearance.
static func build_planet(mesh_instance: MeshInstance3D, seed_key: String) -> void:
	if mesh_instance == null:
		return
	var seed = _hash_string(seed_key)
	var rng = RandomNumberGenerator.new()
	rng.seed = seed

	var planet_type: int = rng.randi() % 5  # 0-4

	var color_noise = FastNoiseLite.new()
	color_noise.seed = seed + 42
	color_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	color_noise.frequency = 0.9
	color_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	color_noise.fractal_octaves = 5
	color_noise.fractal_gain = 0.50

	var surface_noise = FastNoiseLite.new()
	surface_noise.seed = seed + 7
	surface_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	surface_noise.frequency = 1.1
	surface_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	surface_noise.fractal_octaves = 3

	var base_mesh = SphereMesh.new()
	base_mesh.radial_segments = 32
	base_mesh.rings = 24
	base_mesh.radius = 1.0

	var arrays = base_mesh.get_mesh_arrays()
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var colors := PackedColorArray()
	colors.resize(verts.size())

	var ocean: Color
	var land: Color
	var poles: Color
	var glow: Color
	match planet_type:
		0:  # Earth-like
			ocean = Color(0.14, 0.28, 0.62)
			land  = Color(0.17, 0.48, 0.26)
			poles = Color(0.85, 0.90, 0.95)
			glow  = Color(0.25, 0.50, 0.90)
		1:  # Arid / desert
			ocean = Color(0.55, 0.22, 0.08)
			land  = Color(0.72, 0.42, 0.18)
			poles = Color(0.82, 0.68, 0.55)
			glow  = Color(0.80, 0.38, 0.18)
		2:  # Gas giant (banded)
			ocean = Color(0.18, 0.14, 0.58)
			land  = Color(0.42, 0.28, 0.78)
			poles = Color(0.68, 0.58, 0.90)
			glow  = Color(0.42, 0.32, 0.82)
		3:  # Ice / ocean world
			ocean = Color(0.45, 0.68, 0.88)
			land  = Color(0.78, 0.86, 0.94)
			poles = Color(0.94, 0.97, 1.00)
			glow  = Color(0.65, 0.82, 0.95)
		_:  # Volcanic
			ocean = Color(0.68, 0.14, 0.04)
			land  = Color(0.38, 0.07, 0.02)
			poles = Color(0.75, 0.28, 0.08)
			glow  = Color(0.88, 0.28, 0.08)

	for i in range(verts.size()):
		var v = verts[i]
		var n = v.normalized()
		var sval = surface_noise.get_noise_3d(n.x, n.y, n.z)
		verts[i] = n * (1.0 + sval * 0.02)  # near-perfect sphere

		var cval = color_noise.get_noise_3d(n.x * 1.4, n.y * 1.4, n.z * 1.4)
		var band = clamp((cval + 1.0) * 0.5, 0.0, 1.0)
		var base = ocean.lerp(land, band)
		var polar = abs(n.y)
		if polar > 0.70:
			base = base.lerp(poles, (polar - 0.70) / 0.30)
		# Gas giant latitudinal banding
		if planet_type == 2:
			base = base.lerp(Color(0.58, 0.48, 0.90), abs(sin(n.y * PI * 7.0)) * 0.28)
		colors[i] = base

	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_COLOR] = colors

	var temp_mesh = ArrayMesh.new()
	temp_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	var st = SurfaceTool.new()
	st.create_from(temp_mesh, 0)
	st.index()
	st.generate_normals(true)
	var final_mesh = st.commit()

	mesh_instance.mesh = final_mesh
	var material = StandardMaterial3D.new()
	material.vertex_color_use_as_albedo = true
	material.roughness = 0.60
	material.metallic = 0.02
	material.emission_enabled = true
	material.emission = glow
	material.emission_energy_multiplier = 0.20
	material.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	mesh_instance.material_override = material

static func _palette_color(direction: float, offset: float, rng: RandomNumberGenerator) -> Color:
	var hue = fmod(direction + offset * 0.35, 1.0)
	var sat = rng.randf_range(0.12, 0.32)
	var val = rng.randf_range(0.68, 0.94)
	return Color.from_hsv(hue, sat, val)

static func _hash_string(value: String) -> int:
	var hash := 0
	for i in range(value.length()):
		hash = int((hash * 31 + value.unicode_at(i)) & 0x7fffffff)
	return max(hash, 1)
