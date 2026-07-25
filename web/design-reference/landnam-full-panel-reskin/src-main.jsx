import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const PARTS = {
  payload: { label: 'Payload Bay', short: 'Cargo', units: '6 units', effect: 'sets Cargo', stats: ['cargo'], icon: '▦' },
  fuel: { label: 'Fuel Tank', short: 'Fuel', units: '2 units', effect: 'sets Range', stats: ['range'], icon: '◉' },
  engine: { label: 'Engine', short: 'Engine', units: '1 unit', effect: 'sets Drill & Speed', stats: ['drill', 'speed'], icon: '⌁' },
  structure: { label: 'Structure Frame', short: 'Structure', units: '3 units', effect: 'sets Orbit & Durability', stats: ['orbit', 'durability'], icon: '◇' },
}

const STATS = [
  ['cargo', 'Cargo', '6', 6],
  ['orbit', 'Orbit', 'Low', 2],
  ['drill', 'Drill', 'Tier 1', 3],
  ['speed', 'Speed', '—', 4],
  ['range', 'Range', '—', 5],
  ['durability', 'Durability', '—', 3],
]

function Glyph({ children }) {
  return <span className="glyph" aria-hidden="true">{children}</span>
}

function CostChip({ icon, amount }) {
  return <div className="cost-chip"><Glyph>{icon}</Glyph><span>{amount}</span></div>
}

function StatPanel({ activePart }) {
  return (
    <aside className="stats-panel">
      <h2>System telemetry</h2>
      <div className="stat-list">
        {STATS.map(([id, label, value, filled]) => {
          const active = activePart && PARTS[activePart].stats.includes(id)
          return (
            <div className={`stat-row ${active ? 'highlight' : ''}`} key={id}>
              <div className="stat-label-row"><span>{label}</span><strong>{value}</strong></div>
              <div className="pip-bar" aria-label={`${label}: ${filled} of 8`}>
                {Array.from({ length: 8 }, (_, i) => <i className={i < filled ? 'on' : ''} key={i} />)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="telemetry-note">Select a room to inspect the systems it drives.</div>
    </aside>
  )
}

function PartsPanel({ activePart, onSelect, mobileActive }) {
  return (
    <aside className={`parts-panel ${mobileActive ? 'mobile-active' : ''}`}>
      <div className="eyebrow">Installed modules</div>
      <div className="parts-count">12 <span>/ 12 slots</span></div>
      <div className="part-list">
        {Object.entries(PARTS).map(([id, part]) => (
          <button className={`part-row ${activePart === id ? 'active' : ''}`} onClick={() => onSelect(id)} key={id}>
            <Glyph>{part.icon}</Glyph>
            <span className="part-copy"><strong>{part.label}</strong><small>{part.units}</small><em>→ {part.effect}</em></span>
          </button>
        ))}
      </div>
      <div className="parts-foot">All structural rooms online</div>
    </aside>
  )
}

function ShipCutaway({ activePart, onSelect }) {
  return (
    <div className="rocket-stage">
      <div className="ship-cutaway" aria-label="Rocket cutaway with selectable rooms">
        <svg className="hull-svg" viewBox="0 0 600 260" fill="none" aria-hidden="true">
          <path d="M18 130 L70 70 L520 70 Q580 130 520 190 L70 190 Z" fill="#0a2a56" stroke="#70d9ea" strokeWidth="2" />
          <path d="M70 70v120M520 70v120M70 130h450" stroke="#70d9ea" strokeOpacity=".22" strokeDasharray="5 8" />
          <ellipse cx="588" cy="130" rx="20" ry="16" fill="#70d9ea" opacity=".55" />
          <ellipse cx="596" cy="130" rx="32" ry="11" fill="#70d9ea" opacity=".22" />
          <circle cx="46" cy="105" r="3" fill="#70d9ea" opacity=".4" /><circle cx="46" cy="155" r="3" fill="#70d9ea" opacity=".4" />
        </svg>
        <Room id="payload" activePart={activePart} onSelect={onSelect} />
        <Room id="fuel" activePart={activePart} onSelect={onSelect} />
        <Room id="engine" activePart={activePart} onSelect={onSelect} />
        <Room id="structure" activePart={activePart} onSelect={onSelect} />
      </div>
      <div className="ship-hint">Tap a room or installed module to inspect its systems</div>
    </div>
  )
}

function Room({ id, activePart, onSelect }) {
  const part = PARTS[id]
  return (
    <button className={`room room-${id} ${activePart === id ? 'active' : ''}`} onClick={() => onSelect(id)} title={part.label}>
      <span className="room-icon">{part.icon}</span><strong>{part.short}</strong><small>{part.units}</small>
    </button>
  )
}

function App() {
  const [activePart, setActivePart] = useState('engine')
  const [mobilePanel, setMobilePanel] = useState('parts')
  const [confirmed, setConfirmed] = useState(false)

  return (
    <main className="stage">
      <section className="app-shell">
        <header className="topbar">
          <div><div className="kicker">Launchpad · Assembly Bay</div><h1>Rocket Construction</h1><p>Explorer · Tier 1 · Interior systems online</p></div>
          <div className="top-actions"><div className="cost-readout"><CostChip icon="◆" amount="120" /><CostChip icon="◇" amount="80" /><CostChip icon="◌" amount="12" /></div><button className="close-button" aria-label="Close construction">×</button></div>
        </header>

        <div className="delivery-banner"><span>↗</span><strong>Two-stop job</strong><span>Deliver to Helios Propulsion Depot, then relay to 433 Eros</span></div>
        <div className="mobile-tabs"><button className={mobilePanel === 'parts' ? 'active' : ''} onClick={() => setMobilePanel('parts')}>Modules</button><button className={mobilePanel === 'stats' ? 'active' : ''} onClick={() => setMobilePanel('stats')}>Telemetry</button></div>

        <div className="construction-body">
          <PartsPanel activePart={activePart} onSelect={setActivePart} mobileActive={mobilePanel === 'parts'} />
          <ShipCutaway activePart={activePart} onSelect={setActivePart} />
          <div className={mobilePanel === 'stats' ? 'stats-mobile-active' : ''}><StatPanel activePart={activePart} /></div>
        </div>

        <footer className="build-footer">
          <div className="build-status"><span className="status-dot" /> Assembly complete <small>All rooms responding</small></div>
          <button className="confirm-button" onClick={() => setConfirmed(true)}>{confirmed ? 'Build Confirmed' : 'Confirm Build'} <span>→</span></button>
        </footer>
        <div className="step-footer"><span className="done">✓ Mission</span><span>→</span><span className="done">✓ Target</span><span>→</span><strong>Rocket</strong><span>→</span><span>Relay</span></div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
