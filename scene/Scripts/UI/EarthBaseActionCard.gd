extends PanelContainer
class_name EarthBaseActionCard

@export_multiline var card_title: String = ""
@export_multiline var card_subtitle: String = ""
@export_multiline var card_hint: String = ""
@export_multiline var card_cta: String = ""

@onready var _title_label:    Label      = $RowLayout/ContentMargin/Body/Title
@onready var _subtitle_label: Label      = $RowLayout/ContentMargin/Body/Subtitle
@onready var _hint_label:     Label      = $RowLayout/ContentMargin/Body/Hint
@onready var _cta_button:     Button     = $RowLayout/ContentMargin/Body/CTAButton
@onready var _accent_bar:     ColorRect  = $RowLayout/AccentBar

func _ready() -> void:
	apply_content()

func apply_content() -> void:
	if _title_label != null:
		_title_label.text = card_title
		_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if _subtitle_label != null:
		_subtitle_label.text = card_subtitle
		_subtitle_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if _hint_label != null:
		_hint_label.text = card_hint
		_hint_label.visible = card_hint != ""
		_hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if _cta_button != null:
		_cta_button.text = card_cta

func set_content(title_text: String, subtitle_text: String, hint_text: String, cta_text: String) -> void:
	card_title = title_text
	card_subtitle = subtitle_text
	card_hint = hint_text
	card_cta = cta_text
	apply_content()

func set_accent_color(col: Color) -> void:
	if _accent_bar != null:
		_accent_bar.color = col
	if _title_label != null:
		_title_label.add_theme_color_override("font_color", Color(col.r, col.g, col.b, 0.85))
	# Update card border to match accent
	var s := StyleBoxFlat.new()
	s.bg_color = Color(0.039, 0.071, 0.114, 0.88)
	s.border_color = Color(col.r, col.g, col.b, 0.40)
	s.set_corner_radius_all(12)
	s.set_border_width_all(1)
	s.shadow_color = Color(0.0, 0.0, 0.0, 0.4)
	s.shadow_size = 12
	s.shadow_offset = Vector2(0, 6)
	add_theme_stylebox_override("panel", s)

func get_cta_button() -> Button:
	return _cta_button
