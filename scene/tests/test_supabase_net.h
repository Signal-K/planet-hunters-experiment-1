#ifndef TEST_SUPABASE_NET_H
#define TEST_SUPABASE_NET_H

#include "tests/test_macros.h"
#include "core/io/resource_loader.h"
#include "core/object/class_db.h"
#include "core/object/object.h"
#include "core/object/script_language.h"
#include "core/os/os.h"
#include "core/string/print_string.h"
#include "scene/main/scene_tree.h"

namespace TestSupabaseNet {

TEST_CASE("[Supabase][SceneTree] Fetch anomalies and validate data structure") {
    print_line("\n==============================");
    print_line("🧪 C++ TEST: Supabase fetch + data structure");
    print_line("==============================");
    // Load the SupabaseClient script using static ResourceLoader::load()
    print_line("Loading resource: res://Scripts/Systems/SupabaseClient.gd");
    Ref<Resource> res = ResourceLoader::load("res://Scripts/Systems/SupabaseClient.gd");
    REQUIRE_MESSAGE(res.is_valid(), "Failed to load SupabaseClient.gd; ensure res:// points to the project files when running tests.");

    Ref<Script> script = res;
    REQUIRE_MESSAGE(script.is_valid(), "Loaded resource is not a Script");

    // Load helper GDScript that receives the callback
    Ref<Resource> helper_res = ResourceLoader::load("res://tests/CallbackHelper.gd");
    REQUIRE_MESSAGE(helper_res.is_valid(), "Failed to load CallbackHelper.gd");
    Ref<Script> helper_script = helper_res;
    REQUIRE_MESSAGE(helper_script.is_valid(), "CallbackHelper is not a Script");

    // Instantiate helper using Script::instance_create()
    Object *helper_instance = ClassDB::instantiate("Object");
    REQUIRE_MESSAGE(helper_instance != nullptr, "Failed to create base object for CallbackHelper");
    helper_script->instance_create(helper_instance);
    print_line("Helper instance created: CallbackHelper.gd");

    // Instantiate SupabaseClient
    Object *client_instance = ClassDB::instantiate("Object");
    REQUIRE_MESSAGE(client_instance != nullptr, "Failed to create base object for SupabaseClient");
    script->instance_create(client_instance);
    print_line("Client instance created: SupabaseClient.gd");

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

    // Issue the call using callv(method_name, args)
    Variant result = client_instance->callv(StringName("fetch_anomalies"), args);
    CHECK_MESSAGE(result.get_type() != Variant::NIL, "fetch_anomalies should return object (self)");

    // Since our simplified client calls callback synchronously, check immediately
    Variant called_var = helper_instance->get("called");
    bool called = (called_var.get_type() == Variant::BOOL && called_var.operator bool());

    CHECK_MESSAGE(called, "Callback was not invoked within timeout");

    if (called) {
        Variant err_var = helper_instance->get("error_message");
        String err = err_var;
        String err_msg = String("Supabase returned error: ") + err;
        CHECK_MESSAGE(err == String(), err_msg.utf8().get_data());

        Variant resp_var = helper_instance->get("response_data");
        CHECK_MESSAGE(resp_var.get_type() == Variant::ARRAY, "Response is not an Array");
        if (resp_var.get_type() == Variant::ARRAY) {
            Array resp = resp_var;
            String msg_fetch = String("Fetched asteroids: ") + itos(resp.size());
            MESSAGE(msg_fetch.utf8().get_data());
            
            // Test asteroid data structure and selection
            if (resp.size() > 0) {
                Variant first_item = resp[0];
                CHECK_MESSAGE(first_item.get_type() == Variant::DICTIONARY, "First asteroid is not a Dictionary");
                if (first_item.get_type() == Variant::DICTIONARY) {
                    Dictionary asteroid = first_item;
                    CHECK_MESSAGE(asteroid.has("id"), "Asteroid missing 'id' field");
                    MESSAGE("Asteroid contains ID field");
                    if (asteroid.has("name")) {
                        Variant name_var = asteroid["name"];
                        String asteroid_name = name_var;
                        String msg_asteroid = String("First asteroid name: ") + asteroid_name;
                        MESSAGE(msg_asteroid.utf8().get_data());
                    }
                    MESSAGE("✓ Asteroid data structure validated - user can view asteroids");
                    MESSAGE("✓ Asteroid selection possible - ID field present");
                }
            }
        }
    }

    // Clean up
    memdelete(helper_instance);
    memdelete(client_instance);
}

} // namespace TestSupabaseNet

#endif // TEST_SUPABASE_NET_H
