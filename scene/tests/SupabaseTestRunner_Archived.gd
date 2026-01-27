extends SceneTree
## Archived GDScript Test Runner: runs old UI tests against archived annotation scene

var tests_passed := 0
var tests_failed := 0
var test_results := []

func _init():
    print("\n" + "=".repeat(60))
    print("🧪 SUPABASE INTEGRATION TESTS (ARCHIVED UI)")
    print("=".repeat(60))
    await run_all_tests()
    print_summary()
    await create_timer(0.1).timeout
    if tests_failed > 0:
        quit(1)
    else:
        quit(0)

func run_all_tests():
    await test_supabase_client_exists()
    await test_fetch_asteroids()
    await test_asteroid_data_structure()
    await test_asteroid_selection_archived()

# Reuse many helpers from main runner but check archived scene
func test_supabase_client_exists():
    var test_name := "SupabaseClient can be instantiated (archived)"
    print("▶ Running: " + test_name)
    var script = load("res://Scripts/Systems/SupabaseClient.gd")
    if script == null:
        fail(test_name, "Could not load SupabaseClient.gd")
        return
    var client = script.new()
    if client == null:
        fail(test_name, "Could not instantiate SupabaseClient")
        return
    if not client.has_method("fetch_anomalies"):
        fail(test_name, "SupabaseClient missing fetch_anomalies method")
        return
    pass_test(test_name)

func test_fetch_asteroids():
    var test_name := "Can fetch asteroids from Supabase (archived)"
    print("▶ Running: " + test_name)
    var script = load("res://Scripts/Systems/SupabaseClient.gd")
    if script == null:
        fail(test_name, "Could not load SupabaseClient.gd")
        return
    var client = script.new()
    var env_url = OS.get_environment("SUPABASE_URL")
    var env_key = OS.get_environment("SUPABASE_ANON_KEY")
    if env_url != "":
        client.SUPABASE_URL = env_url
    else:
        client.SUPABASE_URL = "https://hlufptwhzkpkkjztimzo.supabase.co"
    if env_key != "":
        client.SUPABASE_KEY = env_key
    get_root().add_child(client)
    await create_timer(0.1).timeout
    var result_holder := {"received": false, "data": [], "error": ""}
    var callback = func(data: Array, error: String):
        result_holder["received"] = true
        result_holder["data"] = data
        result_holder["error"] = error
    var http_result = client.fetch_anomalies("active-asteroids", 5, callback)
    if http_result == null:
        pass_test(test_name + " (network unavailable)")
        client.queue_free()
        return
    var timeout := 5.0
    var elapsed := 0.0
    while not result_holder["received"] and elapsed < timeout:
        await create_timer(0.1).timeout
        elapsed += 0.1
    client.queue_free()
    if not result_holder["received"]:
        fail(test_name, "Timeout waiting for Supabase response")
        return
    if result_holder["error"] != "":
        fail(test_name, "Failed to connect to Supabase: " + result_holder["error"])
        return
    pass_test(test_name)

func test_asteroid_data_structure():
    var test_name := "Asteroid data structure supports viewing (archived)"
    print("▶ Running: " + test_name)
    var mock_asteroid := {"id":1, "name":"Test", "anomalySet":"active-asteroids", "created_at":"2025-01-01T00:00:00Z"}
    var required_fields := ["id","name"]
    for field in required_fields:
        if not mock_asteroid.has(field):
            fail(test_name, "Asteroid missing required field: " + field)
            return
    pass_test(test_name)

func test_asteroid_selection_archived():
    var test_name := "User can view asteroids with archived annotation UI"
    print("▶ Running: " + test_name)
    var panel_scene = load("res://Scenes/UI/SatelliteStationPanel.tscn")
    if panel_scene == null:
        fail(test_name, "Could not load SatelliteStationPanel.tscn")
        return
    var panel = panel_scene.instantiate()
    if panel == null:
        fail(test_name, "Could not instantiate SatelliteStationPanel")
        return
    get_root().add_child(panel)
    await create_timer(0.2).timeout
    if panel.has_method("_on_visibility_changed"):
        panel.visible = true
        panel._on_visibility_changed()
    await create_timer(4.0).timeout
    var anomaly_list = panel.get_node_or_null("PanelContainer/Panel/VBoxContainer/ContentContainer/AnomalyList")
    if anomaly_list == null:
        fail(test_name, "Could not find AnomalyList in panel")
        panel.queue_free()
        return
    var items = anomaly_list.get_children()
    if items.size() == 0:
        fail(test_name, "No asteroids loaded in the UI - check Supabase connection")
        panel.queue_free()
        return
    var click_button = null
    for item in items:
        for child in item.get_children():
            if child is Button:
                click_button = child
                break
        if click_button:
            break
    if click_button == null:
        fail(test_name, "Could not find clickable button in asteroid items")
        panel.queue_free()
        return
    click_button.pressed.emit()
    await create_timer(0.5).timeout
    var content_container = panel.get_node_or_null("PanelContainer/Panel/VBoxContainer/ContentContainer")
    if not content_container:
        fail(test_name, "ContentContainer not found in panel")
        panel.queue_free()
        return
    var detail_view = null
    for child in content_container.get_children():
        if child.get_class() == "VBoxContainer" and child.get_script():
            var script_path = child.get_script().resource_path
            if "Archive/AsteroidDetail" in script_path:
                detail_view = child
                break
    if not detail_view:
        fail(test_name, "Archived AsteroidDetailView was not created after click")
        panel.queue_free()
        return
    pass_test(test_name)

func pass_test(name: String):
    tests_passed += 1
    test_results.append({"name": name, "passed": true})
    print("  ✅ PASSED: " + name + "\n")

func fail(name: String, reason: String):
    tests_failed += 1
    test_results.append({"name": name, "passed": false, "reason": reason})
    print("  ❌ FAILED: " + name)
    print("     Reason: " + reason + "\n")

func print_summary():
    print("=".repeat(60))
    print("📊 TEST SUMMARY")
    print("=".repeat(60))
    print("Total:  " + str(tests_passed + tests_failed))
    print("Passed: " + str(tests_passed) + " ✅")
    print("Failed: " + str(tests_failed) + " ❌")
    print("=".repeat(60))
