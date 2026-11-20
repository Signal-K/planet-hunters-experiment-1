import Foundation

/// SSL-855: the same per-telescope levels and iron costs as web. The tray still owns an unplaced scope.
public enum GroundTelescopeUpgrades {
    public static func level(_ p: Player, _ id: String) -> Int {
        min(3, max(1, p.groundTelescopeLevels[id] ?? 1))
    }

    public static func sanitize(_ raw: [String: Int]) -> [String: Int] {
        raw.filter { ControlStation.isGroundTelescope($0.key) }.mapValues { min(3, max(1, $0)) }
    }

    public static func cost(_ p: Player, _ id: String) -> Int? {
        let current = level(p, id)
        return current < 3 ? current : nil
    }

    public static func reason(_ p: Player, _ id: String) -> String? {
        guard ControlStation.isGroundTelescope(id), p.placed.contains(id) else { return "Build this ground telescope first." }
        guard let cost = cost(p, id) else { return "Fully upgraded." }
        let iron = max(0, p.stash["iron", default: 0])
        return iron < cost ? "Needs \(cost - iron) more iron (\(iron)/\(cost) U stored)." : nil
    }

    public static func dailyCandidates(_ p: Player) -> Int {
        ControlStation.ownedGroundTelescopes(p).reduce(0) { $0 + (ControlStation.groundTelescopeObserving(p, $1) ? level(p, $1) : 0) }
    }

    public static func applyUpgrade(_ s: GameState, id: String) -> GameState {
        guard reason(s.player, id) == nil, let cost = cost(s.player, id) else { return s }
        var n = s
        n.player.stash["iron", default: 0] -= cost
        n.player.groundTelescopeLevels[id] = level(s.player, id) + 1
        return n
    }
}
