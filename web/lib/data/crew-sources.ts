import type { Client } from './types'
import type { CrewSource } from './crew'

/** Real agencies keep their real names; they are sources, not clients. */
export const CREW_AGENCIES: readonly CrewSource[] = [
  { id: 'nasa', name: 'NASA', kind: 'agency', description: 'United States civil spaceflight agency.' },
  { id: 'esa', name: 'ESA', kind: 'agency', description: 'European intergovernmental spaceflight agency.' },
  { id: 'jaxa', name: 'JAXA', kind: 'agency', description: 'Japan Aerospace Exploration Agency.' },
  { id: 'roscosmos', name: 'Roscosmos', kind: 'agency', description: 'Russian state space corporation.' },
  { id: 'isro', name: 'ISRO', kind: 'agency', description: 'Indian Space Research Organisation.' },
]

export function crewSourcesForClients(clients: Record<string, Client>): CrewSource[] {
  return [
    ...CREW_AGENCIES,
    ...Object.values(clients)
      .filter(client => client.suppliesCrew)
      .map(client => ({
        id: `client:${client.id}`,
        name: client.name,
        kind: 'client' as const,
        clientId: client.id,
        description: `${client.projectType}. Trusted partners may second trained crew.`,
      })),
  ]
}
