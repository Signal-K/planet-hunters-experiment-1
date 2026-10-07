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
public enum LicenseGrade: String, Codable, Sendable { case one = "Grade I", two = "Grade II", three = "Grade III" }

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
    public var skillPoints: Int = 0
    public var unlockedSkillNodes: [String] = []
    public var freeOperations: Bool = false
    public var transitSatelliteLaunchedAt: Double?
    public var deepSpaceTelescopeBuilt: Bool = false
    public var saturnImagerLaunchedAt: Double?
    public var debriefPending: Bool = false
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
    public var crew: [CrewMember] = []
    public var formerCrew: [CrewRehireOffer] = []
    public var crewTraining: [CrewTrainingSession] = []
    public var academyResearched: Bool = false
    public var academyFunded: Bool = false
    public var academyXP: Int = 0
    public var crewHiresLifetime: Int = 0
    public var crewHiresThisWeek: Int = 0
    public var crewHireWeek: String?
    public var trainingDate: String?
    public var trainingSessionsUsedToday: Int = 0
    public var crewUpkeepSettledDate: String?
    public var crewModuleResearched: Bool = false
    public var sharedChartsByClient: [String: Int] = [:]
    public var underConstruction: [String: Double] = [:]
    public var surfaceOps: SurfaceOpsState = SurfaceOpsState()
    public var refineryQueue: [RefineryJob] = []
    public var refineryLastStartedAt: Double?
    public var structureCrewAssignments: [String: String] = [:]
    public var launchpadUpgraded: Bool = false
    public var lastClient: String?
    public var loanDebt: Int = 0
    public var loanOffered: Bool = false
    public var arrivalAt: Double?
    public var transitStartedAt: Double?
    public var seenPlanets: [String] = []
    public var researchXP: Int = 0
    public var subsurfaceExcavated: Bool = false
    public var subsurfaceBuilt: [String] = []
    public var landingResearched: Bool = false
    public var licenseGrade: LicenseGrade = .one
    /// Installed Laser Capacitor level (SSL-462), bought with hauled ore at Debrief.
    public var laserCapacitorLevel: Int = 0
    public var flightPlan: FlightPlanProgress = FlightPlanProgress()
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
        get("missionsDone", &missionsDone); get("skillPoints", &skillPoints); get("unlockedSkillNodes", &unlockedSkillNodes)
        get("freeOperations", &freeOperations); get("debriefPending", &debriefPending)
        getOpt("transitSatelliteLaunchedAt", &transitSatelliteLaunchedAt); get("deepSpaceTelescopeBuilt", &deepSpaceTelescopeBuilt)
        getOpt("saturnImagerLaunchedAt", &saturnImagerLaunchedAt)
        get("cargoSettledOffworld", &cargoSettledOffworld); getOpt("freeHaulDisposition", &freeHaulDisposition)
        get("returningToEarth", &returningToEarth); get("shipDestroyed", &shipDestroyed)
        get("headingToDelivery", &headingToDelivery); get("stash", &stash); get("marketSupply", &marketSupply)
        get("marketSupplyUpdatedAt", &marketSupplyUpdatedAt); get("clientMissions", &clientMissions)
        get("completedMissions", &completedMissions); get("clientStreaks", &clientStreaks)
        get("clientCooldowns", &clientCooldowns); get("researchAnnotations", &researchAnnotations); get("saturnClassifications", &saturnClassifications); get("tessClassifications", &tessClassifications); get("badges", &badges); get("asteroidClassifications", &asteroidClassifications)
        get("refineryBuilt", &refineryBuilt); get("refineryUnlocked", &refineryUnlocked); get("refinedGoods", &refinedGoods)
        get("crew", &crew); get("formerCrew", &formerCrew); get("crewTraining", &crewTraining)
        get("academyResearched", &academyResearched); get("academyFunded", &academyFunded); get("academyXP", &academyXP)
        get("crewHiresLifetime", &crewHiresLifetime); get("crewHiresThisWeek", &crewHiresThisWeek); getOpt("crewHireWeek", &crewHireWeek)
        getOpt("trainingDate", &trainingDate); get("trainingSessionsUsedToday", &trainingSessionsUsedToday)
        getOpt("crewUpkeepSettledDate", &crewUpkeepSettledDate); get("crewModuleResearched", &crewModuleResearched)
        get("sharedChartsByClient", &sharedChartsByClient)
        get("underConstruction", &underConstruction); get("surfaceOps", &surfaceOps)
        get("refineryQueue", &refineryQueue); getOpt("refineryLastStartedAt", &refineryLastStartedAt); get("structureCrewAssignments", &structureCrewAssignments)
        get("launchpadUpgraded", &launchpadUpgraded); getOpt("lastClient", &lastClient); get("loanDebt", &loanDebt)
        get("loanOffered", &loanOffered); getOpt("arrivalAt", &arrivalAt); getOpt("transitStartedAt", &transitStartedAt)
        get("seenPlanets", &seenPlanets); get("researchXP", &researchXP); get("subsurfaceExcavated", &subsurfaceExcavated)
        get("subsurfaceBuilt", &subsurfaceBuilt); get("landingResearched", &landingResearched)
        get("licenseGrade", &licenseGrade); get("flightPlan", &flightPlan); get("laserCapacitorLevel", &laserCapacitorLevel)
        for key in c.allKeys where !consumed.contains(key.stringValue) {
            extras[key.stringValue] = try? c.decode(JSONValue.self, forKey: key)
        }
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
        try put("missionsDone", missionsDone); try put("skillPoints", skillPoints); try put("unlockedSkillNodes", unlockedSkillNodes)
        try put("freeOperations", freeOperations); try put("debriefPending", debriefPending)
        try putOpt("transitSatelliteLaunchedAt", transitSatelliteLaunchedAt); try put("deepSpaceTelescopeBuilt", deepSpaceTelescopeBuilt)
        try putOpt("saturnImagerLaunchedAt", saturnImagerLaunchedAt)
        try put("cargoSettledOffworld", cargoSettledOffworld); try putOpt("freeHaulDisposition", freeHaulDisposition)
        try put("returningToEarth", returningToEarth); try put("shipDestroyed", shipDestroyed)
        try put("headingToDelivery", headingToDelivery); try put("stash", stash); try put("marketSupply", marketSupply)
        try put("marketSupplyUpdatedAt", marketSupplyUpdatedAt); try put("clientMissions", clientMissions)
        try put("completedMissions", completedMissions); try put("clientStreaks", clientStreaks)
        try put("clientCooldowns", clientCooldowns); try put("researchAnnotations", researchAnnotations); try put("saturnClassifications", saturnClassifications); try put("tessClassifications", tessClassifications); try put("badges", badges); try put("asteroidClassifications", asteroidClassifications)
        try put("refineryBuilt", refineryBuilt); try put("refineryUnlocked", refineryUnlocked); try put("refinedGoods", refinedGoods)
        try put("crew", crew); try put("formerCrew", formerCrew); try put("crewTraining", crewTraining)
        try put("academyResearched", academyResearched); try put("academyFunded", academyFunded); try put("academyXP", academyXP)
        try put("crewHiresLifetime", crewHiresLifetime); try put("crewHiresThisWeek", crewHiresThisWeek); try putOpt("crewHireWeek", crewHireWeek)
        try putOpt("trainingDate", trainingDate); try put("trainingSessionsUsedToday", trainingSessionsUsedToday)
        try putOpt("crewUpkeepSettledDate", crewUpkeepSettledDate); try put("crewModuleResearched", crewModuleResearched)
        try put("sharedChartsByClient", sharedChartsByClient)
        try put("underConstruction", underConstruction); try put("surfaceOps", surfaceOps)
        try put("refineryQueue", refineryQueue); try putOpt("refineryLastStartedAt", refineryLastStartedAt); try put("structureCrewAssignments", structureCrewAssignments)
        try put("launchpadUpgraded", launchpadUpgraded); try putOpt("lastClient", lastClient); try put("loanDebt", loanDebt)
        try put("loanOffered", loanOffered); try putOpt("arrivalAt", arrivalAt); try putOpt("transitStartedAt", transitStartedAt)
        try put("seenPlanets", seenPlanets); try put("researchXP", researchXP); try put("subsurfaceExcavated", subsurfaceExcavated)
        try put("subsurfaceBuilt", subsurfaceBuilt); try put("landingResearched", landingResearched)
        try put("licenseGrade", licenseGrade); try put("flightPlan", flightPlan); try put("laserCapacitorLevel", laserCapacitorLevel)
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
