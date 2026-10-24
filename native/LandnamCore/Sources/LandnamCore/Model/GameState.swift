import Foundation

/// Three-try onboarding progress (`mining`, `scan`, `part`). Wire format matches web.
public struct FlightPlanProgress: Codable, Equatable, Sendable {
    public static let tryIds = ["mining", "scan", "part"]
    public var completed: [String: Bool] = [:]
    public var hidden: Bool = false
    public var replayTry: String?
    public init() {}
    public var isComplete: Bool { Self.tryIds.allSatisfy { completed[$0] == true } }
    public var currentTry: String? { replayTry ?? Self.tryIds.first { completed[$0] != true } }
    public mutating func complete(_ id: String) { completed[id] = true; replayTry = nil; hidden = false }
}

public enum HaulDisposition: String, Codable, Sendable { case store, sell }

/// Player progress. Field names match the web save JSON (`game_states.state`) so a
/// save can move between clients. Fields not yet ported live in `extras` and are
/// written back untouched.
public struct Player: Codable, Equatable, Sendable {
    public var francs: Int = Economy.startingFrancs
    public var activeMission: ActiveMission?
    public var missionRunId: String?
    public var missionPhase: MissionPhase?
    public var miningCargoInProgress: Cargo?
    public var deliveryUnloadStartedAt: Double?
    public var landingStartedAt: Double?
    public var landingReturnStartedAt: Double?
    public var hasLanded: Bool?
    public var missionCount: Int = 1
    public var pendingLaunch: Bool = false
    public var stagedRockets: [StagedRocket] = []
    public var selectedStagedRocketId: String?
    public var pendingRocketId: String?
    public var pendingRocketLocation: StagedRocket.Location?
    public var pendingRocketSource: StagedRocket.Source?
    public var rocketPurchaseCounts: [String: Int] = [:]
    public var missionRocketSource: StagedRocket.Source?
    public var placed: [String] = []
    public var placementPlots: [String: Int] = [:]
    public var controlBuilt: Bool = false
    public var missionsDone: Int = 0
    public var freeOperations: Bool = false
    /// Earth base landscape chosen in onboarding or by the one-time move action.
    public var earthBiome: String = "mountains"
    public var earthBiomeMoveUsed: Bool = false
    public var skyEventLocation: PlayerLocation?
    public var transitSatelliteLaunchedAt: Double?
    public var deepSpaceTelescopeBuilt: Bool = false
    public var saturnImagerLaunchedAt: Double?
    /// Today's client contracts (web `dailyClientPool`), refreshed each calendar day.
    public var dailyClientPool: DailyClientPool?
    public var debriefPending: Bool = false
    /// Back on the Earth pad with cargo to settle on the delivery sheet (SSL-553).
    public var homeDeliveryPending: Bool = false
    public var cargoSettledOffworld: Bool = false
    public var freeHaulDisposition: HaulDisposition?
    public var returningToEarth: Bool = false
    public var shipDestroyed: Bool = false
    public var headingToDelivery: Bool = false
    public var stash: Cargo = [:]
    public var marketSupply: [String: Double] = [:]
    public var marketSupplyUpdatedAt: [String: Double] = [:]
    public var clientMissions: [String: Int] = [:]
    public var completedMissions: [CompletedMissionRecord] = []
    public var clientStreaks: [String: Int] = [:]
    public var clientCooldowns: [String: Double] = [:]
    public var researchAnnotations: Int = 0
    public var saturnClassifications: [String: SaturnClassification] = [:]
    public var badges: [String: PlayerBadge] = [:]
    public var tessClassifications: [String: TessClassification] = [:]
    public var asteroidClassifications: [String: AsteroidClassification] = [:]
    public var refineryBuilt: Bool = false
    public var refineryUnlocked: Bool = false
    public var refinedGoods: Cargo = [:]
    public var underConstruction: [String: Double] = [:]
    public var discoveredExoplanetTargets: [String: Target] = [:]
    public var satelliteTargetId: String?
    public var pendingRepick: Bool = false
    /// Last global planet-confirmation timestamp this player has seen (ISO string from the shared backend).
    public var lastSeenConfirmedAt: String?
    public var transitSatelliteLevel: Int?
    public var deepSpaceTelescopeLaunchedAt: Double?
    public var refineryQueue: [RefineryJob] = []
    public var refineryLastStartedAt: Double?
    public var launchpadUpgraded: Bool = false
    /// Levels 2-3 of upgradable buildings (`BuildingLevels`); absent means level 1. Same JSON key as web.
    public var buildingLevels: [String: Int] = [:]
    public var lastClient: String?
    public var arrivalAt: Double?
    public var transitStartedAt: Double?
    public var seenPlanets: [String] = []
    public var researchXP: Int = 0
    public var subsurfaceExcavated: Bool = false
    public var subsurfaceBuilt: [String] = []
    public var landingResearched: Bool = false
    /// Installed Laser Capacitor level (SSL-462), bought with hauled ore at Debrief.
    public var laserCapacitorLevel: Int = 0
    public var flightPlan: FlightPlanProgress = FlightPlanProgress()
    /// Marketplace sell alerts (web `priceAlerts`), set once the Exchange is built.
    public var priceAlerts: [PriceAlert] = []
    /// Hangar ship-customizer fit, room kind to part id (web `shipCustomizerParts`).
    public var shipCustomizerParts: [String: String] = [:]
    /// Orionid fragment ledger (web `orionidsFragments`). `caught` and `redeemed` only move up.
    public var orionidsFragments: OrionidsFragments = OrionidsFragments()
    /// Orionids event chain: 0 capture, 1 surface observation available, 2 complete.
    public var orionidsEventStage: Int = 0
    /// Ledger `caught` count at the moment the shower run was accepted (web `orionidsRunBaseline`, SSL-651).
    public var orionidsRunBaseline: Int?
    /// UTC day to research tasks done that day (web `researchStamps`, SSL-663).
    public var researchStamps: ResearchStamps = ResearchStamps()
    /// Unported save fields, preserved verbatim.
    public var extras: [String: JSONValue] = [:]

    public init() {}

    static let renamed: [String: String] = ["seenPlanets": "seen_planets"]

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        var consumed = Set<String>()
        func get<T: Decodable>(_ key: String, _ keep: inout T) {
            let wire = Player.renamed[key] ?? key
            consumed.insert(wire)
            if let value = try? c.decodeIfPresent(T.self, forKey: AnyKey(wire)) { keep = value }
        }
        func getOpt<T: Decodable>(_ key: String, _ keep: inout T?) {
            consumed.insert(key)
            if let value = try? c.decodeIfPresent(T.self, forKey: AnyKey(key)) { keep = value }
        }
        get("francs", &francs); getOpt("activeMission", &activeMission); getOpt("missionRunId", &missionRunId)
        getOpt("missionPhase", &missionPhase); getOpt("miningCargoInProgress", &miningCargoInProgress)
        getOpt("deliveryUnloadStartedAt", &deliveryUnloadStartedAt); getOpt("landingStartedAt", &landingStartedAt)
        getOpt("landingReturnStartedAt", &landingReturnStartedAt); getOpt("hasLanded", &hasLanded)
        get("missionCount", &missionCount); get("pendingLaunch", &pendingLaunch); get("stagedRockets", &stagedRockets)
        getOpt("selectedStagedRocketId", &selectedStagedRocketId); getOpt("pendingRocketId", &pendingRocketId)
        getOpt("pendingRocketLocation", &pendingRocketLocation); getOpt("pendingRocketSource", &pendingRocketSource)
        get("rocketPurchaseCounts", &rocketPurchaseCounts); getOpt("missionRocketSource", &missionRocketSource)
        get("placed", &placed); get("placementPlots", &placementPlots); get("controlBuilt", &controlBuilt)
        get("missionsDone", &missionsDone)
        get("freeOperations", &freeOperations); get("earthBiome", &earthBiome); get("earthBiomeMoveUsed", &earthBiomeMoveUsed); getOpt("skyEventLocation", &skyEventLocation); get("debriefPending", &debriefPending); get("homeDeliveryPending", &homeDeliveryPending)
        getOpt("transitSatelliteLaunchedAt", &transitSatelliteLaunchedAt); get("deepSpaceTelescopeBuilt", &deepSpaceTelescopeBuilt)
        getOpt("saturnImagerLaunchedAt", &saturnImagerLaunchedAt)
        getOpt("dailyClientPool", &dailyClientPool)
        get("cargoSettledOffworld", &cargoSettledOffworld); getOpt("freeHaulDisposition", &freeHaulDisposition)
        get("returningToEarth", &returningToEarth); get("shipDestroyed", &shipDestroyed)
        get("headingToDelivery", &headingToDelivery); get("stash", &stash); get("marketSupply", &marketSupply)
        get("marketSupplyUpdatedAt", &marketSupplyUpdatedAt); get("clientMissions", &clientMissions)
        get("completedMissions", &completedMissions); get("clientStreaks", &clientStreaks)
        get("clientCooldowns", &clientCooldowns); get("researchAnnotations", &researchAnnotations); get("saturnClassifications", &saturnClassifications); get("tessClassifications", &tessClassifications); get("badges", &badges); get("asteroidClassifications", &asteroidClassifications)
        get("refineryBuilt", &refineryBuilt); get("refineryUnlocked", &refineryUnlocked); get("refinedGoods", &refinedGoods)
        
        
        
        get("underConstruction", &underConstruction); get("discoveredExoplanetTargets", &discoveredExoplanetTargets)
        getOpt("satelliteTargetId", &satelliteTargetId); get("pendingRepick", &pendingRepick); getOpt("lastSeenConfirmedAt", &lastSeenConfirmedAt); getOpt("transitSatelliteLevel", &transitSatelliteLevel); getOpt("deepSpaceTelescopeLaunchedAt", &deepSpaceTelescopeLaunchedAt); 
        get("refineryQueue", &refineryQueue); getOpt("refineryLastStartedAt", &refineryLastStartedAt); 
        get("launchpadUpgraded", &launchpadUpgraded); get("buildingLevels", &buildingLevels); getOpt("lastClient", &lastClient); 
        getOpt("arrivalAt", &arrivalAt); getOpt("transitStartedAt", &transitStartedAt)
        get("seenPlanets", &seenPlanets); get("researchXP", &researchXP); get("subsurfaceExcavated", &subsurfaceExcavated)
        get("subsurfaceBuilt", &subsurfaceBuilt); get("landingResearched", &landingResearched)
        get("flightPlan", &flightPlan); get("priceAlerts", &priceAlerts); get("shipCustomizerParts", &shipCustomizerParts); get("orionidsFragments", &orionidsFragments); get("orionidsEventStage", &orionidsEventStage); get("researchStamps", &researchStamps); getOpt("orionidsRunBaseline", &orionidsRunBaseline); get("laserCapacitorLevel", &laserCapacitorLevel)
        buildingLevels = BuildingLevels.sanitize(buildingLevels, launchpadUpgraded: launchpadUpgraded)
        launchpadUpgraded = launchpadUpgraded || (buildingLevels["launchpad"] ?? 1) >= 2
        Self.mergeTelescope(&self)
        // SSL-569: heal an undercounted counter and a stale Free Ops flag on every load and cloud pull (web normalizeState).
        missionsDone = max(missionsDone, completedMissions.count)
        freeOperations = Transitions.freeOperationsUnlocked(self)
        for key in c.allKeys where !consumed.contains(key.stringValue) {
            extras[key.stringValue] = try? c.decode(JSONValue.self, forKey: key)
        }
    }

    /// Whether the single space telescope (the former transit and deep space telescopes) is launched.
    public var telescopeLaunched: Bool {
        (transitSatelliteLaunchedAt ?? 0) > 0 || (deepSpaceTelescopeLaunchedAt ?? 0) > 0 || deepSpaceTelescopeBuilt
    }

    /// Old saves tracked two telescopes; either marks the one telescope launched, with both feeds unlocked.
    static func mergeTelescope(_ p: inout Player) {
        guard p.telescopeLaunched else { return }
        let at = [p.transitSatelliteLaunchedAt, p.deepSpaceTelescopeLaunchedAt].compactMap { $0 }.filter { $0 > 0 }.min() ?? Date().timeIntervalSince1970 * 1000
        p.transitSatelliteLaunchedAt = p.transitSatelliteLaunchedAt ?? at
        p.deepSpaceTelescopeLaunchedAt = p.deepSpaceTelescopeLaunchedAt ?? at
        p.deepSpaceTelescopeBuilt = true
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        for (key, value) in extras { try c.encode(value, forKey: AnyKey(key)) }
        func put<T: Encodable>(_ key: String, _ value: T) throws { try c.encode(value, forKey: AnyKey(Player.renamed[key] ?? key)) }
        func putOpt<T: Encodable>(_ key: String, _ value: T?) throws { if let value { try c.encode(value, forKey: AnyKey(key)) } }
        try put("francs", francs); try putOpt("activeMission", activeMission); try putOpt("missionRunId", missionRunId)
        try putOpt("missionPhase", missionPhase); try putOpt("miningCargoInProgress", miningCargoInProgress)
        try putOpt("deliveryUnloadStartedAt", deliveryUnloadStartedAt); try putOpt("landingStartedAt", landingStartedAt)
        try putOpt("landingReturnStartedAt", landingReturnStartedAt); try putOpt("hasLanded", hasLanded)
        try put("missionCount", missionCount); try put("pendingLaunch", pendingLaunch); try put("stagedRockets", stagedRockets)
        try putOpt("selectedStagedRocketId", selectedStagedRocketId); try putOpt("pendingRocketId", pendingRocketId)
        try putOpt("pendingRocketLocation", pendingRocketLocation); try putOpt("pendingRocketSource", pendingRocketSource)
        try put("rocketPurchaseCounts", rocketPurchaseCounts); try putOpt("missionRocketSource", missionRocketSource)
        try put("placed", placed); try put("placementPlots", placementPlots); try put("controlBuilt", controlBuilt)
        try put("missionsDone", missionsDone); 
        try put("freeOperations", freeOperations); try put("earthBiome", earthBiome); try put("earthBiomeMoveUsed", earthBiomeMoveUsed); try putOpt("skyEventLocation", skyEventLocation); try put("debriefPending", debriefPending); try put("homeDeliveryPending", homeDeliveryPending)
        try putOpt("transitSatelliteLaunchedAt", transitSatelliteLaunchedAt); try put("deepSpaceTelescopeBuilt", deepSpaceTelescopeBuilt)
        try putOpt("saturnImagerLaunchedAt", saturnImagerLaunchedAt)
        try putOpt("dailyClientPool", dailyClientPool)
        try put("cargoSettledOffworld", cargoSettledOffworld); try putOpt("freeHaulDisposition", freeHaulDisposition)
        try put("returningToEarth", returningToEarth); try put("shipDestroyed", shipDestroyed)
        try put("headingToDelivery", headingToDelivery); try put("stash", stash); try put("marketSupply", marketSupply)
        try put("marketSupplyUpdatedAt", marketSupplyUpdatedAt); try put("clientMissions", clientMissions)
        try put("completedMissions", completedMissions); try put("clientStreaks", clientStreaks)
        try put("clientCooldowns", clientCooldowns); try put("researchAnnotations", researchAnnotations); try put("saturnClassifications", saturnClassifications); try put("tessClassifications", tessClassifications); try put("badges", badges); try put("asteroidClassifications", asteroidClassifications)
        try put("refineryBuilt", refineryBuilt); try put("refineryUnlocked", refineryUnlocked); try put("refinedGoods", refinedGoods)
        
        
        
        try put("underConstruction", underConstruction); try put("discoveredExoplanetTargets", discoveredExoplanetTargets)
        try putOpt("satelliteTargetId", satelliteTargetId); try put("pendingRepick", pendingRepick); try putOpt("lastSeenConfirmedAt", lastSeenConfirmedAt); try putOpt("transitSatelliteLevel", transitSatelliteLevel); try putOpt("deepSpaceTelescopeLaunchedAt", deepSpaceTelescopeLaunchedAt); 
        try put("refineryQueue", refineryQueue); try putOpt("refineryLastStartedAt", refineryLastStartedAt); 
        try put("launchpadUpgraded", launchpadUpgraded || BuildingLevels.level(self, "launchpad") >= 2); try put("buildingLevels", BuildingLevels.sanitize(buildingLevels, launchpadUpgraded: launchpadUpgraded)); try putOpt("lastClient", lastClient); 
        try putOpt("arrivalAt", arrivalAt); try putOpt("transitStartedAt", transitStartedAt)
        try put("seenPlanets", seenPlanets); try put("researchXP", researchXP); try put("subsurfaceExcavated", subsurfaceExcavated)
        try put("subsurfaceBuilt", subsurfaceBuilt); try put("landingResearched", landingResearched)
        try put("flightPlan", flightPlan); try put("priceAlerts", priceAlerts); try put("shipCustomizerParts", shipCustomizerParts); try put("orionidsFragments", orionidsFragments); try put("orionidsEventStage", orionidsEventStage); try put("researchStamps", researchStamps); try putOpt("orionidsRunBaseline", orionidsRunBaseline); try put("laserCapacitorLevel", laserCapacitorLevel)
    }
}

public struct GameState: Codable, Equatable, Sendable {
    public var screen: Screen = .intro
    public var player = Player()
    public var missionId: String?
    public var targetId: String?
    public var deliveryTargetId: String?
    public var rocket: RocketConfig = .starter
    public var lastCargo: Cargo?
    public var deliveredCargo: Cargo?
    public var tutorial: Bool = true
    public var doneSteps: [String: Bool] = [:]
    public var popup: String?
    public var menuOpen: Bool = false
    public var updatedAt: Double?
    public var extras: [String: JSONValue] = [:]

    public init() {}

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        var consumed = Set<String>()
        func get<T: Decodable>(_ key: String, _ keep: inout T) {
            consumed.insert(key)
            if let value = try? c.decodeIfPresent(T.self, forKey: AnyKey(key)) { keep = value }
        }
        func getOpt<T: Decodable>(_ key: String, _ keep: inout T?) {
            consumed.insert(key)
            if let value = try? c.decodeIfPresent(T.self, forKey: AnyKey(key)) { keep = value }
        }
        get("screen", &screen); get("player", &player); getOpt("missionId", &missionId); getOpt("targetId", &targetId)
        getOpt("deliveryTargetId", &deliveryTargetId); get("rocket", &rocket); getOpt("lastCargo", &lastCargo)
        getOpt("deliveredCargo", &deliveredCargo); get("tutorial", &tutorial); get("doneSteps", &doneSteps)
        getOpt("popup", &popup); get("menuOpen", &menuOpen); getOpt("updatedAt", &updatedAt)
        if player.freeOperations { tutorial = false } // SSL-569: a healed Free Ops save leaves the tutorial
        for key in c.allKeys where !consumed.contains(key.stringValue) {
            extras[key.stringValue] = try? c.decode(JSONValue.self, forKey: key)
        }
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        for (key, value) in extras { try c.encode(value, forKey: AnyKey(key)) }
        try c.encode(screen, forKey: AnyKey("screen")); try c.encode(player, forKey: AnyKey("player"))
        try c.encodeIfPresent(missionId, forKey: AnyKey("missionId")); try c.encodeIfPresent(targetId, forKey: AnyKey("targetId"))
        try c.encodeIfPresent(deliveryTargetId, forKey: AnyKey("deliveryTargetId")); try c.encode(rocket, forKey: AnyKey("rocket"))
        try c.encodeIfPresent(lastCargo, forKey: AnyKey("lastCargo")); try c.encodeIfPresent(deliveredCargo, forKey: AnyKey("deliveredCargo"))
        try c.encode(tutorial, forKey: AnyKey("tutorial")); try c.encode(doneSteps, forKey: AnyKey("doneSteps"))
        try c.encodeIfPresent(popup, forKey: AnyKey("popup")); try c.encode(menuOpen, forKey: AnyKey("menuOpen"))
        try c.encodeIfPresent(updatedAt, forKey: AnyKey("updatedAt"))
    }
}
