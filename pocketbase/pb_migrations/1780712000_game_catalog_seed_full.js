migrate((app) => {
  const stale = {
    contractors: ['foundry3', 'cryos', 'beltgold', 'lunarore', 'deepcore', 'vestarock', 'helio', 'triton', 'axiom', 'origin'],
    locations: ['tess-451b', 'koi-7923-belt'],
    missions_catalog: ['m3-gold', 'm4-rare'],
  }

  for (const [collection, slugs] of Object.entries(stale)) {
    const inList = slugs.map(s => `'${s}'`).join(',')
    try { app.db().newQuery(`DELETE FROM ${collection} WHERE slug IN (${inList})`).execute() } catch {}
  }
}, (app) => {
  // No down migration: this only removes stale pre-v0 seed rows superseded by
  // 1780711800_game_catalog_seed.js and the Go seedCatalog() reconciler.
})
