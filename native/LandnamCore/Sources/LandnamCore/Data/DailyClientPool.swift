import Foundation

/// Daily rotating client contracts (port of web `daily-client-missions.ts`, SSL-570/571).
/// The pool is a pure function of the calendar day, so it is stable within a day,
/// rotates at midnight and produces the same `dcp-` ids as web.
public enum DailyClientPool {
    public static let baseSlotsPerClient = 3
    public static let maxAffinityBonusSlots = 5
    public static let tierAffinityJobs = 3
    public static let maxTier = 5

    static let structureNames: [String: String] = [
        "fuel-depot": "Fuel Depot", "battery-station": "Battery Station", "fabrication-pad": "Fabrication Pad",
    ]

    public static func dateKey(_ date: Date = Date()) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    static func djb2(_ s: String) -> UInt32 {
        var h: UInt32 = 5381
        for u in s.utf16 { h = (h &<< 5 &+ h) ^ UInt32(u) }
        return h
    }

    static func progressTier(_ missionsDone: Int) -> Int {
        if missionsDone >= 12 { return 5 }
        if missionsDone >= 9 { return 4 }
        if missionsDone >= 6 { return 3 }
        if missionsDone >= 5 { return 2 }
        return 1
    }

    /// Client affinity opens tiers: every `tierAffinityJobs` client jobs opens the next tier.
    public static func maxClientTier(missionsDone: Int, clientMissions: [String: Int]) -> Int {
        let jobs = clientMissions.values.reduce(0, +)
        return min(maxTier, max(progressTier(missionsDone), 1 + jobs / tierAffinityJobs))
    }

    public static func bonusSlots(_ completedJobs: Int) -> Int {
        min(maxAffinityBonusSlots, completedJobs / Clients.affinityMissionThreshold)
    }

    /// A client build job is one run: it must fit the tier-2 Prospector hull.
    public static let clientBuildCargoCap = 10

    /// The share of a structure's materials one reachable target can supply, scaled to one run.
    /// Mirrors web `clientBuildMaterials`: the first target (in `Targets.all` order) holding the most materials wins.
    public static func clientBuildMaterials(_ materials: Cargo, orbitMax: Int) -> Cargo? {
        var best: [String] = []
        for target in Targets.all where target.orbit <= orbitMax {
            let here = materials.keys.filter { target.minerals.contains($0) }
            if here.count > best.count { best = here }
        }
        guard !best.isEmpty else { return nil }
        let total = best.reduce(0) { $0 + (materials[$1] ?? 0) }
        let scale = min(1.0, Double(clientBuildCargoCap) / Double(total))
        return Dictionary(uniqueKeysWithValues: best.map { ($0, max(1, Int((Double(materials[$0] ?? 0) * scale).rounded(.down)))) })
    }

    public static func generate(date: String, missionsDone: Int, clientMissions: [String: Int] = [:]) -> [Mission] {
        let tier = maxClientTier(missionsDone: missionsDone, clientMissions: clientMissions)
        let base = MissionGenerator.templates.filter { !$0.id.hasPrefix("freeops-") && $0.tag != "CONSTRUCT" }
        let builds = MissionGenerator.templates.filter { $0.tag == "CONSTRUCT" && $0.construction != nil }
        let seq = MissionGenerator.freeOpsMissionSequence
        var out: [Mission] = []
        for client in Clients.all where client.unlockTier <= tier {
            let role = base.filter { $0.clientRole == client.uiRole }
            let pool = role.isEmpty ? base : role
            let slots = baseSlotsPerClient + bonusSlots(clientMissions[client.id] ?? 0)
            for slot in 0..<slots {
                let t = pool[Int(djb2("\(date):\(client.id):\(slot):t") % UInt32(pool.count))]
                let keys = MissionGenerator.eligibleMinerals(t)
                let preferred = keys.filter { client.mineralPreferences.contains($0) }
                let fallback = keys.filter { !client.mineralPreferences.contains($0) }
                let candidates = preferred + fallback
                guard !candidates.isEmpty else { continue }
                let mineral = candidates[Int(djb2("\(date):\(client.id):\(slot):m") % UInt32(candidates.count))]
                let span = t.cargoRange.upperBound - t.cargoRange.lowerBound + 1
                let amount = t.cargoRange.lowerBound + Int(djb2("\(date):\(client.id):\(slot):a") % UInt32(span))
                let name = Minerals.byId[mineral]?.name ?? mineral
                let raw = Double(Minerals.byId[mineral]?.price ?? 0) * Double(amount) * 1500 * t.payoutMultiplier * (1 + client.payoutPremium)
                out.append(Mission(
                    id: "dcp-\(date)-\(client.id)-\(slot)", title: "\(name) \(t.tag.lowercased()) contract",
                    brief: "\(client.name) needs \(amount) units of \(name.lowercased()) for \(client.projectType.lowercased()). Preferred cargo earns a client premium.",
                    client: client.id, tag: t.tag, difficulty: t.difficulty, locked: false, sequence: seq,
                    requires: MissionRequirements(minerals: [mineral: amount], cargoMin: amount,
                                                  drillTier: MissionGenerator.requiredDrillTier([mineral], floor: t.drillTierMin), maxOrbit: t.orbitMax),
                    payout: MissionPayout(francs: MissionGenerator.normalizePayout(raw: raw, sequence: seq), affinity: max(5, Int((8.0 + Double(amount) / 2).rounded())))))
            }
            if let bt = builds.first(where: { $0.clientRole == client.uiRole }), let blueprint = bt.construction,
               djb2("\(date):\(client.id):build") % 2 == 0,
               let materials = clientBuildMaterials(blueprint.requiredMaterials, orbitMax: bt.orbitMax) {
                var plan = blueprint
                plan.requiredMaterials = materials
                let structure = structureNames[plan.structureKind] ?? plan.structureKind
                let cargo = plan.requiredMaterials.values.reduce(0, +)
                let value = plan.requiredMaterials.reduce(0.0) { $0 + Double(Minerals.byId[$1.key]?.price ?? 0) * Double($1.value) }
                let raw = value * 1500 * bt.payoutMultiplier * (1 + client.payoutPremium)
                out.append(Mission(
                    id: "dcp-\(date)-\(client.id)-build-\(plan.structureKind)", title: "Build \(structure)",
                    brief: "\(client.name) wants a \(structure.lowercased()) raised at a target of your choice. Mine the materials, fly them out and build on site. Optional client job.",
                    client: client.id, tag: bt.tag, difficulty: bt.difficulty, locked: false, sequence: seq,
                    requires: MissionRequirements(minerals: plan.requiredMaterials, cargoMin: cargo,
                                                  drillTier: MissionGenerator.requiredDrillTier(Array(plan.requiredMaterials.keys), floor: bt.drillTierMin), maxOrbit: bt.orbitMax),
                    payout: MissionPayout(francs: MissionGenerator.normalizePayout(raw: raw, sequence: seq), affinity: max(8, Int((10.0 + Double(cargo) / 2).rounded()))),
                    construction: plan))
            }
        }
        return out
    }

    /// Resolve any `dcp-` id, including one accepted on an earlier day, from its embedded date.
    public static func mission(id: String) -> Mission? {
        guard id.hasPrefix("dcp-"), id.count >= 14 else { return nil }
        let date = String(id.dropFirst(4).prefix(10))
        let all = generate(date: date, missionsDone: 99, clientMissions: ["_": 999])
        if let m = all.first(where: { $0.id == id }) { return m }
        // Bonus slots depend on per-client affinity; regenerate with every client maxed.
        let maxed = Dictionary(uniqueKeysWithValues: Clients.all.map { ($0.id, 999) })
        return generate(date: date, missionsDone: 99, clientMissions: maxed).first { $0.id == id }
    }
}
