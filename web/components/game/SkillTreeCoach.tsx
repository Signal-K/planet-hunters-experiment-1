'use client'

import { useEffect, useState } from 'react'

// Self-contained "Mission Coach" walkthrough for the Skill Tree, modeled on
// ScanStationCoach.tsx / FreeOpsBuildCoach.tsx. Deliberately NOT wired into
// the global M1-M3 onboarding stepper — this is a narrower, screen-local
// beat shown once (persisted in localStorage) the first time a player opens
// the Skill Tree. KES-134: the screen shipped with per-node descriptions but
// no explanation of where skill points come from or what License Grade is
// for — Liam decided (2026-08-07) this stays plain DOM/CSS rather than a
// PixiJS node-graph, so this coach is the full remediation for the gap.
const STEPS = [
  {
    title: 'SKILL POINTS ARE EARNED, NOT BOUGHT',
    body: 'Skill Points come from milestones — completed missions, first launches, research thresholds. Spend them here on permanent upgrades to mining, cargo, range, and engineering.',
  },
  {
    title: 'LICENSE GRADE GATES YOUR CEILING',
    body: 'Research XP raises your License Grade. A higher grade does not spend XP — it raises the ceiling on what you are allowed to build and fly, independent of what Skill Points you have unlocked.',
  },
  {
    title: 'UNLOCKS ARE PERMANENT',
    body: 'Every node you unlock here stays unlocked for the rest of the game — there is no respec. Spend on the branch that matches what you are doing next.',
  },
]

const STORAGE_KEY = 'landnam_skill_tree_coach_seen_v1'

export function useSkillTreeCoach() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // localStorage unavailable (private mode, etc.) — just skip the coach
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try { window.localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
  }

  return { visible, dismiss }
}

export default function SkillTreeCoach({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  return (
    <div
      data-testid="skill-tree-coach"
      style={{
        position: 'absolute',
        top: 70, left: 10, right: 10, zIndex: 60,
        background: 'linear-gradient(160deg, rgba(16,16,18,0.98), rgba(11,11,13,0.98))',
        border: '1.5px solid rgba(112,217,234,0.7)',
        borderRadius: 12,
        padding: '9px 11px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <div style={{
          width: 22, height: 22, flexShrink: 0, borderRadius: '50%',
          border: '1.5px solid var(--ln-cyan)', background: 'rgba(112,217,234,0.08)',
          display: 'grid', placeItems: 'center',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--ln-cyan-bright)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
            Mission Coach · {step + 1}/{STEPS.length}
          </div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800, letterSpacing: '0.02em', color: '#e8f0fe', textTransform: 'uppercase', lineHeight: 1.1 }}>
            {current.title}
          </div>
        </div>
        <button
          data-testid="skill-tree-coach-skip"
          onClick={onDismiss}
          style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, letterSpacing: '0.08em', color: 'var(--ln-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', padding: 2 }}
        >
          Skip
        </button>
      </div>
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 10.5, color: 'var(--ln-text-dim)', lineHeight: 1.35, marginBottom: 7 }}>
        {current.body}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i < step ? 'var(--ln-ok)' : i === step ? 'var(--ln-cyan)' : 'rgba(112,217,234,0.2)',
              boxShadow: i === step ? '0 0 6px rgba(112,217,234,0.6)' : 'none',
            }} />
          ))}
        </div>
        <button
          data-testid="skill-tree-coach-next"
          onClick={() => (step < STEPS.length - 1 ? setStep(s => s + 1) : onDismiss())}
          style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'linear-gradient(180deg,#6cc2ff,#2d8de0)', color: '#06121f', border: 'none', borderRadius: 7, padding: '5px 13px', cursor: 'pointer',
          }}
        >
          {step === STEPS.length - 1 ? 'Got It ›' : 'Next ›'}
        </button>
      </div>
    </div>
  )
}
