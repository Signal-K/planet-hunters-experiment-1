#!/usr/bin/env node
// Local fixtures only; preserves existing claims and treasury history on restart.
const port = Number(process.env.LANDNAM_PB_DEV_PORT ?? 8096)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local port')
const base = `http://127.0.0.1:${port}`
async function request(path, body, token) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? {Authorization: token} : {}) },
    ...(body ? {body: JSON.stringify(body)} : {}),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return response.json()
}
const {token} = await request('/api/collections/_superusers/auth-with-password', {
  identity: 'liam@skinetics.tech', password: 'ThisIsATestPassword',
})
const now = Date.now()
const {items} = await request('/api/collections/anomalies/records?perPage=200', null, token)
const live = items.filter(r => r.expires > now && r.left > 0)
const slots = new Set(live.map(r => r.slot))
for (const type of ['asteroid','comet']) {
  if (live.some(r => r.type === type)) continue
  const slot = [0,1,2,3,4,5].find(i => !slots.has(i))
  if (slot === undefined) continue
  await request('/api/collections/anomalies/records', {
    type, slot, spawned: now, expires: now + (type === 'asteroid' ? 72 : 48) * 3600000,
    capacity: 2, left: 2,
  }, token)
  slots.add(slot)
  console.log(`Seeded capacity-2 ${type} in slot ${slot}`)
}
console.log('Local mining fixtures ready. Existing claims and treasury receipts preserved.')
