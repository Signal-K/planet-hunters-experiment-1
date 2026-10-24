import Foundation

/// Hangar ship customizer (web `lib/data/shipCustomizer.ts`): the rooms a hull has at each stage, the parts for each room
/// and their prices. `web/lib/data/shipCustomizerParity.test.ts` fails when this table drifts from `CUSTOMIZER_PARTS`.
public enum ShipCustomizer {
    public struct Part: Equatable, Sendable {
        public let id: String
        public let kind: String
        public let name: String
        public let price: Int
        public let unlockedAtMissions: Int
    }

    /// Room labels the build steps show (web `ShipInteriorPreview` `STAGE_LABEL`).
    public static let roomNames: [String: String] = [
        "engine": "Engine", "booster": "Booster", "cockpit": "Command", "payload": "Payload",
        "fuel-stage": "Propellant", "fairing": "Fairing", "docking-port": "Docking", "heat-shield": "Shield",
        "lander": "Lander",
    ]

    /// Web `BUILD_SEQUENCES`: the hull grows rooms at 2, 4 and 6 missions done.
    static let sequences: [Int: [String]] = [
        1: ["engine", "booster", "cockpit", "payload"],
        2: ["fuel-stage", "engine", "booster", "cockpit", "fairing", "payload"],
        3: ["fuel-stage", "engine", "booster", "cockpit", "fairing", "payload", "docking-port"],
        4: ["fuel-stage", "engine", "booster", "cockpit", "fairing", "payload", "docking-port", "heat-shield"],
    ]

    /// Web `getBuildSequence`: the researched lander room joins the two larger hulls only.
    public static func sequence(missionsDone: Int, landingResearched: Bool) -> [String] {
        let bonus = landingResearched ? ["lander"] : []
        if missionsDone >= 6 { return sequences[4]! + bonus }
        if missionsDone >= 4 { return sequences[3]! + bonus }
        if missionsDone >= 2 { return sequences[2]! }
        return sequences[1]!
    }

    public static func sequence(for p: Player) -> [String] {
        sequence(missionsDone: p.missionsDone, landingResearched: p.landingResearched)
    }

    public static func part(_ id: String?) -> Part? { id.flatMap { id in parts.first { $0.id == id } } }

    /// Web `partsForKind`: the room's parts unlocked at this many missions done.
    public static func parts(for kind: String, missionsDone: Int) -> [Part] {
        parts.filter { $0.kind == kind && $0.unlockedAtMissions <= missionsDone }
    }

    /// Web `applyConfirmShipCustomizerBuild`: each changed room costs the new part's price less the old one's.
    public static func netCost(_ installed: [String: String], previous: [String: String]) -> Int {
        installed.reduce(0) { sum, room in
            room.value == previous[room.key] ? sum : sum + (part(room.value)?.price ?? 0) - (part(previous[room.key])?.price ?? 0)
        }
    }

    public static let parts: [Part] = [
        Part(id: "ion-thruster-t1", kind: "engine", name: "Ion Thruster T1", price: 2_200_000, unlockedAtMissions: 0),
        Part(id: "pulse-thruster-t1", kind: "engine", name: "Pulse Thruster T1", price: 2_600_000, unlockedAtMissions: 0),
        Part(id: "fusion-thruster-t2", kind: "engine", name: "Fusion Thruster T2", price: 10_500_000, unlockedAtMissions: 2),
        Part(id: "plasma-thruster-t3", kind: "engine", name: "Plasma Thruster T3", price: 14_500_000, unlockedAtMissions: 4),
        Part(id: "array-thruster-t4", kind: "engine", name: "Array Thruster T4", price: 19_500_000, unlockedAtMissions: 6),
        Part(id: "antimatter-thruster-t5", kind: "engine", name: "Antimatter Thruster T5", price: 26_000_000, unlockedAtMissions: 8),
        Part(id: "strap-booster-t1", kind: "booster", name: "Strap Booster Pair", price: 1_300_000, unlockedAtMissions: 0),
        Part(id: "vulcan-booster-t1", kind: "booster", name: "Vulcan Booster Pair", price: 1_800_000, unlockedAtMissions: 0),
        Part(id: "focused-laser-t2", kind: "booster", name: "Focused Mining Laser T2", price: 7_500_000, unlockedAtMissions: 2),
        Part(id: "ringed-laser-t3", kind: "booster", name: "Ringed Mining Laser T3", price: 10_500_000, unlockedAtMissions: 4),
        Part(id: "twin-emitter-laser-t4", kind: "booster", name: "Twin-Emitter Mining Laser T4", price: 14_000_000, unlockedAtMissions: 6),
        Part(id: "resonant-laser-t5", kind: "booster", name: "Resonant Mining Laser T5", price: 19_000_000, unlockedAtMissions: 8),
        Part(id: "cockpit-command-t1", kind: "cockpit", name: "Command Cockpit T1", price: 1_000_000, unlockedAtMissions: 0),
        Part(id: "guidance-cockpit-t1", kind: "cockpit", name: "Guidance Cockpit T1", price: 1_600_000, unlockedAtMissions: 0),
        Part(id: "cargo-payload-t1", kind: "payload", name: "Cargo Bay T1", price: 1_500_000, unlockedAtMissions: 0),
        Part(id: "mining-payload-t1", kind: "payload", name: "Mining Payload T1", price: 2_000_000, unlockedAtMissions: 0),
        Part(id: "storage-silo-t2", kind: "payload", name: "Storage Silo Bank T2", price: 8_000_000, unlockedAtMissions: 2),
        Part(id: "storage-silo-t3", kind: "payload", name: "Storage Silo Bank T3", price: 11_000_000, unlockedAtMissions: 4),
        Part(id: "storage-silo-t4", kind: "payload", name: "Storage Silo Bank T4", price: 15_000_000, unlockedAtMissions: 6),
        Part(id: "storage-silo-t5", kind: "payload", name: "Storage Silo Bank T5", price: 20_000_000, unlockedAtMissions: 8),
        Part(id: "kerosene-stage-t1", kind: "fuel-stage", name: "Kerosene Stage T1", price: 2_900_000, unlockedAtMissions: 2),
        Part(id: "lox-lh2-stage-t1", kind: "fuel-stage", name: "LOX/LH₂ Stage T1", price: 4_400_000, unlockedAtMissions: 2),
        Part(id: "standard-fairing-t1", kind: "fairing", name: "Standard Fairing T1", price: 1_800_000, unlockedAtMissions: 2),
        Part(id: "heavy-fairing-t1", kind: "fairing", name: "Heavy Fairing T1", price: 2_900_000, unlockedAtMissions: 2),
        Part(id: "standard-port-t1", kind: "docking-port", name: "Standard Port T1", price: 2_600_000, unlockedAtMissions: 4),
        Part(id: "magnetic-port-t1", kind: "docking-port", name: "Magnetic Port T1", price: 3_900_000, unlockedAtMissions: 4),
        Part(id: "ablative-shield-t1", kind: "heat-shield", name: "Ablative Shield T1", price: 3_400_000, unlockedAtMissions: 6),
        Part(id: "ceramic-shield-t1", kind: "heat-shield", name: "Ceramic Shield T1", price: 5_100_000, unlockedAtMissions: 6),
        Part(id: "lander-module-t1", kind: "lander", name: "Lander Module T1", price: 5_500_000, unlockedAtMissions: 4),
    ]
}
