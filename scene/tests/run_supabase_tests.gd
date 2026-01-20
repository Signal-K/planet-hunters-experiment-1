extends SceneTree

# Headless test runner for SupabaseClient.fetch_anomalies
# Run with: godot --headless --path scene -s scene/tests/run_supabase_tests.gd

func _ready() -> void:
    print("Supabase tests: starting")
    run_tests()

func run_tests() -> void:
    var SupabaseClientScript = load("res://Scripts/Systems/SupabaseClient.gd")
    if SupabaseClientScript == null:
        print("TEST ERROR: Could not load SupabaseClient.gd")
        get_tree().quit(5)
        return

    var client = SupabaseClientScript.instantiate()
    print("Supabase tests: using SUPABASE_URL=", client.SUPABASE_URL)
    print("Supabase tests: issuing HTTP request for anomaly_set=active-asteroids, limit=1")
    # Call fetch_anomalies with a short timeout watcher
    client.fetch_anomalies("active-asteroids", 1, Callable(self, "_on_fetch"))
    # Timeout in 10 seconds
    var timer = get_tree().create_timer(10.0)
    timer.timeout.connect(Callable(self, "_on_timeout"))

func _on_fetch(response_data, error_message) -> void:
    if error_message != "":
        print("TEST FAIL: Supabase fetch returned error: ", error_message)
        get_tree().quit(2)

    if typeof(response_data) != TYPE_ARRAY:
        print("TEST FAIL: unexpected response type: ", typeof(response_data))
        get_tree().quit(3)

    print("TEST PASS: fetched %d items" % [response_data.size()])
    # Optionally inspect structure of first item
    if response_data.size() > 0:
        var first = response_data[0]
        print("First item keys: ", first.keys())
    get_tree().quit(0)

func _on_timeout() -> void:
    print("TEST FAIL: timeout waiting for HTTP response")
    get_tree().quit(4)
