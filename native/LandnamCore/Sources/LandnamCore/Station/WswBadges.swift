import Foundation

/// World Space Week 2026 mission-type badges (mirrors web lib/data/wsw-badges.ts, SSL-475/491/497).
/// WSW publishes no global category list: the mission type to sky event mapping is OUR OWN.
/// Gold when the mission is completed during WSW, silver after, nothing before.
public enum WswMissionType: String, CaseIterable, Sendable {
    case onboardingRelay = "onboarding-relay", miningFreeOps = "mining-free-ops", roverSurfaceOps = "rover-surface-ops"
    case satelliteSurvey = "satellite-survey", citizenScience = "citizen-science", constructionLaunch = "construction-launch"
}

/// Colour tone, resolved to an existing `Theme` colour in the badge row.
public enum WswTone: String, Sendable { case blue, sky, green, crimson, dim, ink }

public struct WswBadge: Equatable, Sendable {
    public let type: WswMissionType
    public let badgeId: String, name: String
    /// Existing sky event this category belongs to (our own mapping).
    public let eventId: String
    public let tone: WswTone
}

public enum WswBadges {
    public static let eventId = "rocket-revolution-2026"

    public static let all: [WswBadge] = [
        WswBadge(type: .onboardingRelay, badgeId: "wsw-2026-onboarding-relay", name: "First Relay", eventId: "rocket-revolution-2026", tone: .blue),
        WswBadge(type: .miningFreeOps, badgeId: "wsw-2026-mining-free-ops", name: "Debris Miner", eventId: "draconids-2026", tone: .green),
        WswBadge(type: .roverSurfaceOps, badgeId: "wsw-2026-rover-surface-ops", name: "Surface Rover", eventId: "rocket-revolution-2026", tone: .dim),
        WswBadge(type: .satelliteSurvey, badgeId: "wsw-2026-satellite-survey", name: "Orbital Survey", eventId: "new-moon-hunt-2026-10", tone: .sky),
        WswBadge(type: .citizenScience, badgeId: "wsw-2026-citizen-science", name: "Sky Observer", eventId: "saturn-night-2026", tone: .crimson),
        WswBadge(type: .constructionLaunch, badgeId: "wsw-2026-construction-launch", name: "Launch Builder", eventId: "rocket-revolution-2026", tone: .ink),
    ]

    public static func badge(id: String) -> WswBadge? { all.first { $0.badgeId == id } }
    public static func badge(for type: WswMissionType) -> WswBadge { all.first { $0.type == type }! }

    /// Classifies a completed mission into one of the six WSW categories.
    public static func type(for mission: Mission?, freeOperations: Bool) -> WswMissionType {
        if mission?.construction != nil { return .constructionLaunch }
        switch mission?.payload?.type {
        case .rover?: return .roverSurfaceOps
        case .satellite?, .deepSpaceSurvey?: return .satelliteSurvey
        case nil: return freeOperations ? .miningFreeOps : .onboardingRelay
        }
    }

    /// Idempotent grant; never downgrades gold, upgrades silver when gold is earned later.
    public static func grant(_ badges: inout [String: PlayerBadge], _ type: WswMissionType, at ms: Double) {
        SkyEvents.grant(&badges, eventId: eventId, as: badge(for: type).badgeId, at: ms)
    }
}
