import Foundation

/// Skill points and flight licence (port of `applyUnlockSkillNode` and `applyUpgradeLicenseGrade`).
public enum Progression {
    public static let gradeOrder: [LicenseGrade] = [.one, .two, .three]
    public static let xpGates: [LicenseGrade: Int] = [.one: 0, .two: 150, .three: 500]

    public static func nextGrade(_ g: LicenseGrade) -> LicenseGrade? {
        gradeOrder.firstIndex(of: g).flatMap { $0 + 1 < gradeOrder.count ? gradeOrder[$0 + 1] : nil }
    }

    public static func canUnlock(_ id: String, player p: Player) -> Bool {
        guard let node = Skills.nodes.first(where: { $0.id == id }) else { return false }
        return !Skills.has(p.unlockedSkillNodes, id) && p.skillPoints >= node.cost
    }

    public static func applyUnlock(_ s: GameState, nodeId: String) -> GameState {
        guard canUnlock(nodeId, player: s.player), let node = Skills.nodes.first(where: { $0.id == nodeId }) else { return s }
        var n = s
        n.player.skillPoints -= node.cost
        n.player.unlockedSkillNodes.append(node.id)
        if node.id == "ship-customizer-1" { n.popup = "ship-customizer" }
        return n
    }

    public static func canUpgrade(_ p: Player) -> Bool {
        nextGrade(p.licenseGrade).map { p.researchXP >= xpGates[$0, default: .max] } ?? false
    }

    public static func applyUpgrade(_ s: GameState, to grade: LicenseGrade) -> GameState {
        guard nextGrade(s.player.licenseGrade) == grade, s.player.researchXP >= xpGates[grade, default: .max] else { return s }
        var n = s; n.player.licenseGrade = grade; return n
    }

    public struct Firsts: Equatable, Sendable {
        public let mission, satellite, tess, blueprint, refinery, launchpad: Bool
    }
    public static func firsts(_ p: Player) -> Firsts {
        var blueprint = false
        if case .array(let a)? = p.extras["unlockedBlueprints"] { blueprint = !a.isEmpty }
        return Firsts(mission: p.missionsDone > 0, satellite: p.transitSatelliteLaunchedAt != nil, tess: !p.tessClassifications.isEmpty,
                      blueprint: blueprint, refinery: p.refineryBuilt, launchpad: p.launchpadUpgraded)
    }
}
