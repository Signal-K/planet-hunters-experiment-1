'use client'

import type { CompletedMissionRecord, Player } from '@/lib/game-types'
import type { Client, Target } from '@/lib/data'
import { clientAffinityLevel } from '@/lib/systems/AcademySystem'
import styles from './MissionHistoryScreen.module.css'

interface MissionHistoryScreenProps {
  records: CompletedMissionRecord[]
  clients?: Record<string, Client>
  targets?: Target[]
  player?: Player
  onBack: () => void
}

function formatCompletedAt(value: number): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'DATE UNKNOWN'
  return date.toISOString().slice(0, 10)
}

export default function MissionHistoryScreen({ records, clients, targets, player, onBack }: MissionHistoryScreenProps) {
  const clientCatalog = clients ?? {}
  const targetCatalog = targets ?? []
  const playerState: Pick<Player, 'clientMissions'> & Partial<Player> = player ?? { clientMissions: {} }
  const ordered = [...records].sort((a, b) => b.completedAt - a.completedAt)
  const workedClients = Object.entries(playerState.clientMissions)
    .filter(([, jobs]) => jobs > 0)
    .map(([id, jobs]) => ({ client: clientCatalog[id], jobs }))
    .filter(({ client }) => !!client)
    .sort((a, b) => b.jobs - a.jobs)
  const discovered = new Set(Object.keys(playerState.discoveredExoplanetTargets ?? {}))
  const clientClaims = new Map<string, string>()
  for (const [clientId, ids] of Object.entries(playerState.clientTerritories ?? {})) {
    for (const id of ids) clientClaims.set(id, clientId)
  }
  for (const record of records) {
    if (record.targetId && record.clientName && !clientClaims.has(record.targetId)) {
      const client = Object.values(clientCatalog).find(candidate => candidate.name === record.clientName)
      if (client) clientClaims.set(record.targetId, client.id)
    }
  }
  const exploredIds = new Set([
    ...(playerState.seen_planets ?? []),
    ...records.flatMap(record => record.targetId ? [record.targetId] : []),
    ...discovered,
  ])
  const exploredCount = targetCatalog.filter(target => exploredIds.has(target.id)).length

  return (
    <section className="screen-scroll theme-deep" data-testid="mission-history-screen">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><div className={styles.eyebrow}>EARTH BASE · MISSION LOG</div><h1>Mission Log</h1><p>Operations, client relationships, and the territory your program has put on the chart.</p></div>
          <button className={styles.backButton} onClick={onBack}>Back to base</button>
        </header>
        <nav className={styles.tabs} aria-label="Mission log sections"><a className={styles.tabActive} href="#operations">Operations <span>{ordered.length}</span></a><a className={styles.tab} href="#clients">Clients <span>{workedClients.length}</span></a><a className={styles.tab} href="#atlas">Exploration Atlas</a></nav>
        <section className={styles.summary} id="operations"><span className={styles.count}>{ordered.length}</span><span><strong>MISSIONS COMPLETED</strong><br />Your record stays available after the daily contract board refreshes.</span></section>
        {ordered.length === 0 ? <div className={styles.empty}>No completed missions yet. Choose a contract from the Mission Board to start your log.</div> : <div className={styles.list}>{ordered.map((record, index) => <article className={styles.record} key={record.runId ?? `${record.id}-${record.completedAt}`}><span className={styles.index}>{String(ordered.length - index).padStart(2, '0')}</span><div className={styles.recordCopy}><div className={styles.recordTitle}>{record.title}</div><div className={styles.recordMeta}>{record.kind === 'program' ? 'OWN PROGRAM' : record.clientName ?? 'CLIENT OPERATION'}{record.targetName ? ` · ${record.targetName}` : ''}</div></div><time className={styles.date} dateTime={new Date(record.completedAt).toISOString()}>{formatCompletedAt(record.completedAt)}</time></article>)}</div>}

        <section className={styles.section} id="clients">
          <div className={styles.sectionHeading}><div><div className={styles.eyebrow}>RELATIONSHIP REGISTER</div><h2>Clients</h2></div><span className={styles.sectionNote}>AFFINITY FROM COMPLETED WORK</span></div>
          {workedClients.length === 0 ? <div className={styles.empty}>Client dossiers will appear after the first contract is completed.</div> : <div className={styles.clientGrid}>{workedClients.map(({ client, jobs }) => { const level = clientAffinityLevel(jobs); const progress = Math.min(100, (jobs % 5) * 20 || (level > 1 ? 100 : 0)); return <article className={styles.clientCard} key={client.id}><div className={styles.clientTop}><span className={styles.clientMark} style={{ borderColor: client.color, color: client.color }}>{client.initial}</span><div><h3>{client.name}</h3><span className={styles.clientType}>{client.projectType}</span></div></div><div className={styles.clientStats}><span>AFFINITY L{level}</span><span>{jobs} {jobs === 1 ? 'MISSION' : 'MISSIONS'}</span></div><div className={styles.progress}><span style={{ width: `${progress}%`, background: client.color }} /></div><p>{client.affinityNotes ?? 'Complete more work to deepen the relationship.'}</p></article>})}</div>}
          <article className={styles.comingSoon}><span className={styles.comingDot} /><div><div className={styles.comingLabel}>COMING SOON · EXCLUSIVE CONTRACTS</div><h3>Negotiate priority access with clients</h3><p>At higher affinity, exclusive agreements will open dedicated routes, preferred rates, and territory negotiations.</p></div><span className={styles.lockLabel}>NOT AVAILABLE</span></article>
        </section>

        <section className={styles.section} id="atlas">
          <div className={styles.sectionHeading}><div><div className={styles.eyebrow}>PROGRAM TERRITORY</div><h2>Exploration Atlas</h2></div><span className={styles.sectionNote}>{exploredCount} / {targetCatalog.length} OBJECTS CHARTED</span></div>
          <div className={styles.atlas} role="img" aria-label="Solar system exploration and rights map"><div className={styles.sun}>SOL</div>{[1, 2, 3, 4, 5, 6].map(orbit => <span key={orbit} className={styles.orbit} style={{ width: `${orbit * 15 + 10}%`, height: `${orbit * 15 + 10}%` }} />)}{targetCatalog.map((target, index) => { const angle = ((index * 137) + 25) * Math.PI / 180; const radius = 16 + target.orbit * 7; const x = 50 + Math.cos(angle) * radius; const y = 50 + Math.sin(angle) * radius; const owner = discovered.has(target.id) ? null : clientClaims.get(target.id); const state = discovered.has(target.id) ? 'PROGRAM RIGHTS' : owner ? clientCatalog[owner]?.name ?? 'CLIENT ACCESS' : exploredIds.has(target.id) ? 'CHARTED' : 'UNCHARTED'; return <span key={target.id} className={`${styles.body} ${discovered.has(target.id) ? styles.bodyOwned : owner ? styles.bodyClient : ''}`} style={{ left: `${x}%`, top: `${y}%` }} title={`${target.name} · ${state}`} aria-label={`${target.name}, ${state}`} />})}</div>
          <div className={styles.legend}><span><i className={styles.legendOwned} />PROGRAM RIGHTS</span><span><i className={styles.legendClient} />CLIENT ACCESS</span><span><i className={styles.legendOpen} />CHARTED</span><span><i className={styles.legendUnknown} />UNCHARTED</span></div><p className={styles.atlasNote}>Discovery establishes program rights. Starter asteroid access follows the client that holds the operation; planets and further claims depend on the agreements attached to each site.</p>
        </section>
      </div>
    </section>
  )
}
