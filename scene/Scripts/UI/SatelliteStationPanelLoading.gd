extends RefCounted
class_name SatelliteStationPanelLoading

var _loading_container: Control
var _anomaly_list: Control
var _progress_bar: ProgressBar
var _status_label: Label
var _refresh_button: Button
var _on_finish: Callable
var _min_display_time: float = 0.0

var _is_loading := false
var _load_timer := 0.0
var _target_load_time := 0.0
var _anomalies_ready := false

func setup(
	loading_container: Control,
	anomaly_list: Control,
	progress_bar: ProgressBar,
	status_label: Label,
	refresh_button: Button,
	on_finish: Callable,
	min_display_time: float
) -> void:
	_loading_container = loading_container
	_anomaly_list = anomaly_list
	_progress_bar = progress_bar
	_status_label = status_label
	_refresh_button = refresh_button
	_on_finish = on_finish
	_min_display_time = min_display_time

func start_loading(duration: float) -> void:
	_is_loading = true
	_load_timer = 0.0
	_target_load_time = duration
	_anomalies_ready = false

	# Ensure progress bar range is normalized (0-100)
	if _progress_bar:
		_progress_bar.max_value = 100

	_loading_container.visible = true
	_anomaly_list.visible = false
	_refresh_button.disabled = true
	_progress_bar.value = 0.0
	_status_label.text = "Status: Scanning..."

func mark_anomalies_ready() -> void:
	_anomalies_ready = true

func on_process(delta: float) -> void:
	if not _is_loading:
		return

	# Advance the loading timer and update progress
	_load_timer += delta
	if _target_load_time <= 0:
		_progress_bar.value = 100
	else:
		var pct = clamp(_load_timer / _target_load_time * 100.0, 0.0, 100.0)
		_progress_bar.value = pct

	# Finish when either the timer completes or data is ready AND minimum display time elapsed
	if _load_timer >= _target_load_time:
		_finish_loading()
		return

	if _anomalies_ready and _load_timer >= _min_display_time:
		_finish_loading()

func _finish_loading() -> void:
	_is_loading = false
	_loading_container.visible = false
	_anomaly_list.visible = true
	_refresh_button.disabled = false
	if _on_finish.is_valid():
		_on_finish.call()
