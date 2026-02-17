extends SceneTree

# Test runner for Tutorial skip flow (runs when script is started)
# Run with: godot --path scene --script res://tests/run_tutorial_tests.gd

const TestReporter = preload("res://tests/TestReporter.gd")

var reporter := TestReporter.new()

func _init() -> void:
    reporter.start_suite("Tutorial Skip Flow", {
        "engine": Engine.get_version_info()["string"],
        "os": OS.get_name(),
        "project": "scene",
        "timestamp": Time.get_datetime_string_from_system()
    })
    # Start tests after initialization
    run_tests()

func run_tests() -> void:
    reporter.start_test("Skip button marks tutorial complete")
    DirAccess.remove_absolute("user://tutorial.cfg")
    var AppControllerScript = load("res://Scripts/Systems/AppController.gd")
    if AppControllerScript == null:
        reporter.fail_test("Could not load Scripts/Systems/AppController.gd")
        self.quit(5)
        return

    var app = AppControllerScript.new()
    app.name = "AppController"
    self.root.add_child(app)

    var PanelScene = load("res://Scenes/UI/TutorialPanel.tscn")
    if PanelScene == null:
        reporter.fail_test("Could not load TutorialPanel.tscn")
        self.quit(6)
        return

    var panel = PanelScene.instantiate()
    self.root.add_child(panel)

    # Wait a brief moment so the panel's _ready() runs and connects signals
    await create_timer(0.05).timeout

    # Listen for the app_controller signal
    if app.has_signal("tutorial_completed_updated"):
        app.tutorial_completed_updated.connect(Callable(self, "_on_tutorial_completed"))
    else:
        reporter.fail_test("AppController missing tutorial_completed_updated signal")
        self.quit(7)
        return

    # Find the Skip button and simulate a press.
    # Primary path matches current TutorialPanel scene hierarchy.
    var skip_btn = panel.get_node_or_null("CoachPanel/Margin/Root/TopRow/SkipButton")
    if skip_btn == null:
        # Backward-compatible fallback in case hierarchy changes again.
        skip_btn = panel.find_child("SkipButton", true, false)
    if skip_btn == null:
        reporter.fail_test("SkipButton not found")
        self.quit(8)
        return

    print("Tutorial tests: pressing Skip button")
    skip_btn.emit_signal("pressed")

    # Timeout in 3 seconds
    var timer = self.create_timer(3.0)
    timer.timeout.connect(Callable(self, "_on_timeout"))

func _on_tutorial_completed(is_completed) -> void:
    if is_completed:
        reporter.pass_test()
        _test_tutorial_first_time_tracking()
        reporter.summary()
        self.quit(0)
    else:
        reporter.fail_test("tutorial_completed was false")
        reporter.summary()
        self.quit(2)

func _on_timeout() -> void:
    reporter.fail_test("Timeout waiting for tutorial_completed signal")
    reporter.summary()
    self.quit(3)

func _test_tutorial_first_time_tracking() -> void:
    reporter.start_test("First-time tutorial actions persist and do not repeat")
    DirAccess.remove_absolute("user://tutorial.cfg")
    var AppControllerScript = load("res://Scripts/Systems/AppController.gd")
    if AppControllerScript == null:
        reporter.fail_test("Could not load AppController for first-time tracking test")
        return
    var app = AppControllerScript.new()
    app.name = "AppControllerTracking"
    self.root.add_child(app)
    var first = app.show_tutorial_hint_once("create_rocket", "One sentence.")
    var second = app.show_tutorial_hint_once("create_rocket", "One sentence.")
    app.queue_free()

    var reloaded = AppControllerScript.new()
    reloaded.name = "AppControllerTrackingReloaded"
    self.root.add_child(reloaded)
    var persisted = reloaded.has_seen_tutorial_action("create_rocket")
    reloaded.queue_free()
    if first and not second and persisted:
        reporter.pass_test()
    else:
        reporter.fail_test("Expected first=true second=false persisted=true, got first=%s second=%s persisted=%s" % [first, second, persisted])
