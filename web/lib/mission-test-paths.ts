type Checkpoint = [label: string, preset: string]
type Path = { region: string; mission: string; steps: Checkpoint[] }
const telescope: Path = { region: 'Earth region', mission: 'Earth-orbit telescope', steps: [['Launch review', 'telescope-fab'], ['Deploy', 'telescope-debrief'], ['Classify a candidate', 'ui-tess-discovery']] }
const leonids: Path = { region: 'Earth region', mission: 'Leonids on Eros', steps: [['Event board', 'ui-leonids-events'], ['Collect fragments', 'ui-leonids-shower-mining-fresh'], ['Debrief', 'ui-leonids-shower-debrief'], ['Check radio data', 'ui-radio-meteors-leo1']] }
const survey = (region: string, body: string, preset: string): Path => ({ region, mission: body + ' orbital survey', steps: [['Read mapped deposits', preset]] })
export const missionTestPaths: Record<string, Path[]> = {
  'Regular play': [
    { region: 'Earth region', mission: 'Eros mining contract', steps: [['Prepare', 'm1-fab'], ['Extract', 'm1-mining'], ['Debrief', 'm1-debrief']] },
    { region: 'Earth region', mission: 'Base construction', steps: [['Inspect base', 'storage-hub'], ['Place storage silo', 'storage-build']] },
    telescope, survey('Inner solar system', 'Mars', 'ui-probe-mars'),
    { region: 'Asteroid belt', mission: 'Bennu to Vesta delivery', steps: [['Prepare', 'transport-fab'], ['Load at Bennu', 'transport-mining'], ['Rover drop-off', 'transport-delivery'], ['Timed drop-off', 'transport-delivery-timed'], ['Debrief', 'transport-debrief']] },
    survey('Jovian', 'Europa', 'ui-probe-europa'),
  ],
  'Special event': [leonids, { region: 'Earth region', mission: 'Orionids on Eros', steps: [['Event board', 'ui-orionids-ready'], ['Collect fragments', 'ui-orionids-shower-mining-fresh'], ['Debrief', 'ui-orionids-shower-debrief']] }],
  'Research week': [
    { ...telescope, steps: [['Open weekly passport', 'ui-research-passport-empty'], ['Classify a candidate', 'ui-tess-discovery'], ['Inspect earned reward', 'ui-research-passport']] },
    { ...leonids, steps: [['Open Leonids week', 'ui-community-research-leonids'], ...leonids.steps, ['Inspect weekly history', 'ui-community-research-leonids-leo1']] },
  ],
}
