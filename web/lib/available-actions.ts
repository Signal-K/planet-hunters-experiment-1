import { CLIENT_AFFINITY_MISSION_THRESHOLD, SKILL_NODES, canUnlockSkillNode, STRUCTURES, structureUnlocked, type SkillNode, type StructureBlueprint } from '@/lib/data'
import type { Player } from '@/lib/game-types'

/**
 * Structures the player has genuinely unlocked but has not placed yet.
 * Keeping this beside BuildPlaceScreen's gate prevents the Hub and Launchpad
 * from promising an action that the placement screen would reject.
 */
export function unplacedUnlockedStructures(player: Player): StructureBlueprint[] {
  return STRUCTURES.filter(structure =>
    structure.id !== 'launchpad'
    && !player.placed.includes(structure.id)
    && structureUnlocked(structure, { placed: player.placed, freeOperations: player.freeOperations }),
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
