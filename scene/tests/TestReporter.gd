extends RefCounted
class_name TestReporter

var suite_name: String = ""
var tests_passed := 0
var tests_failed := 0
var test_results := []
var _current_test_name: String = ""
var _current_test_started_ms: int = 0
var _suite_started_ms: int = 0

func start_suite(name: String, context: Dictionary = {}) -> void:
	suite_name = name
	tests_passed = 0
	tests_failed = 0
	test_results = []
	_suite_started_ms = Time.get_ticks_msec()
	print("\n" + "=".repeat(72))
	print("🧪 TEST SUITE: " + suite_name)
	print("=".repeat(72))
	if not context.is_empty():
		print("Context:")
		for key in context.keys():
			print("  - %s: %s" % [str(key), str(context[key])])
	print("Started: " + Time.get_datetime_string_from_system())
	print("-".repeat(72))

func start_test(name: String, details: Dictionary = {}) -> void:
	_current_test_name = name
	_current_test_started_ms = Time.get_ticks_msec()
	print("\n▶ TEST: " + name)
	if not details.is_empty():
		for key in details.keys():
			print("  · %s: %s" % [str(key), str(details[key])])

func pass_test(name: String = "") -> void:
	var test_name = _resolve_test_name(name)
	var duration_ms = _elapsed_ms(_current_test_started_ms)
	tests_passed += 1
	test_results.append({"name": test_name, "passed": true, "duration_ms": duration_ms})
	print("  ✅ PASS (%d ms): %s" % [duration_ms, test_name])
	_reset_current()

func fail_test(reason: String, name: String = "") -> void:
	var test_name = _resolve_test_name(name)
	var duration_ms = _elapsed_ms(_current_test_started_ms)
	tests_failed += 1
	test_results.append({"name": test_name, "passed": false, "reason": reason, "duration_ms": duration_ms})
	print("  ❌ FAIL (%d ms): %s" % [duration_ms, test_name])
	print("     Reason: " + reason)
	_reset_current()

func summary() -> void:
	var total = tests_passed + tests_failed
	var duration_ms = _elapsed_ms(_suite_started_ms)
	print("\n" + "=".repeat(72))
	print("📊 TEST SUMMARY: " + suite_name)
	print("=".repeat(72))
	print("Total:   " + str(total))
	print("Passed:  " + str(tests_passed))
	print("Failed:  " + str(tests_failed))
	print("Elapsed: " + str(duration_ms) + " ms")
	print("-".repeat(72))
	if tests_failed > 0:
		print("❌ TESTS FAILED")
	else:
		print("✅ ALL TESTS PASSED")

func _resolve_test_name(name: String) -> String:
	if name != "":
		return name
	if _current_test_name != "":
		return _current_test_name
	return "(unnamed test)"

func _elapsed_ms(start_ms: int) -> int:
	if start_ms <= 0:
		return 0
	return Time.get_ticks_msec() - start_ms

func _reset_current() -> void:
	_current_test_name = ""
	_current_test_started_ms = 0
