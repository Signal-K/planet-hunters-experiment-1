// Backfill Orionids progress for saves created before the event card started
// its own mission. Those users may have an older Orionids run, fragment ledger,
// event badge, or completed event record without orionidsEventStage set.
// The repair is evidence-based and idempotent: it never guesses from an
// ordinary hydrogen mission and never reduces a player's existing tier.
migrate((app) => {
  let records
  try {
    records = app.findRecordsByFilter('game_states', 'id != ""', '', 0, 0)
  } catch {
    return
  }

  const positive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0
  const hasEntries = (value) => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0

  for (const record of records) {
    let state = record.get('state')
    if (typeof state === 'string') {
      try { state = JSON.parse(state) } catch { continue }
    }
    if (!state || typeof state !== 'object') continue
    const player = state.player
    if (!player || typeof player !== 'object') continue

    const completed = Array.isArray(player.completedMissions) ? player.completedMissions.filter((mission) => {
      const text = `${mission?.id ?? ''} ${mission?.title ?? ''}`.toLowerCase()
      return text.includes('orionid')
    }) : []
    const surfaceCompleted = completed.some((mission) => /surface observation|field rover|rover observation/i.test(`${mission?.id ?? ''} ${mission?.title ?? ''}`))
    const attempted = positive(player.orionidsRunBaseline)
      || positive(player.orionidsFragments?.caught)
      || positive(player.orionidsNightCatches?.count)
      || hasEntries(player.orionidsFinds)
      || !!player.badges?.['orionids-2026']
      || completed.length > 0
    if (!attempted) continue

    const currentStage = Number.isFinite(player.orionidsEventStage) ? player.orionidsEventStage : 0
    const nextStage = surfaceCompleted ? 2 : Math.max(currentStage, 1)
    const stamps = player.researchStamps && typeof player.researchStamps === 'object' && !Array.isArray(player.researchStamps)
      ? { ...player.researchStamps } : {}
    const stampAt = completed.reduce((latest, mission) =>
      typeof mission?.completedAt === 'number' && Number.isFinite(mission.completedAt)
        ? Math.max(latest, mission.completedAt) : latest, Date.now())
    const day = new Date(stampAt).toISOString().slice(0, 10)
    const dayStamps = Array.isArray(stamps[day]) ? stamps[day] : []
    if (!dayStamps.includes('event')) stamps[day] = [...dayStamps, 'event']

    const currentStamps = JSON.stringify(player.researchStamps ?? {})
    const nextStamps = JSON.stringify(stamps)
    if (currentStage >= nextStage && currentStamps === nextStamps) continue
    const nextState = { ...state, player: { ...player, orionidsEventStage: nextStage, researchStamps: stamps } }
    record.set('state', nextState)
    record.set('missions_done', Number.isFinite(player.missionsDone) ? player.missionsDone : 0)
    app.save(record)
  }
}, () => {
  // This is a monotonic credit repair. Reversing it would risk deleting valid
  // event progress earned after the migration ran.
})
