// C++ unit test for SupabaseClient.gd
// Intended to be copied into the Godot engine source tree (for example: godot/tests/)
// and executed with the engine's test runner. This test verifies the GDScript
// resource loads and can be instantiated when run inside a built Godot engine
// (GDScript runtime must be available).

#include "testing/testing.h"
#include "core/io/resource_loader.h"
#include "core/object/object.h"
#include "core/variant/variant.h"

using namespace godot;

TEST_CASE("[Supabase/C++][Resource] SupabaseClient GDScript loads and instantiates") {
    Ref<Resource> res = ResourceLoader::get_singleton()->load("res://Scripts/Systems/SupabaseClient.gd");
    TEST_ASSERT_MSG(res.is_valid(), "Failed to load res://Scripts/Systems/SupabaseClient.gd - ensure project files are available to the engine when running tests");

    Ref<Script> script = res;
    TEST_ASSERT_MSG(script.is_valid(), "Loaded resource is not a Script");

    // Attempt to create an instance of the script. This requires the engine's
    // GDScript runtime to be initialized; when running under the engine test
    // runner this should succeed.
    Object *instance = nullptr;
    if (script.is_valid()) {
        // Many engine versions expose `new_instance()` on `Script`.
        // If your engine version differs, adapt to the appropriate API (e.g. instantiate()).
        instance = script->new_instance();
    }

    TEST_ASSERT_MSG(instance != nullptr, "Failed to instantiate SupabaseClient script. Make sure tests run inside a built Godot engine with GDScript enabled.");

    if (instance) {
        // Check the instance has the method we expect to call from C++/GDScript
        bool has_method = instance->has_method("fetch_anomalies");
        TEST_ASSERT_MSG(has_method, "SupabaseClient instance does not expose fetch_anomalies() method");

        // Clean up the instance
        memdelete(instance);
    }
}

// NOTE: For network interaction tests (calling fetch_anomalies and asserting
// returned data), extend this test inside the engine test runner to:
//  - instantiate the script
//  - create a helper Node with a callback method to receive the results
//  - call fetch_anomalies with a Callable pointing to that helper
//  - run the main loop until the callback fires (or use the engine test helpers)
// Doing so requires the test to run inside a full engine build; CI integration
// instructions are in the accompanying README.
    // Verify the resource path matches the expected script path
    String path = res->get_path();
    TEST_ASSERT(path == "res://Scripts/Systems/SupabaseClient.gd");
}
