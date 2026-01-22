extends RefCounted

var SUPABASE_URL := "http://127.0.0.1:54321"

func fetch_anomalies(anomaly_set, limit, callback):
    # Minimal stub: immediately invoke the provided callback with no error
    var resp := []
    if typeof(callback) == TYPE_CALLABLE or callback is Callable:
        callback.call("", resp)
    else:
        # If the callback arrived as a Variant-wrapped Callable, try to call it directly
        # This keeps the stub tolerant to how C++ passes the Callable.
        if callback.callable_exists("call"):
            callback.call("", resp)
