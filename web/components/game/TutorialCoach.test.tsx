// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TutorialStep } from '@/lib/data'
import TutorialCoach from './TutorialCoach'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// jsdom doesn't implement matchMedia; useIsDesktop() needs it. Mobile (no
// match) is the relevant case for this bug, so default to non-matching.
window.matchMedia = window.matchMedia || ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia

function baseStep(overrides: Partial<TutorialStep>): TutorialStep {
  return {
    id: 1,
    screen: 'hub',
    title: 'Test step',
    body: 'Body',
    anchor: 'bottom',
    spot: null,
    cta: 'thing',
    ...overrides,
  }
}

// SSL-280: the Missions tab had two independent tutorial-highlight
// mechanisms firing at once — a pixel-perfect CSS box-shadow pulse applied
// directly to the button, and a separately JS-measured CoachPointer ring
// (`getBoundingClientRect()` on a delayed timer) that could render one frame
// stale and drift from the real button. The fix suppresses the JS ring
// entirely for coach ids that already have an exact CSS highlight, so the
// two rings can never both be on screen. These tests pin that suppression so
// it can't silently regress.
describe('TutorialCoach — SSL-280 duplicate coach ring', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    document.documentElement.removeAttribute('data-coach-target')
  })

  it('never renders the JS-measured ring for CSS-driven coach ids (bottom-tab-missions)', () => {
    const target = document.createElement('button')
    target.setAttribute('data-coach-id', 'bottom-tab-missions')
    document.body.appendChild(target)

    const step = baseStep({ screen: 'hub', coachId: 'bottom-tab-missions', dir: 'down' })
    act(() => {
      root = createRoot(container)
      root.render(
        <TutorialCoach stepIndex={0} steps={[step]} step={step} total={1} onManualNext={vi.fn()} onSkip={vi.fn()} />
      )
    })

    expect(document.querySelector('[data-testid="tutorial-coach-ring"]')).toBeNull()
    target.remove()
  })

  it('never renders the JS-measured ring for CSS-driven coach ids (build-structure-strip)', () => {
    const target = document.createElement('div')
    target.setAttribute('data-coach-id', 'build-structure-strip')
    document.body.appendChild(target)

    const step = baseStep({ screen: 'build', coachId: 'build-structure-strip', dir: 'down' })
    act(() => {
      root = createRoot(container)
      root.render(
        <TutorialCoach stepIndex={0} steps={[step]} step={step} total={1} onManualNext={vi.fn()} onSkip={vi.fn()} />
      )
    })

    expect(document.querySelector('[data-testid="tutorial-coach-ring"]')).toBeNull()
    target.remove()
  })

  it('still renders the JS-measured ring for ordinary (non-CSS-driven) coach ids', () => {
    const target = document.createElement('button')
    target.setAttribute('data-coach-id', 'launchpad-view-contracts')
    // jsdom never lays anything out, so getBoundingClientRect() is always
    // zero-sized by default; CoachPointer treats a zero-sized match as "not
    // really there" and bails, which would make this test pass for the
    // wrong reason. Give it a real rect.
    target.getBoundingClientRect = () => ({
      top: 100, left: 20, width: 80, height: 40, bottom: 140, right: 100, x: 20, y: 100, toJSON() { return this },
    })
    document.body.appendChild(target)

    const step = baseStep({ screen: 'launchpad', coachId: 'launchpad-view-contracts', dir: 'down' })
    act(() => {
      root = createRoot(container)
      root.render(
        <TutorialCoach stepIndex={0} steps={[step]} step={step} total={1} onManualNext={vi.fn()} onSkip={vi.fn()} />
      )
    })

    expect(document.querySelector('[data-testid="tutorial-coach-ring"]')).not.toBeNull()
    target.remove()
  })
})
