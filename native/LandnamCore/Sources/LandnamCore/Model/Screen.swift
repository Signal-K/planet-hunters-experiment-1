import Foundation

/// Every top-level scene in the game. Raw values match the web `Screen` union so
/// saves written by the web client decode unchanged.
public enum Screen: String, Codable, CaseIterable, Sendable {
    case intro, build, hub
    case hubSubsurface = "hub-subsurface"
    case missions, galaxy, targets, fab, transit, landing, mining, delivery, debrief
    case refinery, market, hangar
    case rocketBuy = "rocket-buy"
    case skills
    case roverMining = "rover-mining"
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
        case .hub, .hubSubsurface, .launchpad, .transit, .landing, .mining, .roverMining,
             .delivery, .refinery, .academy, .hangar, .surfaceOps, .galaxy,
             .asteroidDiscovery, .saturnStormSearch, .instrumentHub:
            return true
        default:
            return false
        }
    }

    /// Screens that only make sense while a mission is selected.
    public var needsMissionContext: Bool {
        [.targets, .rocketBuy, .fab, .transit, .mining, .roverMining, .delivery, .debrief].contains(self)
    }

    /// Screens that additionally need a target.
    public var needsTargetContext: Bool {
        [.rocketBuy, .fab, .transit, .mining, .roverMining, .delivery, .debrief].contains(self)
    }
}
