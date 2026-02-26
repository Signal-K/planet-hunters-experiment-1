shader_type canvas_item;

uniform float night_factor : hint_range(0.0, 1.0) = 0.0;
uniform vec4 night_tint : source_color = vec4(0.04, 0.08, 0.18, 1.0);
uniform vec3 sky_key_color = vec3(0.55, 0.77, 0.95);
uniform float sky_threshold : hint_range(0.0, 1.0) = 0.22;
uniform float sky_softness : hint_range(0.001, 1.0) = 0.10;
uniform float sky_vertical_end : hint_range(0.0, 1.0) = 0.70;
uniform float sky_vertical_feather : hint_range(0.001, 1.0) = 0.15;

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	float color_dist = distance(tex.rgb, sky_key_color);
	float color_mask = 1.0 - smoothstep(sky_threshold, sky_threshold + sky_softness, color_dist);
	float blue_bias = smoothstep(0.02, 0.30, tex.b - max(tex.r, tex.g));
	float vertical_mask = 1.0 - smoothstep(sky_vertical_end - sky_vertical_feather, sky_vertical_end, UV.y);
	float sky_mask = clamp(color_mask * blue_bias * vertical_mask, 0.0, 1.0);

	float fade = clamp(night_factor * sky_mask, 0.0, 1.0);
	tex.rgb = mix(tex.rgb, night_tint.rgb, fade);
	COLOR = tex;
}
