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
            Part(id: "hull-mk3", name: "Hull MK3 Heavy Frame", tier: 3, locked: true, mass: 4, cargo: 18, missionsRequired: 2),
            Part(id: "hull-hauler", name: "Bulk Hauler Chassis", tier: 3, locked: true, mass: 3, cargo: 24, missionsRequired: 2),
        ],
        propulsion: [
            Part(id: "ion-a1", name: "Ion Drive A1", tier: 1, locked: false, maxOrbit: 5),
            Part(id: "fusion-b2", name: "Fusion Drive B2", tier: 2, locked: false, maxOrbit: 7, missionsRequired: 1),
            Part(id: "ion-a3", name: "Ion Drive A3", tier: 3, locked: true, maxOrbit: 9, missionsRequired: 2),
        ],
        drill: [
            Part(id: "hand-drill", name: "Hand Drill", tier: 1, locked: false, rate: 1),
            Part(id: "laser-t2", name: "Laser T2", tier: 2, locked: false, rate: 2, missionsRequired: 1),
            Part(id: "plasma-t3", name: "Plasma T3", tier: 3, locked: true, rate: 4, missionsRequired: 2),
            Part(id: "cargo-module-t1", name: "Cargo Module T1", tier: 1, locked: false, rate: 0, missionsRequired: 2),
        ]
    )

    public func effectiveCargo(_ part: Part, skills: [String]) -> Int {
        let cargo = part.cargo ?? 0
        return Skills.has(skills, "cargo-slot-1") ? Int(Double(cargo) * 1.2) : cargo
    }

    public func effectiveMaxOrbit(_ part: Part, skills: [String]) -> Int {
        (part.maxOrbit ?? 0) + (Skills.has(skills, "near-range-1") ? 1 : 0)
    }

    /// Picks the cheapest unlocked build that can fly the mission (port of `suggestBuild`).
    public func suggestBuild(mission: Mission?, target: Target?, deliveryTarget: Target? = nil,
                             missionsDone: Int, launchpadUpgraded: Bool = false, skills: [String] = []) -> RocketConfig {
        let orbit = max(target?.orbit ?? 4, deliveryTarget?.orbit ?? 0)
        let drillTier = mission?.requires.drillTier ?? 1
        let cargoMin = mission?.requires.cargoMin ?? 6
        let done = launchpadUpgraded ? max(missionsDone, 1) : missionsDone
        func available(_ p: Part) -> Bool { !p.locked && (p.missionsRequired ?? 0) <= done }
        func best(_ parts: [Part]) -> Part { parts.last(where: available) ?? parts[0] }
        let prop = propulsion.first { available($0) && effectiveMaxOrbit($0, skills: skills) >= orbit } ?? best(propulsion)
        let drl = drill.first { available($0) && $0.tier >= drillTier } ?? best(drill)
        let hull = chassis.first { available($0) && effectiveCargo($0, skills: skills) >= cargoMin } ?? best(chassis)
        return RocketConfig(chassis: hull.id, propulsion: prop.id, drill: drl.id)
    }

    public func validate(mission: Mission, target: Target, rocket: RocketConfig, skills: [String] = []) -> BuildCheck {
        let hull = chassis.first { $0.id == rocket.chassis } ?? chassis[0]
        let prop = propulsion.first { $0.id == rocket.propulsion } ?? propulsion[0]
        let drl = drill.first { $0.id == rocket.drill } ?? drill[0]
        var problems: [String] = []
        let reach = effectiveMaxOrbit(prop, skills: skills)
        if reach < target.orbit { problems.append("Propulsion can only reach Orbit \(reach), mission needs Orbit \(target.orbit)") }
        let capacity = effectiveCargo(hull, skills: skills)
        if capacity < mission.requires.cargoMin { problems.append("Chassis cargo (\(capacity)U) below mission minimum (\(mission.requires.cargoMin)U)") }
        if drl.id != "cargo-module-t1" && drl.tier < mission.requires.drillTier {
            problems.append("Drill T\(drl.tier) below mission requirement T\(mission.requires.drillTier)")
        }
        return BuildCheck(ok: problems.isEmpty, problems: problems)
    }
}

public enum Skills {
    public static let baseLaserCharges = 5
    public static let travelTimeScale = Economy.travelTimeScale

    public struct Node: Equatable, Sendable { public let id: String; public let name: String; public let branch: String; public let cost: Int; public let summary: String }
    public static let nodes: [Node] = [
        Node(id: "laser-charge-1", name: "Laser Charge I", branch: "mining", cost: 1, summary: "Mining laser starts each mission with +2 charges."),
        Node(id: "cargo-slot-1", name: "Cargo Slot I", branch: "cargo", cost: 1, summary: "Cargo capacity is increased by 20%."),
        Node(id: "near-range-1", name: "Near-Range I", branch: "range", cost: 2, summary: "L1 travel time is reduced by 15% and near-range reach improves."),
        Node(id: "ship-customizer-1", name: "Ship Customizer", branch: "engineering", cost: 1, summary: "Unlocks the hangar interior view with slotted ship rooms."),
    ]
    public static func has(_ unlocked: [String]?, _ id: String) -> Bool { unlocked?.contains(id) ?? false }
    public static func laserChargeCap(_ unlocked: [String]?) -> Int { baseLaserCharges + (has(unlocked, "laser-charge-1") ? 2 : 0) }

    public static func travelDurationMs(orbit: Int, skills: [String]?, msPerOrbit: Double = 120_000) -> Double {
        let base = Double(orbit) * msPerOrbit * travelTimeScale
        return has(skills, "near-range-1") ? (base * 0.85).rounded() : base
    }
}
