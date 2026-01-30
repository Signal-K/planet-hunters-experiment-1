extends RefCounted
class_name TimeHelper

static func get_unix_epoch_seconds() -> int:
    # 1) Time singleton (use dynamic calls to avoid parse errors on older builds)
    if Engine.has_singleton("Time"):
        var time_single = Engine.get_singleton("Time")
        if time_single:
            if time_single.has_method("get_unix_time_from_system"):
                var tt = time_single.call("get_unix_time_from_system")
                if typeof(tt) in [TYPE_INT, TYPE_FLOAT]:
                    return int(tt)
            if time_single.has_method("get_unix_time"):
                var tt2 = time_single.call("get_unix_time")
                if typeof(tt2) in [TYPE_INT, TYPE_FLOAT]:
                    return int(tt2)
            if time_single.has_method("get_unix_time_secs"):
                var tt3 = time_single.call("get_unix_time_secs")
                if typeof(tt3) in [TYPE_INT, TYPE_FLOAT]:
                    return int(tt3)

    # 2) OS methods (fallback)
    if OS.has_method("get_unix_time"):
        var tso = OS.call("get_unix_time")
        if typeof(tso) in [TYPE_INT, TYPE_FLOAT]:
            return int(tso)
    if OS.has_method("get_unix_time_secs"):
        var tso2 = OS.call("get_unix_time_secs")
        if typeof(tso2) in [TYPE_INT, TYPE_FLOAT]:
            return int(tso2)

    # 3) Fallback to high-resolution ticks divided down
    if OS.has_method("get_ticks_usec"):
        var usec = OS.call("get_ticks_usec")
        if typeof(usec) in [TYPE_INT, TYPE_FLOAT]:
            return int(usec / 1000000)
    if OS.has_method("get_ticks_msec"):
        var msec = OS.call("get_ticks_msec")
        if typeof(msec) in [TYPE_INT, TYPE_FLOAT]:
            return int(msec / 1000)

    # 4) Last resort
    if OS.has_method("get_time"):
        var tget = OS.call("get_time")
        if typeof(tget) in [TYPE_INT, TYPE_FLOAT]:
            return int(tget)

    return 0
