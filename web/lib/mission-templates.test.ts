import { describe, expect, it } from 'vitest'
import { MISSION_TEMPLATES, getMissionTemplate, templateForMission, templatesIn } from './mission-templates'
import authored from './data/authored-missions.json'
import { DEFAULT_MISSION_TEMPLATES as GENERATED } from './data/mission-generator'

describe('mission templates (SSL-870)', () => {
  it('follows the contract / program / feed / event split', () => {
    expect(templatesIn('contract').map(t => t.id).sort()).toEqual(['contract-construction', 'contract-delivery', 'contract-exploration', 'contract-mining'])
    expect(templatesIn('program').map(t => t.id).sort()).toEqual(['program-construction', 'program-free-mining', 'program-launch', 'program-survey', 'program-vehicle'])
    expect(templatesIn('feed').map(t => t.id)).toEqual(['feed-classification'])
    expect(getMissionTemplate('feed-classification')?.sources).toEqual(['program-launch'])
  })

  it('resolves events as forks with their parent beats', () => {
    const run = getMissionTemplate('event-meteor-run')!
    const parent = getMissionTemplate(run.fork_of!)!
    expect(run.beats.map(b => b.id)).toEqual(parent.beats.map(b => b.id))
    expect(run.beats.find(b => b.id === 'mine')?.controls).toContain('catch')
    expect(parent.controls).not.toContain('catch')
  })

  it('gives every authored mission its named template', () => {
    for (const m of authored.missions) expect(templateForMission(m)?.id, m.id).toBe(m.template)
  })

  it('resolves every generated contract tag, story, probe and shower mission', () => {
    for (const g of GENERATED) expect(templateForMission({ id: `generated-s1-${g.id}-1`, tag: g.tag }), g.tag).toBeDefined()
    const cases: [string, string, string][] = [
      ['generated-s1-starter-bulk-1', 'STARTER', 'contract-mining'],
      ['probe-contract-bennu-iron', 'MINING', 'contract-mining'],
      ['lnm_m3_relay_itokawa_eros', 'TRANSPORT', 'contract-delivery'],
      ['freeops-atlas-freeops-delivery-1', 'DELIVERY', 'contract-delivery'],
      ['generated-s3-construct-fuel-depot-1', 'CONSTRUCT', 'contract-construction'],
      ['freeops-atlas-freeops-mining-survey-1', 'SURVEY', 'contract-exploration'],
      ['story-transit-telescope-launch', 'STORY', 'program-launch'],
      ['probe-launch-vesta', 'STORY', 'program-launch'],
      ['exo-survey-kepler-22', 'SCIENCE', 'program-survey'],
      ['freeops-self-directed-mining', 'FREE OPS', 'program-free-mining'],
      ['self-directed-probe-vesta', 'FREE OPS', 'program-free-mining'],
      ['focus-resource-mining', 'RESOURCE', 'program-construction'],
      ['program-build-remote-silo', 'PROGRAM', 'program-construction'],
      ['freeops-atlas-freeops-rover-landing-1', 'ROVER', 'program-vehicle'],
      ['self-directed-orionids-night-run', 'FREE OPS', 'event-meteor-run'],
      ['self-directed-leonids-shower-run', 'FREE OPS', 'event-meteor-run'],
      ['self-directed-special-orionids-2026-gold', 'FREE OPS', 'event-meteor-run'],
    ]
    for (const [id, tag, want] of cases) expect(templateForMission({ id, tag })?.id, id).toBe(want)
  })

  it('never puts a feed on the board', () => {
    expect(templateForMission({ id: 'anything', tag: 'FEED' })).toBeUndefined()
    expect(MISSION_TEMPLATES.every(t => t.family === 'feed' || t.beats.length > 0)).toBe(true)
  })
})
