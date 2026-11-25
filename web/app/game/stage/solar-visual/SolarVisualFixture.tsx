'use client'

import { useCallback, useState } from 'react'
import SolarOrbitGlobe from '@/components/game/screens/SolarOrbitGlobe'
import { terrainLookForTarget } from '@/lib/takeon/terrainColour'
import LandingScene from '@/components/game/screens/LandingScene'
import { observedCoverage } from '@/lib/takeon/solarObserved'
import { TARGETS } from '@/lib/data'
import { MISSION_ZONES, type MissionZone } from '@/lib/data/mission-zone'
import TakeOnMount from '@/components/takeon/TakeOnMount'
import { takeonBodyForTarget } from '@/lib/takeon/bodies'

const stages = [0, 0.35, 0.6, 0.85, 1]
const jupiter = TARGETS.find(target => target.id === 'jupiter')!
// Orbit-only review entries do not add destinations to the mission catalog.
const reviewTargets = [...TARGETS, ...['Saturn', 'Uranus', 'Neptune'].map(name => ({ ...jupiter, id: name.toLowerCase(), name }))]

/** Account-free, stationary views of the real landing scene for visual review. */
export default function SolarVisualFixture() {
  const [targetId, setTargetId] = useState('mars')
  const [progress, setProgress] = useState(0)
  const [realism, setRealism] = useState(0)
  const [zone, setZone] = useState<MissionZone>('prime')
  const [showField, setShowField] = useState(false)
  const target = reviewTargets.find(item => item.id === targetId) ?? TARGETS[0]
  const cloudOnly = ['jupiter', 'saturn', 'uranus', 'neptune'].includes(target.id)
  const [globeReady, setGlobeReady] = useState(false)
  const onGlobeReady = useCallback((ready: boolean) => setGlobeReady(ready), [])
  return <main style={{ position: 'fixed', inset: 0, overflow: 'auto', zIndex: 1000, background: '#111a2a', color: '#fff', padding: 16, fontFamily: 'system-ui' }}>
    <h1>Orbit to surface visual test</h1>
    <p>Review an orbital view or a frozen descent over generated terrain.</p>
    <label>Destination{' '}<select value={target.id} onChange={event => setTargetId(event.target.value)} style={{ minHeight: 44, fontSize: 16 }}>
      {reviewTargets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <label> Preview location{' '}<select value={zone} onChange={event => setZone(event.target.value as MissionZone)} style={{ minHeight: 44, fontSize: 16 }}>
      {MISSION_ZONES.map(item => <option key={item} value={item}>{item}</option>)}
    </select></label>
    <div style={{ marginTop: 12 }}>
      <label>Observed imagery: {Math.round(realism * 100)}%{' '}
        <input type="range" min="0" max="100" step="5" value={Math.round(realism * 100)} disabled={observedCoverage(target.id) === 'none'} onChange={event => setRealism(Number(event.target.value) / 100)} />
      </label>
      <p>{cloudOnly ? (observedCoverage(target.id) === 'none' ? 'No observed cloud imagery is bundled for this body.' : 'This blends observed cloud-top imagery with generated bands.') : observedCoverage(target.id) === 'none' ? 'No observed imagery is bundled for this body.' : observedCoverage(target.id) === 'imagery-and-elevation' ? 'Observed global colour and elevation are available. This comparison blends colour only; terrain remains stylised.' : 'Observed global colour is available; measured elevation is not bundled. Terrain remains stylised.'} This is not a 1:1 surface reconstruction.</p>
    </div>
    {!cloudOnly && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
      {stages.map(stage => <button key={stage} onClick={() => setProgress(stage)} aria-pressed={progress === stage} style={{ minHeight: 44, padding: '0 16px', fontSize: 16 }}>{Math.round(stage * 100)}%</button>)}
    </div>}
    {!cloudOnly && <button onClick={() => setShowField(value => !value)} style={{ minHeight: 44, padding: '0 16px', fontSize: 16 }}>{showField ? 'Show descent' : 'Show engine field'}</button>}
    <div style={{ position: 'relative', width: 'min(100%, 1100px)', aspectRatio: '16 / 9', overflow: 'hidden' }}>
      {showField && !cloudOnly ? <div style={{ position: 'absolute', inset: 0 }}><TakeOnMount missionId={`solar-review-${target.id}-${zone}`} bodyId={takeonBodyForTarget(target)} target={target} zone={zone} readOnly startView="iso" /></div> : cloudOnly ? <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 60%, #172438, #02040b 70%)' }}>
        {!globeReady && <p style={{ padding: 16 }}>Loading orbital view…</p>}
        <SolarOrbitGlobe targetId={target.id} zone={zone} colours={terrainLookForTarget(target).ground} scale={1} opacity={1} landable={false} realism={observedCoverage(target.id) === 'none' ? 0 : realism} onReady={onGlobeReady} />
      </div> : <LandingScene target={target} zone={zone} mode="descend" progress={progress} realism={observedCoverage(target.id) === 'none' ? 0 : realism} />}
    </div>
  </main>
}
