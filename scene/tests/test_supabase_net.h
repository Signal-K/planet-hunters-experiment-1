#ifndef TEST_SUPABASE_NET_H
#define TEST_SUPABASE_NET_H

#include "tests/test_macros.h"
#include "core/io/resource_loader.h"
#include "core/object/object.h"
#include "core/os/os.h"
#include "scene/main/scene_tree.h"

namespace TestSupabaseNet {

TEST_CASE("[Supabase][SceneTree] Fetch anomalies and validate data structure") {
    // Load the SupabaseClient script
    Ref<Resource> res = ResourceLoader::get_singleton()->load("res://Scripts/Systems/SupabaseClient.gd");
    REQUIRE_MESSAGE(res.is_valid(), "Failed to load SupabaseClient.gd; ensure res:// points to the project files when running tests.");

    Ref<Script> script = res;
    REQUIRE_MESSAGE(script.is_valid(), "Loaded resource is not a Script");

    // Load helper GDScript that receives the callback
    Ref<Resource> helper_res = ResourceLoader::get_singleton()->load("res://scene/tests/CallbackHelper.gd");
    REQUIRE_MESSAGE(helper_res.is_valid(), "Failed to load CallbackHelper.gd");
    Ref<Script> helper_script = helper_res;
    REQUIRE_MESSAGE(helper_script.is_valid(), "CallbackHelper is not a Script");

    Object *helper_instance = helper_script->new_instance();
    REQUIRE_MESSAGE(helper_instance != nullptr, "Failed to instantiate CallbackHelper");

    // Instantiate SupabaseClient
    Object *client_instance = script->new_instance();
    REQUIRE_MESSAGE(client_instance != nullptr, "Failed to instantiate SupabaseClient");

    // Optionally override SUPABASE_URL from environment variable (for CI)
    String env_url = OS::get_singleton()->get_environment("SUPABASE_URL");
    if (env_url != "") {
        String msg_url = String("Using SUPABASE_URL from environment: ") + env_url;
        MESSAGE(msg_url.utf8().get_data());
        client_instance->set("SUPABASE_URL", env_url);
    }

    // Create Callable(helper_instance, "on_fetch")
    Callable cb = Callable(helper_instance, "on_fetch");

    // Call fetch_anomalies(anomaly_set, limit, callback)
    Array args;
    args.push_back(String("active-asteroids"));
    args.push_back(1);
    args.push_back(Variant(cb));

    // Ensure SceneTree is available
    REQUIRE_MESSAGE(SceneTree::get_singleton() != nullptr, "SceneTree singleton not available");

    // Issue the call
    client_instance->callv(args);

    // Wait for callback with configurable timeout (default 10s, override via TEST_TIMEOUT_MS env var)
    String timeout_str = OS::get_singleton()->get_environment("TEST_TIMEOUT_MS");
    int64_t timeout_ms = 10000;  // default
    if (timeout_str != "") {
        timeout_ms = timeout_str.to_int();
        String msg_to = String("Using TEST_TIMEOUT_MS from environment: ") + itos(timeout_ms) + String(" ms");
        MESSAGE(msg_to.utf8().get_data());
    }

    int64_t start = OS::get_singleton()->get_ticks_msec();
    bool called = false;

    while (OS::get_singleton()->get_ticks_msec() - start < timeout_ms) {
        // Process a small timestep so HTTPRequest and signals can be processed
        SceneTree::get_singleton()->process(0.05);

        Variant called_var = helper_instance->get("called");
        if (called_var.get_type() == Variant::BOOL && called_var.operator bool()) {
            called = true;
            break;
        }
    }

    CHECK_MESSAGE(called, "Callback was not invoked within timeout");

    if (called) {
        Variant err_var = helper_instance->get("error");
        String err = err_var;
        String err_msg = String("Supabase returned error: ") + err;
        CHECK_MESSAGE(err == String(), err_msg.utf8().get_data());

        Variant resp_var = helper_instance->get("response");
        CHECK_MESSAGE(resp_var.get_type() == Variant::ARRAY, "Response is not an Array");
        if (resp_var.get_type() == Variant::ARRAY) {
            Array resp = resp_var;
            String msg_fetch = String("Fetched items: ") + itos(resp.size());
            MESSAGE(msg_fetch.utf8().get_data());
        }
    }

    // Clean up
    memdelete(helper_instance);
    memdelete(client_instance);
}

} // namespace TestSupabaseNet

#endif // TEST_SUPABASE_NET_H
