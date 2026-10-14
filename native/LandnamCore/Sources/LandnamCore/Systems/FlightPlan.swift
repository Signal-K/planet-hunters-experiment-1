import Foundation

/// Native port of the web training plan (`tutorial.ts` TRAINING_TRIES + `FlightPlanSystem`). Only real game
/// events complete a try: a mining debrief, a TESS classification, a Hangar module fit. Free Ops opens when
/// all three are done.
public enum FlightPlan {
    public static let tryLabels = ["mining": "Mining", "scan": "Scan", "part": "Part"]

    public struct PatchProgress: Equatable, Sendable {
        public let stitched: Int
        public let total: Int
    }

    /// A patch advances with the real screen flow and becomes complete only
    /// when its corresponding game event records the try.
    public static func patchProgress(_ player: Player, screen: Screen, tryId: String) -> PatchProgress {
        let total = tryId == "mining" ? 6 : 2
        if player.flightPlan.completed[tryId] == true { return PatchProgress(stitched: total, total: total) }
        guard player.flightPlan.currentTry == tryId else { return PatchProgress(stitched: 0, total: total) }
        let stitched: Int
        switch tryId {
        case "mining": stitched = max(0, miningPosition(screen).0 - 1)
        case "scan": stitched = screen == .galaxy ? 1 : 0
        case "part": stitched = screen == .hangar ? 1 : 0
        default: stitched = 0
        }
        return PatchProgress(stitched: min(stitched, total), total: total)
    }

    /// What the coach strip shows: kicker ("MINING OPS · STEP 1/6"), the objective and the radio line, plus an
    /// optional button that takes the player to the screen the step needs.
    public struct Coach: Equatable, Sendable {
        public let kicker: String
        public let objective: String
        public let radio: String
        public let go: Go?
        public struct Go: Equatable, Sendable {
            public let label: String
            public let screen: Screen
            /// When set, the button marks this coach step done instead of navigating (manual "Got it" notes).
            public var completesStep: Int? = nil
            public init(label: String, screen: Screen, completesStep: Int? = nil) { self.label = label; self.screen = screen; self.completesStep = completesStep }
        }
    }

    /// Part kinds fitted in the Hangar, in web CUSTOMIZER_BUILD_SEQUENCE order, with the starter module for each.
    public static let moduleKinds = ["engine", "booster", "cockpit", "payload"]
    public static let modules: [String: [(id: String, name: String)]] = [
        "engine": [("ion-thruster-t1", "Ion Thruster T1"), ("pulse-thruster-t1", "Pulse Thruster T1")],
        "booster": [("strap-booster-t1", "Strap Booster Pair"), ("vulcan-booster-t1", "Vulcan Booster Pair")],
        "cockpit": [("cockpit-command-t1", "Command Cockpit T1"), ("guidance-cockpit-t1", "Guidance Cockpit T1")],
        "payload": [("cargo-payload-t1", "Cargo Bay T1"), ("mining-payload-t1", "Mining Payload T1")],
    ]

    /// Screens that belong to a live cargo run; the scan and part lines never show here (web LOOP_SCREENS).
    private static let loopScreens: Set<Screen> = [.fab, .roverSurvey, .targets, .mining, .debrief, .transit, .landing, .delivery, .rocketBuy]

    /// The coach for the whole game state: the active try first, then the SSL-576 storage lesson.
    public static func coach(_ s: GameState, screen: Screen) -> Coach? {
        coach(s.player, screen: screen) ?? storageCoach(s, screen: screen)
    }

    /// SSL-576 storage lesson (web STORAGE_STEPS, ids 40-43): build the Surface Silo inside the base
    /// scene, store ore instead of selling it, then sell it later at the Exchange. It runs once the
    /// first missions are flown, sits beside Free Ops and never gates it.
    public static let storageStepIds = [40, 41, 42, 43]

    public static func storageLessonActive(_ s: GameState) -> Bool {
        s.player.missionsDone >= MissionGenerator.freeOpsStartMissionsDone && s.doneSteps["43"] != true
    }

    /// True while the lesson waits on the silo: the dock Build control opens the build surface.
    public static func awaitingStorageSilo(_ s: GameState) -> Bool {
        storageLessonActive(s) && !s.player.placed.contains("surface-silo")
    }

    public static func storageCoach(_ s: GameState, screen: Screen) -> Coach? {
        guard storageLessonActive(s) else { return nil }
        func c(_ step: Int, _ objective: String, _ radio: String, go: Coach.Go? = nil) -> Coach {
            Coach(kicker: "STORAGE OPS · STEP \(step)/4", objective: objective, radio: radio, go: go)
        }
        if !s.player.placed.contains("surface-silo") {
            switch screen {
            case .hub: return c(1, "Tap Build", "Your agency can mine and haul. Now give it somewhere to keep ore at home: a Surface Silo.")
            case .build: return c(2, "Pick Surface Silo, then tap Place silo", "Pick the Surface Silo. It is dug in under the base, so it needs no open plot.")
            default: return nil
            }
        }
        guard screen == .hub else { return nil }
        if s.doneSteps["42"] != true {
            return c(3, "Store ore in the silo instead of selling it", "Ore you bring home can now go into the silo instead of being sold straight away.",
                     go: .init(label: "GOT IT", screen: .hub, completesStep: 42))
        }
        return c(4, "Sell stored ore later at the Exchange", "When the price suits you, sell stored ore at the Exchange, the trading building on your base.",
                 go: .init(label: "GOT IT", screen: .hub, completesStep: 43))
    }

    public static func coach(_ p: Player, screen: Screen) -> Coach? {
        guard !p.freeOperations, !p.flightPlan.hidden, let current = p.flightPlan.currentTry,
              let index = FlightPlanProgress.tryIds.firstIndex(of: current) else { return nil }
        let position = current == "mining" ? miningPosition(screen) : (index + 1, FlightPlanProgress.tryIds.count)
        let kicker = "\((tryLabels[current] ?? current).uppercased()) OPS · STEP \(position.0)/\(position.1)"
        func c(_ objective: String, _ radio: String, go: Coach.Go? = nil) -> Coach { Coach(kicker: kicker, objective: objective, radio: radio, go: go) }
        switch current {
        case "mining":
            if !p.placed.contains("launchpad") {
                return c("Place the launchpad", "Your first structure. All missions launch from here.",
                         go: screen == .build ? nil : .init(label: "OPEN BUILD", screen: .build))
            }
            switch screen {
            case .missions: return c("Accept a mining contract", "A client order funds this first field run.")
            case .fab, .rocketBuy: return c("Prepare the vehicle and launch", "Check the target, cargo and vehicle, then launch.")
            case .targets: return c("Choose the highlighted target", "The target carries the mineral named by the order.")
            case .roverSurvey: return c("Scout one outcrop, then continue to the ship laser", "The rover logs the surface. The ship laser extracts the order.")
            case .mining: return c("Fire the laser on a seam", "Wait for a coloured seam to pass beneath the fixed laser line.")
            case .debrief: return c("Close the mission debrief", "The first try is recorded when the order is settled.")
            case .transit, .landing: return c("Fly the cargo home", "The order is only paid once the cargo reaches the debrief.")
            case .delivery: return c("Deliver the cargo", "The order is only paid once the cargo reaches the debrief.")
            case .launchpad: return c("Open client contracts", "The first try is a complete mine-and-return run.", go: .init(label: "CONTRACTS", screen: .missions))
            default: return c("Open client contracts", "The first try is a complete mine-and-return run.", go: .init(label: "LAUNCHPAD", screen: .launchpad))
            }
        case "scan":
            if loopScreens.contains(screen) { return coachForLoop(p, screen, kicker) }
            return screen == .galaxy
                ? c("Classify the transit candidate", "Review the light curve and submit a science verdict.")
                : c("Open the Galaxy map", "Transit candidates are classified from the Galaxy map.", go: .init(label: "GALAXY", screen: .galaxy))
        default:
            if loopScreens.contains(screen) { return coachForLoop(p, screen, kicker) }
            return screen == .hangar
                ? c("Fit a module in each ship stage", "Choose a module for engine, booster, cockpit and payload, then confirm.")
                : c("Open the Hangar from Base", "The Hangar is where ship modules are fitted.", go: .init(label: "HANGAR", screen: .hangar))
        }
    }

    /// Six milestones in the real mining loop: take a client order, prepare,
    /// choose a target, scout, fire the laser, then settle the cargo at home.
    /// The laser is therefore 5/6, not the superseded 2/6 concept placement.
    private static func miningPosition(_ screen: Screen) -> (Int, Int) {
        switch screen {
        case .intro, .build, .hub, .launchpad, .missions: return (1, 6)
        case .rocketBuy, .fab: return (2, 6)
        case .targets: return (3, 6)
        case .roverSurvey: return (4, 6)
        case .mining: return (5, 6)
        case .debrief, .transit, .landing, .delivery: return (6, 6)
        default: return (1, 6)
        }
    }

    private static func coachForLoop(_ p: Player, _ screen: Screen, _ kicker: String) -> Coach? {
        var mining = p
        mining.flightPlan = FlightPlanProgress()
        guard let base = coach(mining, screen: screen) else { return nil }
        return Coach(kicker: kicker, objective: base.objective, radio: base.radio, go: nil)
    }

    /// Fits one module per ship stage. Needs every stage filled and enough francs for the change; completes the part try.
    public static func applyFit(_ s: GameState, installed: [String: String]) -> GameState {
        guard moduleKinds.allSatisfy({ installed[$0] != nil }) else { return s }
        var n = s
        n.player.shipCustomizerParts = installed
        completeTry(&n, "part")
        return n
    }

    /// Marks a try done on a real event and re-derives Free Ops and the tutorial flag.
    public static func completeTry(_ s: inout GameState, _ id: String) {
        let wasFree = s.player.freeOperations
        if s.player.flightPlan.currentTry == id { s.player.flightPlan.complete(id) }
        s.player.freeOperations = Transitions.freeOperationsUnlocked(s.player)
        s.tutorial = !s.player.freeOperations
        if !wasFree && s.player.freeOperations { s.popup = "tutorial-complete" }
    }
}
