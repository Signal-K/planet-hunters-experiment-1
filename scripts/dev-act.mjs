#!/usr/bin/env node
// Replays steps inside the Simple Browser tab that has ?follow=1 open (dev only).
// Usage: node scripts/dev-act.mjs 'key:ArrowUp:600' 'wait:300' 'click:Fire' 'key:Space:800'
const actions = process.argv.slice(2).map((s) => {
  const [kind, a, b] = s.split(':')
  if (kind === 'key') return { key: a, hold: Number(b ?? 120) }
  if (kind === 'click') return { click: [a, b].filter(Boolean).join(':') }
  return { wait: Number(a ?? 300) }
})
const res = await fetch('http://localhost:3001/api/dev/follow', { method: 'POST', body: JSON.stringify({ actions }) })
console.log(res.ok ? `queued ${actions.length} actions` : `failed ${res.status}`)
