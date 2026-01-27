extends Node

# Simple logger utility. Set DEBUG to 'true' during development when you need verbose logs.
# TEMP: enable only when actively debugging image loads. Set to false for normal runs.
const DEBUG := false

static func d(msg):
    if DEBUG:
        print(msg)

static func i(msg):
    # informational (always print)
    print(msg)

static func w(msg):
    # warning
    print("[WARN] " + str(msg))

static func e(msg):
    # error
    push_error(str(msg))
