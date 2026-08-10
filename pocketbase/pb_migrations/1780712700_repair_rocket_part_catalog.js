// Keep existing PocketBase installs aligned with the repaired rocket-part
// catalog. The original seed migration has already run on deployed databases,
// so changing that seed alone would leave stale names and broken image paths.
migrate((app) => {
  try {
    app.db().newQuery("UPDATE rocket_parts SET name = 'Prospector Unibody Frame' WHERE slug = 'hull-mk2'").execute()
    app.db().newQuery("UPDATE rocket_parts SET img = '/parts/cargo_bay_t1.png' WHERE slug = 'cargo-module-t1'").execute()
  } catch {}
}, (app) => {
  try {
    app.db().newQuery("UPDATE rocket_parts SET name = 'SR2 Unibody Frame' WHERE slug = 'hull-mk2'").execute()
    app.db().newQuery("UPDATE rocket_parts SET img = '/parts/drill-hand.png' WHERE slug = 'cargo-module-t1'").execute()
  } catch {}
})
