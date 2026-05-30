extends CanvasLayer

# PostHog project capture key — public, safe to embed (same as react-shell.js).
const POSTHOG_API_KEY := "phc_65umDftbbTkrm1V6azue6OeU4u5c8iJcaHm4JtJ95di"
const POSTHOG_CAPTURE_URL := "https://us.i.posthog.com/capture/"

# Set by PostHogNativeSurveyBridge before adding to the scene tree.
var _survey_key: String = ""
var _survey_id: String = ""
var _survey_name: String = ""
var _questions: Array = []
var _distinct_id: String = ""
var _payload: Dictionary = {}

var _answers: Array = []
var _http: HTTPRequest

@onready var _title_label: Label = $Center/Panel/OuterVBox/HeaderMargin/Header/TitleLabel
@onready var _questions_box: VBoxContainer = $Center/Panel/OuterVBox/ScrollArea/QuestionsVBox
@onready var _submit_btn: Button = $Center/Panel/OuterVBox/Footer/FooterRow/SubmitBtn
@onready var _skip_btn: Button = $Center/Panel/OuterVBox/Footer/FooterRow/SkipBtn
@onready var _close_btn: Button = $Center/Panel/OuterVBox/HeaderMargin/Header/CloseBtn

func _ready() -> void:
	if _survey_name == "" or _questions.is_empty():
		queue_free()
		return
	_title_label.text = _survey_name
	_answers.resize(_questions.size())
	_answers.fill(null)

	for i in range(_questions.size()):
		_build_question_widget(i, _questions[i])

	_http = HTTPRequest.new()
	add_child(_http)
	_http.request_completed.connect(_on_request_completed)

	_submit_btn.pressed.connect(_on_submit)
	_skip_btn.pressed.connect(queue_free)
	_close_btn.pressed.connect(queue_free)
	_update_submit_state()

func _build_question_widget(index: int, question: Dictionary) -> void:
	var q_type: String = question.get("type", "open")
	var q_text: String = question.get("text", "")

	var container := VBoxContainer.new()
	container.theme_override_constants[&"separation"] = 12

	var label := Label.new()
	label.text = q_text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.theme_override_colors[&"font_color"] = Color(0.906, 0.929, 0.976, 1.0)
	label.theme_override_font_sizes[&"font_size"] = 20
	container.add_child(label)

	match q_type:
		"rating":
			_build_rating_widget(container, index, question)
		"multiple_choice":
			_build_choice_widget(container, index, question)
		"open":
			_build_open_widget(container, index)

	_questions_box.add_child(container)

func _build_rating_widget(container: VBoxContainer, index: int, question: Dictionary) -> void:
	var low_label: String = question.get("low", "1")
	var high_label: String = question.get("high", "5")

	var row := HBoxContainer.new()
	row.theme_override_constants[&"separation"] = 8
	row.alignment = BoxContainer.ALIGNMENT_CENTER

	var low := Label.new()
	low.text = low_label
	low.theme_override_colors[&"font_color"] = Color(0.663, 0.706, 0.800, 1.0)
	low.theme_override_font_sizes[&"font_size"] = 16
	row.add_child(low)

	for n in range(1, 6):
		var btn := Button.new()
		btn.text = str(n)
		btn.custom_minimum_size = Vector2(52, 52)
		btn.theme_override_font_sizes[&"font_size"] = 20
		_style_choice_btn(btn, false)
		var captured_n := n
		btn.pressed.connect(func():
			_answers[index] = str(captured_n)
			# Update visual state of all sibling buttons
			for child in row.get_children():
				if child is Button:
					_style_choice_btn(child, child.text == str(captured_n))
			_update_submit_state()
		)
		row.add_child(btn)

	var high := Label.new()
	high.text = high_label
	high.theme_override_colors[&"font_color"] = Color(0.663, 0.706, 0.800, 1.0)
	high.theme_override_font_sizes[&"font_size"] = 16
	row.add_child(high)

	container.add_child(row)

func _build_choice_widget(container: VBoxContainer, index: int, question: Dictionary) -> void:
	var choices: Array = question.get("choices", [])
	var col := VBoxContainer.new()
	col.theme_override_constants[&"separation"] = 8

	for choice in choices:
		var btn := Button.new()
		btn.text = str(choice)
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		btn.theme_override_font_sizes[&"font_size"] = 18
		_style_choice_btn(btn, false)
		var captured_choice: String = str(choice)
		btn.pressed.connect(func():
			_answers[index] = captured_choice
			for sibling in col.get_children():
				if sibling is Button:
					_style_choice_btn(sibling, sibling.text == captured_choice)
			_update_submit_state()
		)
		col.add_child(btn)

	container.add_child(col)

func _build_open_widget(container: VBoxContainer, index: int) -> void:
	var edit := TextEdit.new()
	edit.placeholder_text = "Type your answer here…"
	edit.custom_minimum_size = Vector2(0, 90)
	edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	edit.theme_override_colors[&"font_color"] = Color(0.906, 0.929, 0.976, 1.0)
	edit.theme_override_colors[&"background_color"] = Color(0.020, 0.035, 0.063, 1.0)
	edit.theme_override_font_sizes[&"font_size"] = 18
	edit.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	edit.text_changed.connect(func():
		_answers[index] = edit.text.strip_edges()
		_update_submit_state()
	)
	container.add_child(edit)

func _style_choice_btn(btn: Button, selected: bool) -> void:
	var normal_style := StyleBoxFlat.new()
	normal_style.corner_radius_top_left = 8
	normal_style.corner_radius_top_right = 8
	normal_style.corner_radius_bottom_right = 8
	normal_style.corner_radius_bottom_left = 8
	normal_style.content_margin_left = 16.0
	normal_style.content_margin_top = 10.0
	normal_style.content_margin_right = 16.0
	normal_style.content_margin_bottom = 10.0

	if selected:
		normal_style.bg_color = Color(0.290, 0.816, 1.0, 0.18)
		normal_style.border_color = Color(0.290, 0.816, 1.0, 1.0)
		normal_style.border_width_left = 2
		normal_style.border_width_top = 2
		normal_style.border_width_right = 2
		normal_style.border_width_bottom = 2
		btn.theme_override_colors[&"font_color"] = Color(0.290, 0.816, 1.0, 1.0)
	else:
		normal_style.bg_color = Color(0.055, 0.082, 0.145, 1.0)
		normal_style.border_color = Color(0.137, 0.204, 0.333, 1.0)
		normal_style.border_width_left = 1
		normal_style.border_width_top = 1
		normal_style.border_width_right = 1
		normal_style.border_width_bottom = 1
		btn.theme_override_colors[&"font_color"] = Color(0.906, 0.929, 0.976, 1.0)

	btn.theme_override_styles[&"normal"] = normal_style
	btn.theme_override_styles[&"focus"] = normal_style

	var hover_style := normal_style.duplicate()
	hover_style.bg_color = normal_style.bg_color.lightened(0.06)
	btn.theme_override_styles[&"hover"] = hover_style
	btn.theme_override_styles[&"pressed"] = hover_style

func _update_submit_state() -> void:
	# Enable submit once at least one question has an answer.
	var any_answered := false
	for answer in _answers:
		if answer != null and str(answer).strip_edges() != "":
			any_answered = true
			break
	_submit_btn.disabled = not any_answered

func _on_submit() -> void:
	_submit_btn.disabled = true
	_skip_btn.disabled = true

	var properties := {
		"$survey_id": _survey_id,
		"$survey_name": _survey_name,
	}
	for i in range(_answers.size()):
		var answer = _answers[i]
		if answer == null:
			continue
		var key: String = "$survey_response" if i == 0 else "$survey_response_%d" % i
		properties[key] = str(answer)
	# Attach game context
	for key in _payload:
		properties["survey_ctx_%s" % key] = _payload[key]

	var body := JSON.stringify({
		"api_key": POSTHOG_API_KEY,
		"distinct_id": _distinct_id,
		"event": "survey sent",
		"properties": properties,
	})
	var headers := PackedStringArray(["Content-Type: application/json"])
	var err := _http.request(POSTHOG_CAPTURE_URL, headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		push_warning("[SurveyOverlay] HTTPRequest failed to start: %d" % err)
		_show_thankyou()

func _on_request_completed(_result: int, _code: int, _headers: PackedStringArray, _body: PackedByteArray) -> void:
	_show_thankyou()

func _show_thankyou() -> void:
	# Replace question content with a brief thank-you, then auto-close.
	for child in _questions_box.get_children():
		child.queue_free()
	var ty := Label.new()
	ty.text = "Thank you! Your answer has been recorded."
	ty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ty.theme_override_colors[&"font_color"] = Color(0.290, 0.816, 1.0, 1.0)
	ty.theme_override_font_sizes[&"font_size"] = 22
	_questions_box.add_child(ty)
	_submit_btn.hide()
	_skip_btn.text = "Close"
	_skip_btn.disabled = false
	get_tree().create_timer(2.5).timeout.connect(queue_free)
