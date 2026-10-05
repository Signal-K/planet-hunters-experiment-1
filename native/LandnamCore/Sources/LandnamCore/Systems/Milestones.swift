import Foundation

/// Game Center ids. Must match App Store Connect (see SSL-488 handoff).
public enum GameCenterID {
    public static let leaderboardMissions = "com.atlasskyventures.sslandnam.lb.missions"
    public static let leaderboardFrancs = "com.atlasskyventures.sslandnam.lb.francs"
    public static let firstLaunch = "com.atlasskyventures.sslandnam.ach.first_launch"
    public static let tenMissions = "com.atlasskyventures.sslandnam.ach.ten_missions"
    public static let fiftyMissions = "com.atlasskyventures.sslandnam.ach.fifty_missions"
    public static let thousandFrancs = "com.atlasskyventures.sslandnam.ach.thousand_francs"
}

/// Pure progress rules: achievement percent complete (0...100) for a player.
public enum Milestones {
    public static func achievements(for p: Player) -> [String: Double] {
        func pct(_ v: Int, _ goal: Int) -> Double { min(100, Double(v) / Double(goal) * 100) }
        return [
            GameCenterID.firstLaunch: pct(p.missionsDone, 1),
            GameCenterID.tenMissions: pct(p.missionsDone, 10),
            GameCenterID.fiftyMissions: pct(p.missionsDone, 50),
            GameCenterID.thousandFrancs: pct(p.francs, 1000),
        ]
    }
    public static func scores(for p: Player) -> [String: Int] {
        [GameCenterID.leaderboardMissions: p.missionsDone, GameCenterID.leaderboardFrancs: p.francs]
    }
}
