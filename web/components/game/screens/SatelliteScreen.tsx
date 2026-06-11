import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import StatusPill from '@/components/ui/StatusPill'

function randomCandidate() {
  const id = 'tess-' + Math.random().toString(36).substring(2, 7)
  const eta = Math.random()
  return {
    id,
    period: (0.5 + eta * 14).toFixed(1),
    depth: (0.1 + eta * 3).toFixed(2),
    likelyPlanet: eta > 0.3,
  }
}

export default function SatelliteScreen({
  annotations,
  onClassify,
  onBack,
}: {
  annotations: number
  onClassify: (verdict: 'planet' | 'not_planet') => void
  onBack: () => void
}) {
  const [candidate, setCandidate] = useState<{ id: string; period: string; depth: string; likelyPlanet: boolean } | null>(null)
  const [result, setResult] = useState<{ verdict: string; annotation: boolean } | null>(null)

  function scan() {
    setCandidate(randomCandidate())
    setResult(null)
  }

  function classify(verdict: 'planet' | 'not_planet') {
    onClassify(verdict)
    setResult({
      verdict: verdict === 'planet' ? 'PLANET CONFIRMED' : 'NO SIGNAL',
      annotation: verdict === 'planet',
    })
    setCandidate(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0f1a] text-white">
      <TopBar title="Satellite Uplink" onBack={onBack} right={<StatusPill kind="info">{annotations} ANNOTATIONS</StatusPill>} />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <Panel>
          <p className="text-sm text-[#a9b8ce] mb-3">
            Orbital relay active. Scan TESS lightcurve data to classify candidate signals.
            Planet confirmations earn research annotations — each annotation boosts
            discovery payouts by 1%.
          </p>
        </Panel>

        {!candidate && !result && (
          <PrimaryBtn kind="cyan" onClick={scan}>Scan TESS Data</PrimaryBtn>
        )}

        {candidate && (
          <Panel>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#a9b8ce]">Orbital Period</span>
                <span>{candidate.period} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a9b8ce]">Transit Depth</span>
                <span>{candidate.depth}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a9b8ce]">Likelihood</span>
                <StatusPill kind={candidate.likelyPlanet ? 'ok' : 'warn'}>{candidate.likelyPlanet ? 'PROMISING' : 'UNCLEAR'}</StatusPill>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <PrimaryBtn kind="amber" onClick={() => classify('planet')}>Confirm Planet</PrimaryBtn>
              <PrimaryBtn kind="amber" onClick={() => classify('not_planet')}>False Positive</PrimaryBtn>
            </div>
          </Panel>
        )}

        {result && (
          <Panel>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: result.verdict === 'PLANET CONFIRMED' ? '#39d36a' : '#f5a623' }}>{result.verdict}</div>
            <p className="text-sm text-[#a9b8ce] mb-3">
              {result.annotation ? '+1 Research Annotation · Discovery bonus +1%' : 'No annotation recorded'}
            </p>
            <PrimaryBtn kind="cyan" onClick={scan}>Scan Another</PrimaryBtn>
          </Panel>
        )}
      </div>
    </div>
  )
}
