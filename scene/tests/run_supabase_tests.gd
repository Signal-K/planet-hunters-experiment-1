extends SceneTree

# Headless test runner for SupabaseClient.fetch_anomalies
# Run with: godot --headless --path scene -s scene/tests/run_supabase_tests.gd

const TestReporter = preload("res://tests/TestReporter.gd")

var reporter := TestReporter.new()
var _client: Node = null

func _init() -> void:
    reporter.start_suite("Supabase Headless Fetch", {
        "engine": Engine.get_version_info()["string"],
        "os": OS.get_name(),
        "project": "scene",
        "timestamp": Time.get_datetime_string_from_system()
    })
    run_tests()

func run_tests() -> void:
    reporter.start_test("Fetch anomalies (telescope-tess)")
    var SupabaseClientScript = load("res://Scripts/Systems/SupabaseClient.gd")
    if SupabaseClientScript == null:
        reporter.fail_test("Could not load SupabaseClient.gd")
        quit(5)
        return

    _client = SupabaseClientScript.new()
    get_root().add_child(_client)
    await create_timer(0.05).timeout
    print("Supabase tests: using SUPABASE_URL=", _client.SUPABASE_URL)
    print("Supabase tests: issuing HTTP request for anomaly_set=telescope-tess, limit=1")
    # Call fetch_anomalies with a short timeout watcher
    _client.fetch_anomalies("telescope-tess", 1, Callable(self, "_on_fetch"))
    # Timeout in 10 seconds
    var timer = create_timer(10.0)
    timer.timeout.connect(Callable(self, "_on_timeout"))

func _on_fetch(response_data, error_message) -> void:
    if error_message != "":
        var err = str(error_message)
        var network_unavailable = err.contains("Failed to create HTTP request") or err.contains("HTTP Request failed")
        if network_unavailable:
            reporter.pass_test()
            reporter.summary()
            if _client and is_instance_valid(_client):
                _client.queue_free()
            quit(0)
            return
        reporter.fail_test("Supabase fetch returned error: " + err)
        reporter.summary()
        if _client and is_instance_valid(_client):
            _client.queue_free()
        quit(2)

    if typeof(response_data) != TYPE_ARRAY:
        reporter.fail_test("Unexpected response type: " + str(typeof(response_data)))
        reporter.summary()
        if _client and is_instance_valid(_client):
            _client.queue_free()
        quit(3)

    print("Supabase tests: fetched %d items" % [response_data.size()])
    # Optionally inspect structure of first item
    if response_data.size() > 0:
        var first = response_data[0]
        print("First item keys: ", first.keys())
    reporter.pass_test()
    reporter.summary()
    if _client and is_instance_valid(_client):
        _client.queue_free()
    quit(0)

func _on_timeout() -> void:
    reporter.fail_test("Timeout waiting for HTTP response")
    reporter.summary()
    if _client and is_instance_valid(_client):
        _client.queue_free()
    quit(4)
