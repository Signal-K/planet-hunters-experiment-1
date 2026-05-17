extends Node
## run_live_annotation_test.gd
## Live end-to-end annotation test using real Supabase data.
##
## Verifies:
##  1. Fetches a real TESS anomaly (lightcurve) from the anomalies table
##  2. Simulates two transit-dip annotations on that lightcurve
##  3. POSTs a classification row to the classifications table
##  4. Reads the row back to confirm it was saved
##  5. Reports the original anomaly data + saved classification
##
## IMPORTANT: Pass credentials via env vars only — never committed.
## Usage:
##   SUPABASE_URL=https://api.starsailors.space \
##   SUPABASE_ANON_KEY=<key> \
##   DISPLAY=:99 /tmp/godot --path ./scene res://tests/LiveAnnotationTour.tscn
##
## Produces:
##   user://live_annotation_report.md

const REPORT_PATH   := "user://live_annotation_report.md"
const SCREENSHOT_DIR := "user://ux_screenshots/live_annotation"
const ANOMALY_SET    := "tess-candidates"    # adjust if needed
const SETTLE         := 0.8

const SupabaseClientScript = preload("res://Scripts/Systems/SupabaseClient.gd")
const ClassificationConsensusNotificationScene = \
    preload("res://Scenes/UI/ClassificationConsensusNotification.tscn")

var _report_lines: Array[String] = []
var _issues       : Array[String] = []
var _anomaly       : Dictionary   = {}
var _saved_classif_id: int        = -1

func _ready() -> void:
    DirAccess.make_dir_recursive_absolute(SCREENSHOT_DIR)
    _run_test.call_deferred()

func _run_test() -> void:
    _report("# Live Annotation Test")
    _report("Date: %s\n" % Time.get_datetime_string_from_system())

    # Suppress autoload overlays
    for child in get_tree().root.get_children():
        if child != self and child is CanvasLayer:
            (child as CanvasLayer).visible = false
    await get_tree().process_frame

    # ── Step 1: confirm Supabase credentials are live ─────────────────────────
    var supabase = SupabaseClientScript.get_instance()
    _report("## Step 1 — Credentials")
    _report("  URL : %s" % supabase.SUPABASE_URL)
    _report("  Key : %s..." % supabase.SUPABASE_KEY.substr(0, 20))

    if "127.0.0.1" in supabase.SUPABASE_URL or "localhost" in supabase.SUPABASE_URL:
        _issue("Still pointing at local Supabase — set SUPABASE_URL env var to production URL.")

    # ── Step 2: fetch a real TESS anomaly ─────────────────────────────────────
    _report("\n## Step 2 — Fetch Live TESS Anomaly")
    var anomaly_sets_to_try := ["tess-candidates", "tess", "telescope-tess"]
    var fetch_done := false

    for set_name in anomaly_sets_to_try:
        if fetch_done:
            break
        _report("  Trying anomalySet = '%s' ..." % set_name)
        var fetch_state := {"done": false}
        supabase.fetch_anomalies(set_name, 3, func(rows: Array, err: String) -> void:
            fetch_state["done"] = true
            if err != "":
                _report("  ✗ %s: %s" % [set_name, err])
                return
            if rows.is_empty():
                _report("  ✗ %s: empty response" % set_name)
                return
            _anomaly = rows[0]
            fetch_done = true
            _report("  ✓ Got %d rows from '%s'" % [rows.size(), set_name])
        )
        # Wait up to 10 seconds for the HTTP response
        var t := 0.0
        while not bool(fetch_state.get("done", false)) and t < 10.0:
            await get_tree().create_timer(0.2).timeout
            t += 0.2
        if not bool(fetch_state.get("done", false)):
            _report("  ✗ %s: timed out after 10s" % set_name)

    if _anomaly.is_empty():
        _issue("Could not fetch any anomaly from Supabase. Check URL/key and network.")
        _finish()
        return

    var anomaly_id := str(_anomaly.get("id", _anomaly.get("anomaly", "")))
    var anomaly_content := str(_anomaly.get("content", ""))
    var anomaly_set_found := str(_anomaly.get("anomalySet", ""))
    _report("\n  Anomaly ID   : %s" % anomaly_id)
    _report("  anomalySet   : %s" % anomaly_set_found)
    _report("  content keys : %s" % str(_anomaly.keys()))

    # Check for lightcurve / observation data
    var has_lightcurve := _anomaly.has("lightcurveData") or anomaly_content.length() > 0
    if has_lightcurve:
        _report("  ✓ Lightcurve/content data present.")
    else:
        _report("  ⚠ No lightcurveData field found — annotation will still proceed.")

    # ── Step 3: simulate annotations ──────────────────────────────────────────
    _report("\n## Step 3 — Simulate Transit-Dip Annotations")
    # Two simulated transit dip annotations on the lightcurve image
    # (normalised 0-1 coordinates of the dip centre and width)
    var transit_dips := [
        {"x": 0.23, "y": 0.40, "width": 0.08, "label": "dip_1"},
        {"x": 0.71, "y": 0.42, "width": 0.07, "label": "dip_2"},
    ]
    var annotation_count := transit_dips.size()
    var verdict := "planet"
    _report("  Verdict       : %s" % verdict)
    _report("  Annotations   : %d transit dips" % annotation_count)
    for dip in transit_dips:
        _report("    dip at x=%.2f  width=%.2f" % [dip["x"], dip["width"]])

    # ── Step 4: POST classification to Supabase ───────────────────────────────
    _report("\n## Step 4 — POST to classifications Table")
    var anomaly_int := int(floor(anomaly_id.to_float())) if anomaly_id.to_float() > 0.0 else 0
    var auth_state := {"done": false, "ok": false, "error": ""}
    supabase.ensure_authenticated(func(ok: bool, err: String) -> void:
        auth_state["ok"] = ok
        auth_state["error"] = err
        auth_state["done"] = true
    )
    var wait := 0.0
    while not bool(auth_state.get("done", false)) and wait < 15.0:
        await get_tree().create_timer(0.3).timeout
        wait += 0.3

    if not bool(auth_state.get("done", false)):
        _issue("Anonymous auth timed out after 15s.")
        _finish()
        return
    elif not bool(auth_state.get("ok", false)):
        _issue("Anonymous auth failed: %s" % str(auth_state.get("error", "")))
        _finish()
        return

    var row_data := {
        "anomaly"              : anomaly_int,
        "classificationtype"   : "tess-lightcurve",
        "content"              : "%s — %d annotation(s)" % [
                                    verdict.replace("_", " ").capitalize(),
                                    annotation_count],
        "author"               : supabase.get_authenticated_user_id(),
        "classificationConfiguration": {
            "verdict"          : verdict,
            "annotation_count" : annotation_count,
            "transit_dips"     : transit_dips,
            "source"           : "landnam-game-live-test",
        }
    }

    var post_state := {"done": false, "ok": false, "error": ""}
    supabase.post_json("classifications", row_data, func(ok: bool, err: String) -> void:
        post_state["ok"] = ok
        post_state["error"] = err
        post_state["done"] = true
    )
    wait = 0.0
    while not bool(post_state.get("done", false)) and wait < 15.0:
        await get_tree().create_timer(0.3).timeout
        wait += 0.3

    if not bool(post_state.get("done", false)):
        _issue("POST timed out after 15s.")
    elif not bool(post_state.get("ok", false)):
        _issue("POST failed: %s" % str(post_state.get("error", "")))
    else:
        _report("  ✓ POST returned 201/ok — row sent to Supabase.")

    # ── Step 5: READ BACK the saved classification ────────────────────────────
    _report("\n## Step 5 — Read Back Saved Classification")
    var query := "anomaly=eq.%s&classificationtype=eq.tess-lightcurve&order=id.desc&limit=1" % anomaly_int
    var read_state := {"done": false, "rows": [], "error": ""}
    supabase.fetch_table("classifications", query, func(rows: Array, err: String) -> void:
        read_state["rows"] = rows
        read_state["error"] = err
        read_state["done"] = true
    )
    wait = 0.0
    while not bool(read_state.get("done", false)) and wait < 15.0:
        await get_tree().create_timer(0.3).timeout
        wait += 0.3

    var read_rows: Array = read_state.get("rows", [])
    var read_error := str(read_state.get("error", ""))
    if not bool(read_state.get("done", false)):
        _issue("Read-back timed out after 15s.")
    elif read_error != "":
        _issue("Read-back error: %s" % read_error)
    elif read_rows.is_empty():
        _issue("Read-back: no rows found for anomaly=%s in classifications." % anomaly_int)
    else:
        var row: Dictionary = read_rows[0]
        _report("  ✓ Row found in Supabase!")
        _report("    id            : %s" % str(row.get("id", "?")))
        _report("    anomaly       : %s" % str(row.get("anomaly", "?")))
        _report("    classtype     : %s" % str(row.get("classificationtype", "?")))
        _report("    content       : %s" % str(row.get("content", "?")))
        var cfg = row.get("classificationConfiguration", {})
        if typeof(cfg) == TYPE_DICTIONARY:
            _report("    verdict       : %s" % str(cfg.get("verdict", "?")))
            _report("    annotation_cnt: %s" % str(cfg.get("annotation_count", "?")))
            var dips = cfg.get("transit_dips", [])
            _report("    transit_dips  : %d dip(s) saved" % (dips.size() if typeof(dips) == TYPE_ARRAY else 0))
        _saved_classif_id = int(str(row.get("id", -1)))

    # ── Step 6: Show notification panel with result ───────────────────────────
    _report("\n## Step 6 — Render ClassificationConsensusNotification")
    var notify_entries := [{
        "anomaly_id"       : str(anomaly_id),
        "consensus_verdict": verdict,
        "active_mission"   : false,
    }]
    var notify: Node = ClassificationConsensusNotificationScene.instantiate()
    get_tree().root.add_child(notify)
    var _active: Node = notify
    await get_tree().create_timer(SETTLE).timeout
    if notify.has_method("show_results"):
        notify.show_results(notify_entries, 640, "TEST_PILOT")
        await get_tree().create_timer(SETTLE).timeout

    # Screenshot with overlay suppression
    for child in get_tree().root.get_children():
        if child == self or child == _active: continue
        if child is CanvasLayer: (child as CanvasLayer).visible = false
        elif child is Control: (child as Control).visible = false
    var renderer_name := DisplayServer.get_name().to_lower()
    if renderer_name.find("headless") != -1:
        _issue("Screenshot capture unavailable under headless renderer.")
        _finish()
        return
    for _i in range(3):
        await get_tree().process_frame
    RenderingServer.force_draw(false)
    var texture := get_viewport().get_texture()
    if texture == null:
        _issue("Viewport texture unavailable under current renderer.")
        _finish()
        return
    var img := texture.get_image()
    var attempts := 0
    while (img == null or img.get_width() <= 0 or img.get_height() <= 0) and attempts < 6:
        await get_tree().create_timer(0.05).timeout
        await get_tree().process_frame
        RenderingServer.force_draw(false)
        texture = get_viewport().get_texture()
        if texture == null:
            _issue("Viewport texture unavailable under current renderer.")
            _finish()
            return
        img = texture.get_image()
        attempts += 1
    if img:
        var path := "%s/live_annotation_result.png" % SCREENSHOT_DIR
        if img.save_png(path) == OK:
            _report("  📸 live_annotation_result.png")
        else:
            _issue("Failed to save screenshot.")
    else:
        _issue("Failed to capture viewport.")

    # ── Lightcurve data summary ───────────────────────────────────────────────
    _report("\n## Lightcurve Data Summary")
    for key in ["lightcurveData", "content", "options", "metadata"]:
        if _anomaly.has(key):
            var val = _anomaly[key]
            var preview := ""
            if typeof(val) == TYPE_STRING:
                preview = val.substr(0, 120) + ("..." if val.length() > 120 else "")
            elif typeof(val) == TYPE_DICTIONARY or typeof(val) == TYPE_ARRAY:
                preview = JSON.stringify(val).substr(0, 120) + "..."
            _report("  [%s]: %s" % [key, preview])

    _finish()

# ── Helpers ───────────────────────────────────────────────────────────────────

func _report(line: String) -> void:
    print(line)
    _report_lines.append(line)

func _issue(msg: String) -> void:
    var line := "  ⚠ ISSUE: %s" % msg
    print(line)
    _report_lines.append(line)
    _issues.append(msg)

func _finish() -> void:
    _report("\n---")
    _report("## Summary")
    _report("Issues: %d" % _issues.size())
    for issue in _issues:
        _report("  - %s" % issue)

    var file := FileAccess.open(REPORT_PATH, FileAccess.WRITE)
    if file:
        file.store_string("\n".join(_report_lines))
        file.close()
        print("Report: %s" % REPORT_PATH)

    get_tree().quit(0 if _issues.is_empty() else 1)
