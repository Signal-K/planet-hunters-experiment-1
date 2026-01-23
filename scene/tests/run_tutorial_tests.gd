extends SceneTree

# Test runner for Tutorial skip flow (runs when script is started)
# Run with: godot --path scene --script res://tests/run_tutorial_tests.gd

func _init() -> void:
    print("Tutorial tests: starting")
    # Start tests after initialization
    run_tests()

func run_tests() -> void:
    var AppControllerScript = load("res://project/app_controller.gd")
    if AppControllerScript == null:
        print("TEST ERROR: Could not load project/app_controller.gd")
        self.quit(5)
        return

    var app = AppControllerScript.new()
    app.name = "AppController"
    self.root.add_child(app)

    var PanelScene = load("res://Scenes/UI/TutorialPanel.tscn")
    if PanelScene == null:
        print("TEST ERROR: Could not load TutorialPanel.tscn")
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
        print("TEST ERROR: AppController missing tutorial_completed_updated signal")
        self.quit(7)
        return

    # Find the Skip button and simulate a press
    var skip_btn = panel.get_node("PanelContainer/MarginContainer/HBoxContainer/SkipButton")
    if skip_btn == null:
        print("TEST ERROR: SkipButton not found")
        self.quit(8)
        return

    print("Tutorial tests: pressing Skip button")
    skip_btn.emit_signal("pressed")

    # Timeout in 3 seconds
    var timer = self.create_timer(3.0)
    timer.timeout.connect(Callable(self, "_on_timeout"))

func _on_tutorial_completed(is_completed) -> void:
    if is_completed:
        print("TEST PASS: tutorial marked complete")
        self.quit(0)
    else:
        print("TEST FAIL: tutorial marked false")
        self.quit(2)

func _on_timeout() -> void:
    print("TEST FAIL: timeout waiting for tutorial_completed signal")
    self.quit(3)
