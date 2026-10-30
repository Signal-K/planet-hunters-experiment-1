import Foundation

public struct PartCatalog: Sendable {
    public let chassis: [Part]
    public let propulsion: [Part]
    public let drill: [Part]

    public static let standard = PartCatalog(
        chassis: [
            Part(id: "hull-mk1", name: "Hull MK1", tier: 1, locked: false, mass: 2, cargo: 6),
            Part(id: "hull-mk2", name: "Prospector Unibody Frame", tier: 2, locked: false, mass: 3, cargo: 10, missionsRequired: 1),
            Part(id: "hull-cargo", name: "Cargo Bay T1", tier: 1, locked: false, mass: 2, cargo: 14, missionsRequired: 1),
            Part(id: "hull-mk3", name: "Hull MK3 Heavy Frame", tier: 3, locked: false, mass: 4, cargo: 18, missionsRequired: 6),
            Part(id: "hull-hauler", name: "Bulk Hauler Chassis", tier: 3, locked: false, mass: 3, cargo: 24, missionsRequired: 6),
        ],
        propulsion: [
            Part(id: "ion-a1", name: "Ion Drive A1", tier: 1, locked: false, maxOrbit: 5),
            Part(id: "fusion-b2", name: "Fusion Drive B2", tier: 2, locked: false, maxOrbit: 7, missionsRequired: 1),
            Part(id: "ion-a3", name: "Ion Drive A3", tier: 3, locked: false, maxOrbit: 9, missionsRequired: 6),
        ],
        drill: [
            Part(id: "hand-drill", name: "Hand Drill", tier: 1, locked: false, rate: 1),
            Part(id: "laser-t2", name: "Laser T2", tier: 2, locked: false, rate: 2, missionsRequired: 1),
            Part(id: "plasma-t3", name: "Plasma T3", tier: 3, locked: false, rate: 4, missionsRequired: 6),
            Part(id: "cargo-module-t1", name: "Cargo Module T1", tier: 1, locked: false, rate: 0, missionsRequired: 2),
        ]
    )

    func effectiveCargo(_ part: Part) -> Int { part.cargo ?? 0 }
    func effectiveMaxOrbit(_ part: Part) -> Int { part.maxOrbit ?? 0 }

    /// Picks the cheapest unlocked build that can fly the mission (port of `suggestBuild`).
    public func suggestBuild(mission: Mission?, target: Target?, deliveryTarget: Target? = nil,
                             missionsDone: Int, launchpadUpgraded: Bool = false, launchpadLevel: Int = 1) -> RocketConfig {
        let orbit = max(target?.orbit ?? 4, deliveryTarget?.orbit ?? 0)
        let drillTier = mission?.requires.drillTier ?? 1
        let cargoMin = mission?.requires.cargoMin ?? 6
        let done = max(missionsDone, launchpadUpgraded ? 1 : 0, BuildingLevels.launchpadMissionFloor(launchpadLevel))
        func available(_ p: Part) -> Bool { !p.locked && (p.missionsRequired ?? 0) <= done }
        func best(_ parts: [Part]) -> Part { parts.last(where: available) ?? parts[0] }
        let prop = propulsion.first { available($0) && effectiveMaxOrbit($0) >= orbit } ?? best(propulsion)
        let drl = drill.first { available($0) && $0.tier >= drillTier } ?? best(drill)
        let hull = chassis.first { available($0) && effectiveCargo($0) >= cargoMin } ?? best(chassis)
        return RocketConfig(chassis: hull.id, propulsion: prop.id, drill: drl.id)
    }

    public func validate(mission: Mission, target: Target, rocket: RocketConfig, loadoutBonus: (capacity: Int, range: Int) = (0, 0)) -> BuildCheck {
        let hull = chassis.first { $0.id == rocket.chassis } ?? chassis[0]
        let prop = propulsion.first { $0.id == rocket.propulsion } ?? propulsion[0]
        let drl = drill.first { $0.id == rocket.drill } ?? drill[0]
        var problems: [String] = []
        let reach = effectiveMaxOrbit(prop) + loadoutBonus.range
        if reach < target.orbit { problems.append("Propulsion can only reach Orbit \(reach), mission needs Orbit \(target.orbit)") }
        let capacity = effectiveCargo(hull) + loadoutBonus.capacity
        if capacity < mission.requires.cargoMin { problems.append("Ship cargo (\(capacity)U) below mission minimum (\(mission.requires.cargoMin)U)") }
        if drl.id != "cargo-module-t1" && drl.tier < mission.requires.drillTier {
            problems.append("Drill T\(drl.tier) below mission requirement T\(mission.requires.drillTier)")
        }
        return BuildCheck(ok: problems.isEmpty, problems: problems)
    }
}

public enum Flight {
    public static let baseLaserCharges = 5
    public static let travelTimeScale = Economy.travelTimeScale

    public static func travelDurationMs(orbit: Int, msPerOrbit: Double = 120_000) -> Double {
        Double(orbit) * msPerOrbit * travelTimeScale
    }
}
