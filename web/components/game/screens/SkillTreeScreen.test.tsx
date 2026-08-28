import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SkillTreeScreen from './SkillTreeScreen'
import { SKILL_NODES } from '@/lib/data/skills'

const NOOP = () => undefined
const NOOP1 = () => undefined

const FIRSTS = {
  firstMissionDone: false,
  firstSatelliteLaunched: false,
  firstTessClassification: false,
  firstBlueprintUnlocked: false,
  refineryBuilt: false,
  launchpadUpgraded: false,
}

describe('SkillTreeScreen', () => {
  it('renders the license grade panel and every skill node with its description', () => {
    const markup = renderToStaticMarkup(
      <SkillTreeScreen
        skillPoints={3}
        unlockedSkillNodes={[]}
        onUnlock={NOOP1}
        onBack={NOOP}
        researchXP={50}
        licenseGrade="Grade I"
        onUpgradeLicenseGrade={NOOP1}
        firsts={FIRSTS}
      />,
    )
    expect(markup).toContain('data-testid="skill-tree-screen"')
    expect(markup).toContain('FLIGHT AUTHORITY')
    for (const node of SKILL_NODES) {
      expect(markup).toContain(node.name)
      expect(markup).toContain(node.description)
    }
  })

  it('marks unlocked nodes as unlocked and shows their SP cost otherwise', () => {
    const firstNode = SKILL_NODES[0]
    const markup = renderToStaticMarkup(
      <SkillTreeScreen
        skillPoints={0}
        unlockedSkillNodes={[firstNode.id]}
        onUnlock={NOOP1}
        onBack={NOOP}
        researchXP={0}
        licenseGrade="Grade I"
        onUpgradeLicenseGrade={NOOP1}
        firsts={FIRSTS}
      />,
    )
    expect(markup).toContain('Unlocked')
    expect(markup).toContain(`${SKILL_NODES[1].cost} SP`)
  })

  // SkillTreeCoach is gated by a client-only localStorage check (useEffect),
  // which never runs under renderToStaticMarkup — see SkillTreeCoach.tsx.
  // Its content/behavior is covered directly in SkillTreeCoach.test.tsx.
  it('does not render the coach under SSR (no localStorage effect)', () => {
    const markup = renderToStaticMarkup(
      <SkillTreeScreen
        skillPoints={0}
        unlockedSkillNodes={[]}
        onUnlock={NOOP1}
        onBack={NOOP}
        researchXP={0}
        licenseGrade="Grade I"
        onUpgradeLicenseGrade={NOOP1}
        firsts={FIRSTS}
      />,
    )
    expect(markup).not.toContain('data-testid="skill-tree-coach"')
  })
})
