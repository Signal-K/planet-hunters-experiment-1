import Foundation

/// Rocket-builder loadout for the launchpad (web `web/lib/launchpad/rocketBuilder.ts`).
/// The mining laser is stored on its own key because the catalog lists lasers under the booster kind.
public enum RocketBuilder {
    public struct Part: Equatable, Sendable {
        public let id: String
        public let slot: String
        public let price: Int
        public let power: Int
        public let successBonus: Int
        public let unlockedAt: Int

        /// Display name from the id ("ion-thruster-t1" -> "Ion Thruster T1").
        public var name: String {
            id.split(separator: "-").map { $0.count <= 2 && $0.first == "t" ? $0.uppercased() : $0.prefix(1).uppercased() + $0.dropFirst() }.joined(separator: " ")
        }

        /// What the part adds, in the same integer steps as `stats` and the web `partEffectLabel`.
        public var effect: String {
            switch slot {
            case "engine": return "+\(power / 5) range"
            case "fuel-tank": return "+\(successBonus / 7) range"
            case "cargo-hold": return "+\(successBonus / 10) capacity"
            case "mining-laser": return "Laser \(power)"
            default: return "+\(power / 4) range"
            }
        }
    }

    public static let slots: [(id: String, label: String, module: String)] = [
        ("engine", "ENGINE", "engines"),
        ("fuel-tank", "FUEL TANK", "fuel-tank"),
        ("cargo-hold", "CARGO HOLD", "cargo-hold"),
        ("mining-laser", "MINING LASER", "mining-laser"),
        ("booster", "BOOSTER", "booster"),
    ]

    public static let modules: [(id: String, label: String)] = [
        ("nose", "NOSE"),
        ("mining-laser", "MINING LASER"),
        ("cargo-hold", "CARGO HOLD"),
        ("fuel-tank", "FUEL TANK"),
        ("booster", "BOOSTER"),
        ("engines", "ENGINES"),
    ]

    /// Prices and bonuses match `CUSTOMIZER_PARTS` for the five tray slots.
    public static let parts: [Part] = [
        Part(id: "ion-thruster-t1", slot: "engine", price: 2_200_000, power: 5, successBonus: 10, unlockedAt: 0),
        Part(id: "pulse-thruster-t1", slot: "engine", price: 2_600_000, power: 6, successBonus: 14, unlockedAt: 0),
        Part(id: "fusion-thruster-t2", slot: "engine", price: 9_800_000, power: 8, successBonus: 22, unlockedAt: 2),
        Part(id: "plasma-thruster-t3", slot: "engine", price: 12_400_000, power: 10, successBonus: 30, unlockedAt: 4),
        Part(id: "thruster-array-t4", slot: "engine", price: 15_200_000, power: 13, successBonus: 38, unlockedAt: 6),
        Part(id: "antimatter-thruster-t5", slot: "engine", price: 19_000_000, power: 17, successBonus: 48, unlockedAt: 8),
        Part(id: "kerosene-stage-t1", slot: "fuel-tank", price: 5_800_000, power: 4, successBonus: 8, unlockedAt: 2),
        Part(id: "lox-lh2-stage-t1", slot: "fuel-tank", price: 8_600_000, power: 6, successBonus: 14, unlockedAt: 2),
        Part(id: "cargo-payload-t1", slot: "cargo-hold", price: 1_500_000, power: 0, successBonus: 10, unlockedAt: 0),
        Part(id: "mining-payload-t1", slot: "cargo-hold", price: 2_000_000, power: 0, successBonus: 12, unlockedAt: 0),
        Part(id: "storage-silo-t2", slot: "cargo-hold", price: 4_600_000, power: 0, successBonus: 18, unlockedAt: 2),
        Part(id: "storage-silo-t3", slot: "cargo-hold", price: 7_400_000, power: 0, successBonus: 26, unlockedAt: 4),
        Part(id: "storage-silo-t4", slot: "cargo-hold", price: 10_800_000, power: 0, successBonus: 34, unlockedAt: 6),
        Part(id: "storage-silo-t5", slot: "cargo-hold", price: 14_600_000, power: 0, successBonus: 40, unlockedAt: 8),
        Part(id: "focused-laser-t2", slot: "mining-laser", price: 7_500_000, power: 6, successBonus: 16, unlockedAt: 2),
        Part(id: "ringed-laser-t3", slot: "mining-laser", price: 11_000_000, power: 9, successBonus: 24, unlockedAt: 4),
        Part(id: "twin-laser-t4", slot: "mining-laser", price: 15_500_000, power: 12, successBonus: 32, unlockedAt: 6),
        Part(id: "resonant-laser-t5", slot: "mining-laser", price: 21_000_000, power: 16, successBonus: 42, unlockedAt: 8),
        Part(id: "strap-booster-t1", slot: "booster", price: 1_300_000, power: 3, successBonus: 8, unlockedAt: 0),
        Part(id: "vulcan-booster-t1", slot: "booster", price: 1_800_000, power: 4, successBonus: 12, unlockedAt: 0),
    ]

    public static func options(_ slot: String, missionsDone: Int) -> [Part] {
        parts.filter { $0.slot == slot && $0.unlockedAt <= missionsDone }
    }

    /// Every part a slot can hold, unlocked or not.
    public static func allOptions(_ slot: String) -> [Part] { parts.filter { $0.slot == slot } }

    public static func partId(_ loadout: [String: String], slot: String) -> String? {
        switch slot {
        case "mining-laser":
            if let id = loadout["mining-laser"] { return id }
            if let id = loadout["booster"], id.contains("laser") { return id }
            return nil
        case "booster":
            guard let id = loadout["booster"], !id.contains("laser") else { return nil }
            return id
        case "engine": return loadout["engine"]
        case "fuel-tank": return loadout["fuel-stage"]
        case "cargo-hold": return loadout["payload"]
        default: return nil
        }
    }

    public static func nextId(_ slot: String, loadout: [String: String], missionsDone: Int) -> String? {
        let choices = options(slot, missionsDone: missionsDone)
        guard !choices.isEmpty else { return nil }
        let current = partId(loadout, slot: slot)
        let index = choices.firstIndex { $0.id == current } ?? -1
        return choices[(index + 1) % choices.count].id
    }

    /// Charges the price delta and writes `shipCustomizerParts`, the same field the web confirm saves.
    public static func install(_ s: GameState, slot: String) -> GameState {
        guard let partId = nextId(slot, loadout: s.player.shipCustomizerParts, missionsDone: s.player.missionsDone) else { return s }
        return install(s, slot: slot, partId: partId)
    }

    /// Fits a chosen part. Locked or unaffordable parts leave the state unchanged.
    public static func install(_ s: GameState, slot: String, partId: String) -> GameState {
        guard let part = parts.first(where: { $0.id == partId && $0.slot == slot }), part.unlockedAt <= s.player.missionsDone else { return s }
        let previous = self.partId(s.player.shipCustomizerParts, slot: slot)
        let previousPrice = parts.first { $0.id == previous }?.price ?? 0
        let delta = part.price - previousPrice
        guard s.player.francs >= delta else { return s }
        var n = s
        var loadout = s.player.shipCustomizerParts
        switch slot {
        case "mining-laser":
            loadout["mining-laser"] = part.id
            if let booster = loadout["booster"], booster.contains("laser") { loadout.removeValue(forKey: "booster") }
        case "booster":
            loadout["booster"] = part.id
        case "engine":
            loadout["engine"] = part.id
        case "fuel-tank":
            loadout["fuel-stage"] = part.id
        case "cargo-hold":
            loadout["payload"] = part.id
        default:
            return s
        }
        n.player.francs -= delta
        n.player.shipCustomizerParts = loadout
        return n
    }

    public static func stats(_ s: GameState, catalog: Catalog) -> (capacity: Int, range: Int, laser: Int) {
        let parts = catalog.parts
        let skills = s.player.unlockedSkillNodes
        let chassis = parts.chassis.first { $0.id == s.rocket.chassis } ?? parts.chassis[0]
        let propulsion = parts.propulsion.first { $0.id == s.rocket.propulsion } ?? parts.propulsion[0]
        let drill = parts.drill.first { $0.id == s.rocket.drill } ?? parts.drill[0]
        let loadout = s.player.shipCustomizerParts
        func bonus(_ slot: String, _ pick: (Part) -> Int) -> Int {
            guard let id = partId(loadout, slot: slot), let part = self.parts.first(where: { $0.id == id }) else { return 0 }
            return pick(part)
        }
        let laserPart = partId(loadout, slot: "mining-laser").flatMap { id in self.parts.first { $0.id == id } }
        let capacity = parts.effectiveCargo(chassis, skills: skills) + bonus("cargo-hold") { $0.successBonus } / 10
        let range = parts.effectiveMaxOrbit(propulsion, skills: skills)
            + bonus("engine") { $0.power } / 5
            + bonus("fuel-tank") { $0.successBonus } / 7
            + bonus("booster") { $0.power } / 4
        let laser = Skills.laserChargeCap(skills) + (laserPart?.power ?? drill.rate ?? 1)
        return (capacity, range, laser)
    }

    public static func fitted(_ loadout: [String: String]) -> [String: Bool] {
        [
            "nose": true,
            "engines": partId(loadout, slot: "engine") != nil,
            "fuel-tank": partId(loadout, slot: "fuel-tank") != nil,
            "cargo-hold": partId(loadout, slot: "cargo-hold") != nil,
            "mining-laser": partId(loadout, slot: "mining-laser") != nil,
            "booster": partId(loadout, slot: "booster") != nil,
        ]
    }
}
