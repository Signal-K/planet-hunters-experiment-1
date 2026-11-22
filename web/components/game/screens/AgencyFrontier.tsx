'use client'

import type { Player } from '@/lib/game-types'
import { AGENCY_PROJECTS, agencyProgramme } from '@/lib/agency/programme'
import { communityWorlds } from '@/lib/agency/community'
import styles from './CommunityResearchScreen.module.css'

/** Reference on the research board. Instruments remain in the Data hub. */
export default function AgencyFrontier({ player, onData, onLaunch }: { player: Player; onData: () => void; onLaunch: () => void }) {
  const fleet = agencyProgramme(player)
  const community = player.agencyCommunity
  const worlds = communityWorlds(community)
  return <details className={styles.frontier} data-testid="agency-frontier">
    <summary>Agency programme · fleet and community findings</summary>
    <p>Launch a craft, work its data, then ask other agencies to check a finding. Verified planet candidates join the shared star map. The weekly passport counts research days across every project.</p>
    {fleet.filter(craft => craft.owned > 0).map(craft => <p key={craft.id}><b>{craft.name} ×{craft.owned}</b> · {craft.projects.map(project => project.name).join(', ')} · {craft.dataPerDay} items/day · {craft.contributed} project contributions</p>)}
    <p><button type="button" onClick={onLaunch}>Launch or service a craft</button> <button type="button" onClick={onData}>Work instrument data</button></p>
    {community ? <>
      <p>Last synced community programme. Counts below describe research; they do not add extra passport stamps.</p>
      {Object.entries(AGENCY_PROJECTS).map(([id, project]) => <p key={id}><b>{project.name}</b> · {community.projects[id as keyof typeof AGENCY_PROJECTS]?.contributions ?? 0} contributions · {community.projects[id as keyof typeof AGENCY_PROJECTS]?.donatedPerDay ?? 0} donated items/day</p>)}
      <p><b>Meteor echoes</b> · {community.projects['meteor-echoes']?.contributions ?? 0} recordings checked. ORI-1 and LEO-1 follow their shower dates.</p>
      <p>{worlds.length} community-verified worlds on the star map · {Object.keys(community.surveys).length} bodies with shared survey readings.</p>
      {worlds.map(world => <p key={world.id}>{world.name} · {community.surveys[world.id]?.length ?? 0}/24 sectors shared</p>)}
      <p>{community.siteUnlocks.length ? 'Completed Community Site: the community research telescope launch is open on Program.' : 'Finish all four Community Site components to open the community research telescope launch for every agency.'}</p>
    </> : <p>Community totals load when connected. Your fleet and saved data remain available offline.</p>}
  </details>
}
