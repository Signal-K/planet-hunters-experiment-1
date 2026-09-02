import { CLIENT_AFFINITY_MISSION_THRESHOLD, SKILL_NODES, canUnlockSkillNode, STRUCTURES, structureUnlocked, type SkillNode, type StructureBlueprint } from '@/lib/data'
import type { Player } from '@/lib/game-types'

function structureOptions(player: Player) {
  return {
    refineryUnlocked: player.refineryUnlocked,
    academyResearched: player.academyResearched,
    placed: player.placed,
    freeOperations: player.freeOperations,
    transitSatelliteLevel: player.transitSatelliteLevel,
    clientMissions: player.clientMissions,
    deepSpaceTelescopeMissionCompletedAt: player.deepSpaceTelescopeMissionCompletedAt,
    scanStationMissionCompletedAt: player.scanStationMissionCompletedAt,
  }
}

/**
 * Structures the player has genuinely unlocked but has not placed yet.
 * Keeping this beside BuildPlaceScreen's gate prevents the Hub and Launchpad
 * from promising an action that the placement screen would reject.
 */
export function unplacedUnlockedStructures(player: Player): StructureBlueprint[] {
  const opts = structureOptions(player)
  return STRUCTURES.filter(structure =>
    structure.id !== 'launchpad'
    && structure.id !== 'garage'
    // The refinery has no Earth Base placement route. It is commissioned at
    // an approved off-world site by its own-program mission instead.
    && structure.id !== 'refinery'
    && !player.placed.includes(structure.id)
    && structureUnlocked(structure, opts),
  ).sort((a, b) => {
    if (a.id === 'astronaut-academy') return -1
    if (b.id === 'astronaut-academy') return 1
    return a.name.localeCompare(b.name)
  })
}

export function installableSkillNodes(player: Player): SkillNode[] {
  return SKILL_NODES.filter(node => canUnlockSkillNode({
    id: node.id,
    skillPoints: player.skillPoints ?? 0,
    unlockedSkillNodes: player.unlockedSkillNodes ?? [],
  }))
}

export function academyAffinityClientCount(player: Pick<Player, 'clientMissions'>): number {
  return Object.values(player.clientMissions).filter(jobs => 1 + Math.floor(Math.max(0, jobs) / CLIENT_AFFINITY_MISSION_THRESHOLD) >= 2).length
}
