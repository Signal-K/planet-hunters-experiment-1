extends Control

# Archived copy of DrawingCanvas (full functionality preserved in archive)
signal drawing_changed(count)

enum Mode { FREEFORM, RECT, CIRCLE }

var mode := Mode.FREEFORM
var pen_enabled := false
var pen_color := Color(0, 1, 0)
var pen_width := 3.0

var is_drawing := false
var start_point := Vector2.ZERO
var current_point := Vector2.ZERO

var all_strokes := []

func _ready():
    mouse_filter = Control.MOUSE_FILTER_STOP

func toggle_pen():
    pen_enabled = !pen_enabled
    if not pen_enabled and is_drawing:
        _end_drawing()
    queue_redraw()

func is_pen_enabled() -> bool:
    return pen_enabled

func set_mode(new_mode: int):
    mode = new_mode

func set_pen_color(color: Color):
    pen_color = color
    queue_redraw()

func set_pen_width(width: float):
    pen_width = width
    queue_redraw()

func clear_drawing():
    all_strokes.clear()
    is_drawing = false
    queue_redraw()
    emit_signal("drawing_changed", all_strokes.size())

func get_annotation_count() -> int:
    return all_strokes.size()

func get_drawing_data() -> Array:
    return all_strokes.duplicate()

func set_drawing_data(strokes: Array):
    all_strokes.clear()
    for s in strokes:
        all_strokes.append(s)
    queue_redraw()

func _gui_input(event):
    if not pen_enabled:
        return
    if event is InputEventMouseButton:
        if event.button_index == MOUSE_BUTTON_LEFT:
            if event.pressed:
                _start_drawing(event.position)
            else:
                _end_drawing()
    elif event is InputEventMouseMotion:
        if event.button_mask & MOUSE_BUTTON_MASK_LEFT:
            _update_current_point(event.position)
    elif event is InputEventScreenTouch:
        if event.pressed:
            _start_drawing(event.position)
        else:
            _end_drawing()
    elif event is InputEventScreenDrag:
        _update_current_point(event.position)

func _start_drawing(pos: Vector2):
    is_drawing = true
    start_point = pos
    current_point = pos
    if mode == Mode.FREEFORM:
        var stroke = {"type":"freeform", "points": [pos], "color": pen_color, "width": pen_width}
        all_strokes.append(stroke)
    queue_redraw()

func _update_current_point(pos: Vector2):
    if not is_drawing:
        return
    current_point = pos
    if mode == Mode.FREEFORM:
        var stroke = all_strokes[all_strokes.size() - 1]
        var pts = stroke["points"]
        if pts.size() == 0 or pts[pts.size() - 1].distance_to(pos) > 2.0:
            pts.append(pos)
    queue_redraw()

func _end_drawing():
    if not is_drawing:
        return
    is_drawing = false
    if mode == Mode.RECT:
        var r = Rect2(start_point, current_point - start_point)
        var stroke = {"type":"rect", "rect": r.abs(), "color": pen_color, "width": pen_width}
        all_strokes.append(stroke)
    elif mode == Mode.CIRCLE:
        var center = (start_point + current_point) * 0.5
        var radius = start_point.distance_to(current_point) * 0.5
        var stroke = {"type":"circle", "center": center, "radius": radius, "color": pen_color, "width": pen_width}
        all_strokes.append(stroke)
    emit_signal("drawing_changed", all_strokes.size())
    queue_redraw()

func _draw():
    for s in all_strokes:
        var t = s.get("type", "freeform")
        var c = s.get("color", pen_color)
        var w = s.get("width", pen_width)
        if t == "freeform":
            var pts = s.get("points", [])
            for i in range(pts.size() - 1):
                draw_line(pts[i], pts[i + 1], c, w, true)
            for p in pts:
                draw_circle(p, w * 0.5, c)
        elif t == "rect":
            var r = s.get("rect", Rect2())
            draw_line(r.position, r.position + Vector2(r.size.x, 0), c, w)
            draw_line(r.position, r.position + Vector2(0, r.size.y), c, w)
            draw_line(r.position + r.size, r.position + Vector2(r.size.x, 0), c, w)
            draw_line(r.position + r.size, r.position + Vector2(0, r.size.y), c, w)
        elif t == "circle":
            var center = s.get("center", Vector2.ZERO)
            var radius = s.get("radius", 0)
            w = s.get("width", pen_width)
            draw_arc(center, radius, 0.0, TAU, 64, c, w)
    if is_drawing:
        if mode == Mode.FREEFORM:
            var sidx = all_strokes.size() - 1
            if sidx >= 0:
                var pts = all_strokes[sidx].get("points", [])
                for i in range(max(0, pts.size() - 1)):
                    draw_line(pts[i], pts[i + 1], pen_color, pen_width, true)
        elif mode == Mode.RECT:
            var r = Rect2(start_point, current_point - start_point).abs()
            draw_line(r.position, r.position + Vector2(r.size.x, 0), pen_color, pen_width)
            draw_line(r.position, r.position + Vector2(0, r.size.y), pen_color, pen_width)
            draw_line(r.position + r.size, r.position + Vector2(r.size.x, 0), pen_color, pen_width)
            draw_line(r.position + r.size, r.position + Vector2(0, r.size.y), pen_color, pen_width)
        elif mode == Mode.CIRCLE:
            var center = (start_point + current_point) * 0.5
            var radius = start_point.distance_to(current_point) * 0.5
            draw_arc(center, radius, 0.0, TAU, 64, pen_color, pen_width)
