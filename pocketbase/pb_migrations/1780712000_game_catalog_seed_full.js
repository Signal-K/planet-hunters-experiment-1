migrate((app) => {
  const mineralCol = app.findCollectionByNameOrId('minerals')
  const contractorCol = app.findCollectionByNameOrId('contractors')

  const extraMinerals = [
    { slug: 'nickel', name: 'Nickel', sym: 'Ni', color: '#b0b8c4', base_price: 150 },
    { slug: 'cobalt', name: 'Cobalt', sym: 'Co', color: '#4f9cf7', base_price: 450 },
  ]
  for (const row of extraMinerals) {
    try {
      app.findFirstRecordByData('minerals', 'slug', row.slug)
    } catch {
      app.save(new Record(mineralCol, row))
    }
  }

  const extraContractors = [
    { slug: 'lunarore',  name: 'Lunar ORE Inc',   color: '#a8d8ea', initial: 'LO', unlock_tier: 2 },
    { slug: 'deepcore',  name: 'DeepCore Ltd',    color: '#70e070', initial: 'DC', unlock_tier: 2 },
    { slug: 'vestarock', name: 'VestaRock Co',    color: '#c084ff', initial: 'VR', unlock_tier: 2 },
    { slug: 'helio',     name: 'Helio Syndicate', color: '#ff8c42', initial: 'HS', unlock_tier: 3 },
    { slug: 'triton',    name: 'Triton Collective', color: '#5fcde6', initial: 'TC', unlock_tier: 3 },
    { slug: 'axiom',     name: 'Axiom Resources', color: '#f5a623', initial: 'AR', unlock_tier: 3 },
    { slug: 'origin',    name: 'Origin Base',     color: '#39d36a', initial: 'OB', unlock_tier: 1 },
  ]
  for (const row of extraContractors) {
    try {
      app.findFirstRecordByData('contractors', 'slug', row.slug)
    } catch {
      app.save(new Record(contractorCol, row))
    }
  }
}, (app) => {
  const extraSlugs = ['nickel', 'cobalt']
  try { app.db().newQuery(`DELETE FROM minerals WHERE slug IN ('${extraSlugs.join("','")}')`).execute() } catch {}

  const extraConSlugs = ['lunarore', 'deepcore', 'vestarock', 'helio', 'triton', 'axiom', 'origin']
  try { app.db().newQuery(`DELETE FROM contractors WHERE slug IN ('${extraConSlugs.join("','")}')`).execute() } catch {}
})
