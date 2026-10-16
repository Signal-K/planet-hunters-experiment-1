import Foundation

/// The player's daily client pool: new contracts each calendar day, more clients as missions are flown.
/// Port of `daily-client-missions.ts`. Ids, picks and payouts must match web for the same date and progress.
public struct DailyClientPool: Codable, Equatable, Sendable {
    public var date: String
    public var missions: [Mission]
    public var acceptedId: String?
    public var completedIds: [String]

    public init(date: String, missions: [Mission], acceptedId: String? = nil, completedIds: [String] = []) {
        self.date = date; self.missions = missions; self.acceptedId = acceptedId; self.completedIds = completedIds
    }
}

public enum DailyClientMissions {
    public static let baseSlotsPerClient = 3
    public static let maxAffinityBonusSlots = 5
    public static let idPrefix = "dcp-"

    public static func isPoolId(_ id: String?) -> Bool { id?.hasPrefix(idPrefix) ?? false }

    public static func affinityBonusSlots(completedJobs: Int) -> Int {
        let level = 1 + completedJobs / Clients.affinityMissionThreshold
        return min(maxAffinityBonusSlots, level - 1)
    }

    public static func maxTier(missionsDone: Int) -> Int {
        switch missionsDone {
        case 12...: return 5
        case 9...: return 4
        case 6...: return 3
        case 5: return 2
        default: return 1
        }
    }

    /// 'YYYY-MM-DD' in the device calendar, the same key web builds from the local date.
    public static func dateKey(_ date: Date, calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// Unsigned DJB2 over UTF-16 units, wrapping at 32 bits like the web hash.
    static func djb2(_ s: String) -> UInt32 {
        var h: UInt32 = 5381
        for unit in s.utf16 { h = ((h << 5) &+ h) ^ UInt32(unit) }
        return h
    }

    // MARK: build jobs

    struct ConstructTemplate {
        let id: String
        let role: Client.UIRole
        let structureKind: String
        /// Ordered, so ties between equal quantities drop in the same order as web.
        let materials: [(String, Int)]
        let buildTimeMs: Int
        let difficulty: String
        let drillTierMin: Int
        let orbitMax: Int
        let payoutMultiplier: Double
    }

    static let constructTemplates: [ConstructTemplate] = [
        ConstructTemplate(id: "construct-fuel-depot", role: .prospect, structureKind: "fuel-depot", materials: [("hydrogen", 8), ("aluminium", 6)],
                          buildTimeMs: 20 * 60 * 1000, difficulty: "L2", drillTierMin: 1, orbitMax: 5, payoutMultiplier: 2.8),
        ConstructTemplate(id: "construct-battery-station", role: .command, structureKind: "battery-station", materials: [("cobalt", 6), ("nickel", 4), ("copper", 4)],
                          buildTimeMs: 25 * 60 * 1000, difficulty: "L2", drillTierMin: 2, orbitMax: 6, payoutMultiplier: 3.2),
        ConstructTemplate(id: "construct-fabrication-pad", role: .bulk, structureKind: "fabrication-pad", materials: [("iron", 12), ("silicon", 6), ("aluminium", 4)],
                          buildTimeMs: 35 * 60 * 1000, difficulty: "L3", drillTierMin: 2, orbitMax: 6, payoutMultiplier: 3.6),
    ]

    /// Build jobs are mined on site, so ask only for materials some asteroid in range holds together.
    /// The smallest quantities drop first until one does.
    static func suppliable(_ materials: [(String, Int)], maxOrbit: Int, targets: [Target]) -> [(String, Int)] {
        let ordered = materials.enumerated().sorted { a, b in a.element.1 != b.element.1 ? a.element.1 > b.element.1 : a.offset < b.offset }.map(\.element)
        var keep = ordered.count
        while keep > 1 {
            let subset = Array(ordered.prefix(keep))
            if targets.contains(where: { t in t.orbit <= maxOrbit && t.type == .asteroid && subset.allSatisfy { t.minerals.contains($0.0) } }) { return subset }
            keep -= 1
        }
        return [ordered[0]]
    }

    static func structureName(_ kind: String) -> String {
        kind.split(separator: "-").map { $0.prefix(1).uppercased() + $0.dropFirst() }.joined(separator: " ")
    }

    // MARK: generation

    public static func generate(date: String, missionsDone: Int, clientMissions: [String: Int] = [:], targets: [Target] = Targets.all) -> [Mission] {
        let tier = maxTier(missionsDone: missionsDone)
        let eligible = Clients.all.filter { $0.unlockTier <= tier }
        let baseTemplates = MissionGenerator.templates.filter { !$0.id.hasPrefix("freeops-") && $0.tag != "CONSTRUCT" }
        var missions: [Mission] = []

        for client in eligible {
            let roleTemplates = baseTemplates.filter { $0.clientRole == client.uiRole }
            let pool = roleTemplates.isEmpty ? baseTemplates : roleTemplates
            let slots = baseSlotsPerClient + affinityBonusSlots(completedJobs: clientMissions[client.id] ?? 0)
            for slot in 0..<slots {
                let tSeed = Int(djb2("\(date):\(client.id):\(slot):t")), mSeed = Int(djb2("\(date):\(client.id):\(slot):m")), aSeed = Int(djb2("\(date):\(client.id):\(slot):a"))
                let template = pool[tSeed % pool.count]
                let keys = MissionGenerator.eligibleMinerals(template)
                let preferred = keys.filter { client.mineralPreferences.contains($0) }, fallback = keys.filter { !client.mineralPreferences.contains($0) }
                let candidates = preferred.isEmpty ? fallback : preferred + fallback
                if candidates.isEmpty || template.cargoRange.upperBound < template.cargoRange.lowerBound { continue }
                let mineral = candidates[mSeed % candidates.count]
                let amount = template.cargoRange.lowerBound + aSeed % template.cargoRange.count
                let meta = Minerals.byId[mineral]
                let raw = (Double(meta?.price ?? 0) * Double(amount) * Economy.cargoBonusRate * template.payoutMultiplier * (1 + client.payoutPremium)).rounded()
                let name = meta?.name ?? mineral
                missions.append(Mission(
                    id: "\(idPrefix)\(date)-\(client.id)-\(slot)",
                    title: "\(name) \(template.tag.lowercased()) contract",
                    brief: "\(client.name) needs \(amount) units of \(name.lowercased()) for \(client.projectType.lowercased()). Preferred cargo earns a client premium.",
                    client: client.id, tag: template.tag, difficulty: template.difficulty, locked: false, sequence: MissionGenerator.freeOpsMissionSequence,
                    requires: MissionRequirements(minerals: [mineral: amount], cargoMin: amount,
                                                  drillTier: MissionGenerator.requiredDrillTier([mineral], floor: template.drillTierMin), maxOrbit: template.orbitMax),
                    payout: MissionPayout(francs: MissionGenerator.normalizePayout(raw: raw, sequence: MissionGenerator.freeOpsMissionSequence),
                                          affinity: max(5, Int((8.0 + Double(amount) / 2).rounded())))))
            }
        }

        // One optional client build job per construct template and day, from a client of the matching role.
        for template in constructTemplates {
            let candidates = eligible.filter { $0.uiRole == template.role }
            if candidates.isEmpty { continue }
            let client = candidates[Int(djb2("\(date):\(template.id):c")) % candidates.count]
            let materials = suppliable(template.materials, maxOrbit: template.orbitMax, targets: targets)
            let cargo = Dictionary(uniqueKeysWithValues: materials)
            let cargoMin = materials.reduce(0) { $0 + $1.1 }
            let price = materials.reduce(0.0) { $0 + Double(Minerals.byId[$1.0]?.price ?? 0) * Double($1.1) }
            let raw = (price * Economy.cargoBonusRate * template.payoutMultiplier * (1 + client.payoutPremium)).rounded()
            let structure = structureName(template.structureKind)
            missions.append(Mission(
                id: "\(idPrefix)\(date)-\(client.id)-\(template.id)",
                title: "Build a \(structure)",
                brief: "\(client.name) wants a \(structure.lowercased()) raised on site. Haul the materials out and it is built before you head home.",
                client: client.id, tag: "CONSTRUCT", difficulty: template.difficulty, locked: false, sequence: MissionGenerator.freeOpsMissionSequence,
                requires: MissionRequirements(minerals: cargo, cargoMin: cargoMin,
                                              drillTier: MissionGenerator.requiredDrillTier(materials.map(\.0), floor: template.drillTierMin), maxOrbit: template.orbitMax),
                payout: MissionPayout(francs: MissionGenerator.normalizePayout(raw: raw, sequence: MissionGenerator.freeOpsMissionSequence),
                                      affinity: max(8, Int((10.0 + Double(cargoMin) / 2).rounded()))),
                construction: MissionConstructionPlan(structureKind: template.structureKind, requiredMaterials: cargo, buildTimeMs: template.buildTimeMs)))
        }
        return missions
    }

    /// Today's pool for this player. The same day keeps what was accepted or completed, so a tier or affinity
    /// unlock mid-day only adds contracts. A new day starts clean.
    public static func refreshed(_ existing: DailyClientPool?, missionsDone: Int, clientMissions: [String: Int], today: String, targets: [Target] = Targets.all) -> DailyClientPool {
        let generated = generate(date: today, missionsDone: missionsDone, clientMissions: clientMissions, targets: targets)
        guard let existing, existing.date == today else { return DailyClientPool(date: today, missions: generated) }
        let kept = Dictionary(existing.missions.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        let missions = generated.map { kept[$0.id] ?? $0 }
        if missions == existing.missions { return existing }
        var next = existing
        next.missions = missions
        return next
    }
}
