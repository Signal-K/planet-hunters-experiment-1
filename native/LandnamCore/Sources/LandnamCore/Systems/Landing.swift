import Foundation

/// Lander leg (web `lib/systems/LandingSystem.ts` and the `landing` case in `MissionOperationRoutes.tsx`).
/// With a lander fitted, the lander detaches and descends on arrival, and climbs back to re-dock after mining.
/// Both run on a persisted clock, so a resumed or synced save picks the sequence up where it was.
public enum Landing {
    public enum Mode: Equatable, Sendable { case descend, ascend }

    public static let descendMs = Economy.landingDescendMs
    public static let ascendMs = Economy.landingAscendMs

    /// The Lander Module ship room (web `shipCustomizerParts.lander`).
    public static func hasLander(_ p: Player) -> Bool { p.shipCustomizerParts["lander"] != nil }

    /// A redock clock means the lander is on its way back up; otherwise it is descending.
    public static func mode(_ p: Player) -> Mode { p.landingReturnStartedAt != nil ? .ascend : .descend }

    private static func clock(_ p: Player) -> (start: Double?, duration: Double) {
        mode(p) == .ascend ? (p.landingReturnStartedAt, ascendMs) : (p.landingStartedAt, descendMs)
    }

    /// 0...1. A sequence reopened with no clock (web: Belt Courier stalled at 0%) is already due.
    public static func progress(_ p: Player, now: Double) -> Double {
        let c = clock(p)
        guard let start = c.start, start.isFinite else { return 1 }
        return min(1, max(0, (now - start) / c.duration))
    }

    public static func remainingMs(_ p: Player, now: Double) -> Double {
        let c = clock(p)
        guard let start = c.start, start.isFinite else { return 0 }
        return max(0, c.duration - max(0, now - start))
    }

    /// Arrival with a lander: detach and descend before any surface work.
    static func startDescent(_ s: GameState, now: Double) -> GameState {
        var n = s
        n.player.missionPhase = .landing
        n.player.landingStartedAt = now
        n.player.landingReturnStartedAt = nil
        n.screen = .landing
        return n
    }

    /// Mining done with a lander: the cargo rides up with it, and the return leg starts after the redock.
    static func startAscent(_ s: GameState, cargo: Cargo, now: Double) -> GameState {
        var n = s
        n.player.missionPhase = .landing
        n.player.landingReturnStartedAt = now
        n.player.miningCargoInProgress = cargo
        n.screen = .landing
        return n
    }
}
