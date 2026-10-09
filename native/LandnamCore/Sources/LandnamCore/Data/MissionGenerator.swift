import Foundation

public struct MissionTemplate: Equatable, Sendable {
    public let id: String
    public let tag: String
    public let difficulty: String
    public let mineralKeys: [String]
    public let cargoRange: ClosedRange<Int>
    public let drillTierMin: Int
    public let orbitMax: Int
    public let payoutMultiplier: Double
    public let clientRole: Client.UIRole
}

/// Deterministic offline mission board (port of `mission-generator.ts`). The same
/// bands produce the same ids on every device, so saves stay compatible with web.
public enum MissionGenerator {
    public static let freeOpsStartMissionsDone = 2
    public static let onboardingSequenceCount = 2
    public static let freeOpsMissionSequence = 4
    public static let offlineMissionCount = 12
    public static let transportSequence = 2

    public static let templates: [MissionTemplate] = [
        MissionTemplate(id: "starter-bulk", tag: "STARTER", difficulty: "L1", mineralKeys: ["platinum", "palladium"], cargoRange: 4...8, drillTierMin: 1, orbitMax: 4, payoutMultiplier: 1.0, clientRole: .starter),
        MissionTemplate(id: "volatile-bulk", tag: "BULK", difficulty: "L2", mineralKeys: ["palladium", "platinum", "iridium"], cargoRange: 4...8, drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.35, clientRole: .bulk),
        MissionTemplate(id: "metal-prospect", tag: "PROSPECT", difficulty: "L2", mineralKeys: ["iridium", "rhodium", "gold"], cargoRange: 3...6, drillTierMin: 2, orbitMax: 5, payoutMultiplier: 2.25, clientRole: .prospect),
        MissionTemplate(id: "command-reserve", tag: "COMMAND", difficulty: "L3", mineralKeys: ["rhodium", "rare", "iridium"], cargoRange: 2...4, drillTierMin: 2, orbitMax: 6, payoutMultiplier: 3.5, clientRole: .command),
        MissionTemplate(id: "freeops-delivery", tag: "DELIVERY", difficulty: "L1", mineralKeys: ["hydrogen", "cobalt", "copper", "aluminium"], cargoRange: 4...10, drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.25, clientRole: .starter),
        MissionTemplate(id: "freeops-mining-survey", tag: "SURVEY", difficulty: "L1", mineralKeys: ["cobalt", "copper", "aluminium", "gold"], cargoRange: 3...7, drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.55, clientRole: .prospect),
        MissionTemplate(id: "freeops-bulk-run", tag: "BULK", difficulty: "L1", mineralKeys: ["hydrogen", "aluminium", "copper"], cargoRange: 8...16, drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.15, clientRole: .bulk),
        MissionTemplate(id: "freeops-rover-landing", tag: "ROVER", difficulty: "L1", mineralKeys: ["cobalt", "copper", "aluminium", "hydrogen"], cargoRange: 2...5, drillTierMin: 1, orbitMax: 5, payoutMultiplier: 1.7, clientRole: .starter),
    ]

    struct Band { let sequence: Int; let templateId: String; let mineralCount: Int; let amountBias: Int; let clientOffset: Int; let mineralOffset: Int? }
    static let bands: [Band] = [
        Band(sequence: 1, templateId: "starter-bulk", mineralCount: 1, amountBias: 0, clientOffset: 0, mineralOffset: nil),
        Band(sequence: 1, templateId: "volatile-bulk", mineralCount: 1, amountBias: 1, clientOffset: 0, mineralOffset: 0),
        Band(sequence: 4, templateId: "metal-prospect", mineralCount: 2, amountBias: 2, clientOffset: 9, mineralOffset: nil),
        Band(sequence: 4, templateId: "command-reserve", mineralCount: 2, amountBias: 1, clientOffset: 0, mineralOffset: nil),
        Band(sequence: 4, templateId: "command-reserve", mineralCount: 3, amountBias: 2, clientOffset: 1, mineralOffset: nil),
    ]

    static let mineralLabels: [String: String] = ["rare": "Xenon", "ice": "Volatile"]
    static func label(_ id: String) -> String { mineralLabels[id] ?? Minerals.byId[id]?.name ?? id }

    // MARK: payouts

    public static func payoutFloor(sequence: Int) -> Int {
        switch sequence {
        case ...1: return Economy.contractFees[1]!
        case 2: return Economy.contractFees[2]!
        case 3: return Economy.contractFees[3]!
        default: return Economy.contractFees[4]! + (sequence - 4) * Economy.contractFeeStep
        }
    }

    /// Base fee plus a capped bonus for the specific cargo asked for.
    public static func normalizePayout(raw: Double, sequence: Int) -> Int {
        let fee = payoutFloor(sequence: sequence)
        guard raw.isFinite, raw > 0 else { return fee }
        return Int((Double(fee) + min(raw, Double(fee) * Economy.cargoBonusCap)).rounded())
    }

    /// First two guided missions must each pay enough to buy a Prospector.
    public static func calibrateOnboardingPayout(raw: Int, missionsDone: Int) -> Int {
        let floor = Int((Double(Economy.prospectorPrice) * 1.05).rounded())
        return missionsDone <= 1 ? max(raw, floor) : raw
    }

    // MARK: generation

    static func eligibleMinerals(_ t: MissionTemplate) -> [String] {
        if t.tag == "CONSTRUCT" { return t.mineralKeys }
        let filtered = t.mineralKeys.filter { !(Minerals.byId[$0]?.earthAbundant ?? false) }
        return filtered.isEmpty ? t.mineralKeys : filtered
    }

    static func select(_ keys: [String], preferences: [String], index: Int, count: Int) -> [String] {
        let candidates = keys.filter(preferences.contains) + keys.filter { !preferences.contains($0) }
        return (0..<count).map { candidates[(index + $0) % candidates.count] }
    }

    public static func requiredDrillTier(_ ids: [String], floor: Int) -> Int {
        ids.reduce(floor) { max($0, Minerals.byId[$1]?.laserAccess ?? 1) }
    }

    static func amount(_ t: MissionTemplate, sequence: Int, bias: Int, mineralIndex: Int) -> Int {
        let span = t.cargoRange.count
        let raw = t.cargoRange.lowerBound + ((sequence + bias + mineralIndex * 2) % span)
        return min(t.cargoRange.upperBound, raw + max(0, sequence - onboardingSequenceCount))
    }

    /// The authored Transport lesson replaces generated sequence-2 bands; the offline
    /// fallback board is the generated bands plus the free-ops contracts.
    public static func generate(count: Int = offlineMissionCount) -> [Mission] {
        let clients = Clients.all
        return bands.prefix(count).enumerated().map { index, band in
            let t = templates.first { $0.id == band.templateId } ?? templates[0]
            let unlocked = clients.filter { $0.unlockTier <= band.sequence }
            let pool = unlocked.filter { $0.uiRole == t.clientRole }
            let fallback = pool.isEmpty ? unlocked : pool
            let client = fallback[band.clientOffset % fallback.count]
            let keys = select(eligibleMinerals(t), preferences: client.mineralPreferences,
                              index: band.mineralOffset ?? index, count: band.mineralCount)
            var minerals: Cargo = [:]
            for (i, key) in keys.enumerated() { minerals[key] = amount(t, sequence: band.sequence, bias: band.amountBias, mineralIndex: i) }
            let cargoMin = minerals.values.reduce(0, +)
            let primary = keys.map(label).joined(separator: " + ")
            let raw = minerals.reduce(0.0) { $0 + Double(Minerals.byId[$1.key]?.price ?? 0) * Double($1.value) * Economy.cargoBonusRate * t.payoutMultiplier * (1 + client.payoutPremium) }
            let title = band.sequence == 1 ? "Baseline Extraction" : "\(primary) \(t.tag.lowercased()) order"
            return Mission(
                id: "generated-s\(band.sequence)-\(t.id)-\(index + 1)",
                title: title,
                brief: "\(client.name) needs \(primary.lowercased()) for \(client.projectType.lowercased()). Preferred cargo earns a client premium; affinity improves future payouts.",
                client: client.id, tag: t.tag, difficulty: t.difficulty, locked: false, sequence: band.sequence,
                unlockAt: band.sequence > 1 ? "Complete \(band.sequence - 1) contract\(band.sequence > 2 ? "s" : "")" : nil,
                requires: MissionRequirements(minerals: minerals, cargoMin: cargoMin,
                                              drillTier: requiredDrillTier(keys, floor: t.drillTierMin), maxOrbit: t.orbitMax),
                payout: MissionPayout(francs: normalizePayout(raw: raw, sequence: band.sequence),
                                      affinity: max(4, Int((6.0 + Double(band.sequence) * 2 + Double(cargoMin) / 3).rounded()))))
        }
    }

    /// Free Ops client contracts, three tier-1 clients with up to two templates each.
    public static func generateFreeOps() -> [Mission] {
        let freeOps = Clients.all.filter { $0.unlockTier <= 1 }.prefix(3)
        let ops = templates.filter { $0.id.hasPrefix("freeops-") }
        return freeOps.enumerated().flatMap { clientIndex, client in
            ops.filter { $0.clientRole == client.uiRole }.prefix(2).enumerated().map { templateIndex, t in
                let keys = eligibleMinerals(t)
                let mineral = keys.first { client.mineralPreferences.contains($0) } ?? keys[(clientIndex + templateIndex) % keys.count]
                let amount = t.cargoRange.lowerBound + clientIndex + templateIndex
                let name = Minerals.byId[mineral]?.name ?? mineral
                let raw = Double(Minerals.byId[mineral]?.price ?? 0) * Double(amount) * Economy.cargoBonusRate * t.payoutMultiplier * (1 + client.payoutPremium)
                return Mission(
                    id: "freeops-\(client.id)-\(t.id)-\(templateIndex + 1)", title: "\(name) \(t.tag.lowercased()) contract",
                    brief: "\(client.name) needs \(amount) units of \(name.lowercased()) delivered from a reachable asteroid. \(client.projectType).",
                    client: client.id, tag: t.tag, difficulty: t.difficulty, locked: false, sequence: freeOpsMissionSequence,
                    unlockAt: "Reach Free Operations",
                    requires: MissionRequirements(minerals: [mineral: amount], cargoMin: amount,
                                                  drillTier: requiredDrillTier([mineral], floor: t.drillTierMin), maxOrbit: t.orbitMax),
                    payout: MissionPayout(francs: normalizePayout(raw: raw, sequence: freeOpsMissionSequence), affinity: max(5, Int((8.0 + Double(amount) / 2).rounded()))))
            }
        }
    }

    /// Renewable self-directed pool: no client, plain market price, no affinity.
    public static func generateSelfDirected() -> [Mission] {
        templates.filter { $0.id.hasPrefix("freeops-") && $0.cargoRange.lowerBound + $0.cargoRange.upperBound > 0 }
            .enumerated().map { index, t in
                let keys = eligibleMinerals(t)
                let mineral = keys[index % keys.count]
                let amount = t.cargoRange.lowerBound + index
                let name = label(mineral)
                let raw = Double(Minerals.byId[mineral]?.price ?? 0) * Double(amount) * Economy.cargoBonusRate * t.payoutMultiplier
                return Mission(
                    id: "self-directed-\(t.id)-\(index + 1)", title: "\(name) self-directed run",
                    brief: "No client, no daily limit. Mine \(amount) units of \(name.lowercased()) and sell the haul yourself at market price.",
                    client: nil, tag: "FREE OPS", difficulty: t.difficulty, locked: false, sequence: freeOpsMissionSequence,
                    unlockAt: "Reach Free Operations",
                    requires: MissionRequirements(minerals: [mineral: amount], cargoMin: amount,
                                                  drillTier: requiredDrillTier([mineral], floor: t.drillTierMin), maxOrbit: t.orbitMax),
                    payout: MissionPayout(francs: normalizePayout(raw: raw, sequence: freeOpsMissionSequence), affinity: 0))
            }
    }

    /// Everything the web catalog offers: the generated board plus the authored missions.
    public static func everything() -> [Mission] { fullBoard() + AuthoredMissions.all }

    public static func fullBoard() -> [Mission] {
        generate().filter { $0.sequence != transportSequence } + generateFreeOps() + generateSelfDirected()
    }
}
