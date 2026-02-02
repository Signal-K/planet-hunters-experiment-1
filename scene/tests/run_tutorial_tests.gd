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
    var AppControllerScript = load("res://project/app_controller.gd")
    if AppControllerScript == null:
        reporter.fail_test("Could not load project/app_controller.gd")
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

    # Find the Skip button and simulate a press
    var skip_btn = panel.get_node("PanelContainer/MarginContainer/HBoxContainer/SkipButton")
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
