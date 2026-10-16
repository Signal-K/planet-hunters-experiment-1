import Foundation

/// Every top-level scene in the game. Raw values match the web `Screen` union so
/// saves written by the web client decode unchanged.
public enum Screen: String, CaseIterable, Sendable {
    case intro, build, hub
    case hubSubsurface = "hub-subsurface"
    case missions, galaxy, targets, fab, transit, landing, mining, delivery, debrief
    case market, hangar
    case rocketBuy = "rocket-buy"
    case skills
    case roverSurvey = "rover-survey"
    case launchpad
    case surfaceOps = "surface-ops"
    case academy
    case asteroidDiscovery = "asteroid-discovery"
    case saturnStormSearch = "saturn-storm-search"
    case instrumentHub = "instrument-hub"
    case missionHistory = "mission-history"
    case narrativeLedger = "narrative-ledger"

    /// Locations get the full edge-to-edge viewport on macOS; the rest are menus
    /// that keep the boxed card treatment (mirrors `LOCATION_SCREENS` on web).
    public var isLocation: Bool {
        switch self {
        case .hub, .hubSubsurface, .launchpad, .transit, .landing, .mining, .roverSurvey,
             .delivery, .academy, .hangar, .surfaceOps, .galaxy, .market,
             .asteroidDiscovery, .saturnStormSearch, .instrumentHub:
            return true
        default:
            return false
        }
    }

    /// Screens that only make sense while a mission is selected.
    public var needsMissionContext: Bool {
        [.targets, .rocketBuy, .fab, .transit, .mining, .roverSurvey, .delivery, .debrief].contains(self)
    }

    /// Screens that additionally need a target.
    public var needsTargetContext: Bool {
        [.rocketBuy, .fab, .transit, .mining, .roverSurvey, .delivery, .debrief].contains(self)
    }
}

extension Screen: Codable {
    /// Web renamed the surface from `rover-mining` to `rover-survey`. Older saves still decode.
    public init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        if raw == "rover-mining" || raw == "rover-survey" {
            self = .roverSurvey
            return
        }
        guard let value = Screen(rawValue: raw) else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Unknown screen \(raw)"))
        }
        self = value
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}
