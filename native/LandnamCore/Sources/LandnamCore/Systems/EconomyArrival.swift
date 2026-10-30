import Foundation

/// Reads the welcome-back market note the web client stores in the save
/// (`player.economyArrival`, web/lib/systems/EconomyArrival.ts): what moved on
/// the shared daily board since the player last saw it.
public enum EconomyArrival {
    public struct Move: Equatable, Sendable { public let name: String; public let changePct: Int }
    public struct LevelUp: Equatable, Sendable { public let name: String; public let level: Int }

    public static func moves(_ player: Player) -> [Move] {
        entries(player, "moves").compactMap { entry in
            guard case let .string(name)? = entry["materialName"], case let .number(pct)? = entry["changePct"] else { return nil }
            return Move(name: name, changePct: Int(pct))
        }
    }

    public static func levelUps(_ player: Player) -> [LevelUp] {
        entries(player, "levelUps").compactMap { entry in
            guard case let .string(name)? = entry["clientName"], case let .number(level)? = entry["levelAfter"] else { return nil }
            return LevelUp(name: name, level: Int(level))
        }
    }

    /// Same sentence as web `economyArrivalSummary`; nil when there is nothing to tell.
    public static func summary(_ player: Player) -> String? {
        let moves = moves(player).map { "\($0.name) \($0.changePct > 0 ? "+" : "")\($0.changePct)%" }
        let all = levelUps(player)
        let levels = all.prefix(2).map { "\($0.name) reached level \($0.level)" }
        let extra = all.count - levels.count
        let parts = [
            moves.isEmpty ? "" : moves.joined(separator: ", ") + ".",
            levels.isEmpty ? "" : levels.joined(separator: ", ") + (extra > 0 ? " and \(extra) more" : "") + ".",
        ].filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " ")
    }

    public static func applyDismiss(_ s: GameState) -> GameState {
        var n = s
        n.player.extras["economyArrival"] = nil
        return n
    }

    private static func entries(_ player: Player, _ key: String) -> [[String: JSONValue]] {
        guard case let .object(arrival)? = player.extras["economyArrival"], case let .array(list)? = arrival[key] else { return [] }
        return list.compactMap { if case let .object(entry) = $0 { return entry } else { return nil } }
    }
}
