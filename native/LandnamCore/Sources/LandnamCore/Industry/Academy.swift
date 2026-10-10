import Foundation

public enum CrewClass: String, Codable, Sendable, CaseIterable { case astronaut, rover, drone }
public enum CrewCondition: String, Codable, Sendable { case fit, fatigued, injured }

public struct CrewSpecialisation: Codable, Equatable, Sendable { public var branch: String; public var tier: Int }

public struct CrewMember: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var crewClass: CrewClass
    public var xp: Int
    public var specialisations: [CrewSpecialisation]
    public var condition: CrewCondition
    public var recoveredAt: Double?
    public var joinedAt: Double
    public var selfTrained: Bool
    public var hireCost: Int?
    public var sourceId: String?
}

public struct CrewTrainingSession: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var crewId: String?
    public var candidateId: String?
    public var candidateName: String?
    public var branch: String
    public var startedAt: Double
    public var completesAt: Double
}

public struct CrewRehireOffer: Codable, Equatable, Sendable { public var member: CrewMember; public var rehireCost: Int; public var leftAt: Double }

public struct CrewSource: Equatable, Sendable, Identifiable {
    public let id: String, name: String, description: String
    public let isAgency: Bool
    public let clientId: String?
}

public struct XPCurve: Sendable { public let thresholds: [Int] }
public struct XPProgress: Equatable, Sendable { public let level: Int, xpIntoLevel: Int; public let xpToNextLevel: Int? }

public struct ActorArchetype: Sendable, Identifiable {
    public let id: CrewClass
    public let name: String, plural: String
    public let isPerson: Bool, hasUpkeep: Bool
    public let rosterCap: Int?
    public let specialisations: [String]
    public let description: String
}

/// Astronaut Academy and crew roster (port of `AcademySystem.ts`, `CrewSystem.ts`, `crew.ts`, `actors.ts`).
public enum Academy {
    public static let dayMs = 86_400_000.0
    public static let branches = ["mining", "cargo", "range", "engineering"]
    public static let crewCurve = XPCurve(thresholds: [0, 100, 300, 600, 1000, 1500, 2200, 3100, 4200, 5600])
    public static let academyCurve = XPCurve(thresholds: [0, 500, 1500])
    public static let affinityThreshold = 5
    public static let firstHireCost = 1_500_000, hireEscalation = 1.6, weeklyHireCap = 2, totalHiredCap = 6
    public static let crewDailyUpkeep = 60_000, academyDailyUpkeep = 200_000, quitRefundRate = 0.5
    public static let sessionsPerDay = 2, trainingDurationMs = 86_400_000.0
    public static let academyResearchXP = 150, crewModuleResearchXP = 100, missionXP = 100, trainingXP = 100
    public static let hiredLevel = 3, trainedLevel = 1
    public static let fatigueRecoveryMs = 12.0 * 3_600_000, injuryRecoveryMs = 3 * dayMs

    public static let archetypes: [ActorArchetype] = [
        ActorArchetype(id: .astronaut, name: "Astronaut", plural: "Astronauts", isPerson: true, hasUpkeep: true, rosterCap: nil,
                       specialisations: branches, description: "A named person on the roster. Hired at level 3 or trained from level 1. Can be fatigued or injured, never lost."),
        ActorArchetype(id: .rover, name: "Rover", plural: "Rovers", isPerson: false, hasUpkeep: false, rosterCap: 4,
                       specialisations: ["mining", "engineering"], description: "Landed surface equipment. Deployed once and stays, working after the ship comes home. Carries a designation, not a name."),
        ActorArchetype(id: .drone, name: "Drone", plural: "Drones", isPerson: false, hasUpkeep: false, rosterCap: 4,
                       specialisations: ["cargo", "range"], description: "Dispatched and recovered. Not yet acquirable, declared so the roster does not need reshaping when it lands."),
    ]
    public static func archetype(_ c: CrewClass) -> ActorArchetype { archetypes.first { $0.id == c }! }

    // MARK: XP

    public static func level(_ xp: Int, _ curve: XPCurve) -> Int {
        var level = 1; let safe = max(0, xp)
        for i in 1..<curve.thresholds.count { if safe < curve.thresholds[i] { break }; level = i + 1 }
        return level
    }
    public static func progress(_ xp: Int, _ curve: XPCurve) -> XPProgress {
        let safe = max(0, xp), lv = level(safe, curve), atMax = lv >= curve.thresholds.count
        let floor = curve.thresholds[lv - 1]
        return XPProgress(level: lv, xpIntoLevel: safe - floor, xpToNextLevel: atMax ? nil : curve.thresholds[lv] - safe)
    }
    public static func crewLevel(_ m: CrewMember) -> Int { level(m.xp, crewCurve) }
    public static func xpForCrewLevel(_ lv: Int) -> Int { crewCurve.thresholds[min(max(1, lv), crewCurve.thresholds.count) - 1] }
    public static func academyLevel(_ p: Player) -> Int { level(p.academyXP, academyCurve) }
    public static func trainingCapacity(_ p: Player) -> Int { academyLevel(p) }

    // MARK: Dates

    static var utc: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    public static func dateKey(_ ms: Double) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
        return f.string(from: Date(timeIntervalSince1970: ms / 1000))
    }
    public static func weekKey(_ ms: Double) -> String {
        let d = Date(timeIntervalSince1970: ms / 1000)
        let wd = utc.component(.weekday, from: d)          // 1 = Sunday
        let day = wd == 1 ? 7 : wd - 1                       // Monday = 1
        return dateKey(d.addingTimeInterval(Double(1 - day) * dayMs / 1000).timeIntervalSince1970 * 1000)
    }
    static func dayNumber(_ key: String) -> Int {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
        return f.date(from: key).map { Int($0.timeIntervalSince1970 / 86_400) } ?? 0
    }

    // MARK: Names

    static let given = ["Aina", "Alex", "Amara", "Anders", "Anja", "Arun", "Beatriz", "Bo", "Camille", "Chen", "Dara", "Diego", "Ebba", "Elif", "Emeka", "Esme",
                        "Farid", "Freya", "Gabriel", "Hana", "Ingrid", "Isa", "Jonas", "Juno", "Kai", "Karin", "Lars", "Leila", "Lena", "Malik", "Mira", "Nadia",
                        "Nils", "Nour", "Omar", "Petra", "Priya", "Rafael", "Ravi", "Rune", "Sanna", "Sora", "Talia", "Tomas", "Vera", "Yusuf", "Zara", "Zheng"]
    static let surnames = ["Adeyemi", "Almeida", "Bergstrom", "Cardoso", "Chandra", "Dahl", "Delacroix", "Eriksen", "Farouk", "Fontaine", "Gudmundsson", "Halvorsen",
                           "Hayashi", "Ibarra", "Iyer", "Jansen", "Kaur", "Keller", "Kowalski", "Lindqvist", "Marchetti", "Mbeki", "Moreau", "Nakamura", "Novak",
                           "Okafor", "Olsen", "Petrov", "Quintero", "Rahman", "Ramos", "Sandoval", "Sato", "Sorensen", "Tanaka", "Vargas", "Virtanen", "Wallace", "Yilmaz", "Zielinski"]

    public static func pickName(id: String, crewClass: CrewClass, taken: [CrewMember]) -> String {
        if crewClass != .astronaut {
            let n = taken.filter { $0.crewClass == crewClass }.count + 1
            return "\(crewClass == .rover ? "Rover" : "Drone") \(String(format: "%02d", n))"
        }
        var hash: UInt32 = 0
        for u in id.utf16 { hash = hash &* 31 &+ UInt32(u) }
        let names = Set(taken.map(\.name)), combos = given.count * surnames.count
        for step in 0..<combos {
            let slot = (Int(hash) + step) % combos
            let name = "\(given[slot % given.count]) \(surnames[slot / given.count])"
            if !names.contains(name) { return name }
        }
        return "\(given[Int(hash) % given.count]) \(surnames[Int(hash) % surnames.count])-\(id.suffix(4))"
    }

    public static func createMember(id: String, crewClass: CrewClass, name: String? = nil, level: Int? = nil, selfTrained: Bool,
                                    hireCost: Int? = nil, now: Double, taken: [CrewMember] = []) -> CrewMember {
        CrewMember(id: id, name: name ?? pickName(id: id, crewClass: crewClass, taken: taken), crewClass: crewClass,
                   xp: xpForCrewLevel(level ?? (selfTrained ? trainedLevel : hiredLevel)), specialisations: [], condition: .fit,
                   recoveredAt: nil, joinedAt: now, selfTrained: selfTrained, hireCost: hireCost, sourceId: nil)
    }

    public static let startingCrew: [(id: String, crewClass: CrewClass)] = [
        ("crew-starting-astronaut", .astronaut), ("crew-starting-drone", .drone), ("crew-rover-starter-rover", .rover),
    ]

    /// Idempotent: grants the opening crew once and settles lapsed fatigue and injury.
    public static func migrate(_ s: GameState, now: Double) -> GameState {
        var n = s
        for (id, cls) in startingCrew where !n.player.crew.contains(where: { $0.id == id }) {
            n.player.crew.append(createMember(id: id, crewClass: cls, level: trainedLevel, selfTrained: true, now: now, taken: n.player.crew))
        }
        n.player.crew = n.player.crew.map { c in
            guard c.condition != .fit, let r = c.recoveredAt, r <= now else { return c }
            var m = c; m.condition = .fit; m.recoveredAt = nil; return m
        }
        return n == s ? s : n
    }

    // MARK: Sources and hiring

    public static let agencies: [CrewSource] = [
        CrewSource(id: "nasa", name: "NASA", description: "United States civil spaceflight agency.", isAgency: true, clientId: nil),
        CrewSource(id: "esa", name: "ESA", description: "European intergovernmental spaceflight agency.", isAgency: true, clientId: nil),
        CrewSource(id: "jaxa", name: "JAXA", description: "Japan Aerospace Exploration Agency.", isAgency: true, clientId: nil),
        CrewSource(id: "roscosmos", name: "Roscosmos", description: "Russian state space corporation.", isAgency: true, clientId: nil),
        CrewSource(id: "isro", name: "ISRO", description: "Indian Space Research Organisation.", isAgency: true, clientId: nil),
    ]
    public static func allSources() -> [CrewSource] {
        agencies + Clients.all.filter(\.suppliesCrew).map {
            CrewSource(id: "client:\($0.id)", name: $0.name, description: "\($0.projectType). Trusted partners may second trained crew.", isAgency: false, clientId: $0.id)
        }
    }
    public static func affinityLevel(_ jobs: Int) -> Int { 1 + max(0, jobs) / affinityThreshold }
    public static func affinityUnlocked(_ p: Player) -> Bool { p.clientMissions.values.filter { affinityLevel($0) >= 2 }.count >= 2 }
    public static func hireCost(_ p: Player) -> Int { Int((Double(firstHireCost) * pow(hireEscalation, Double(p.crewHiresLifetime))).rounded()) }
    public static func sources(for p: Player) -> [CrewSource] {
        allSources().filter { $0.isAgency || ($0.clientId.map { affinityLevel(p.clientMissions[$0] ?? 0) >= 2 } ?? false) }
    }

    public enum HireBlock: String, Sendable { case academyLocked = "academy locked", unknownSource = "unknown source", sourceLocked = "source locked", weeklyCap = "weekly cap", hiredCap = "hired cap", insufficientFrancs = "insufficient francs" }

    public static func hireBlock(_ p: Player, sourceId: String, now: Double) -> HireBlock? {
        if !p.academyResearched || !p.placed.contains("astronaut-academy") { return .academyLocked }
        guard allSources().contains(where: { $0.id == sourceId }) else { return .unknownSource }
        guard sources(for: p).contains(where: { $0.id == sourceId }) else { return .sourceLocked }
        let week = p.crewHireWeek == weekKey(now) ? p.crewHiresThisWeek : 0
        if week >= weeklyHireCap { return .weeklyCap }
        if p.crew.filter({ !$0.selfTrained }).count >= totalHiredCap { return .hiredCap }
        if p.francs < hireCost(p) { return .insufficientFrancs }
        return nil
    }

    public static func applyHire(_ s: GameState, sourceId: String, now: Double) -> GameState {
        guard hireBlock(s.player, sourceId: sourceId, now: now) == nil else { return s }
        var n = s; let cost = hireCost(s.player)
        var m = createMember(id: "crew-hire-\(Int(now))-\(s.player.crewHiresLifetime)", crewClass: .astronaut, selfTrained: false, hireCost: cost, now: now, taken: s.player.crew)
        m.sourceId = sourceId
        let week = weekKey(now)
        n.player.crewHiresThisWeek = (s.player.crewHireWeek == week ? s.player.crewHiresThisWeek : 0) + 1
        n.player.crewHireWeek = week
        n.player.francs -= cost; n.player.crew.append(m); n.player.crewHiresLifetime += 1
        return n
    }

    public static func applyRehire(_ s: GameState, crewId: String, now: Double) -> GameState {
        guard let offer = s.player.formerCrew.first(where: { $0.member.id == crewId }), s.player.francs >= offer.rehireCost else { return s }
        let week = weekKey(now), used = s.player.crewHireWeek == week ? s.player.crewHiresThisWeek : 0
        guard used < weeklyHireCap, s.player.crew.filter({ !$0.selfTrained }).count < totalHiredCap else { return s }
        var n = s; var m = offer.member
        m.joinedAt = now; m.condition = .fit; m.recoveredAt = nil; m.hireCost = offer.rehireCost
        n.player.francs -= offer.rehireCost; n.player.crew.append(m)
        n.player.formerCrew.removeAll { $0.member.id == crewId }
        n.player.crewHiresThisWeek = used + 1; n.player.crewHireWeek = week
        return n
    }

    // MARK: Upkeep

    /// Settles lazily: unpaid upkeep mortgages hires out one at a time, they stay re-hirable, no debt.
    public static func settleEconomy(_ s: GameState, now: Double) -> GameState {
        let today = dateKey(now)
        guard let last = s.player.crewUpkeepSettledDate else { var n = s; n.player.crewUpkeepSettledDate = today; return n }
        let elapsed = max(0, dayNumber(today) - dayNumber(last))
        guard elapsed > 0 else { return s }
        var n = s
        var crew = n.player.crew, former = n.player.formerCrew, francs = n.player.francs, funded = n.player.academyFunded
        let built = n.player.placed.contains("astronaut-academy")
        func daily() -> Int { crew.filter { archetype($0.crewClass).hasUpkeep }.count * crewDailyUpkeep + (built && funded ? academyDailyUpkeep : 0) }
        var due = daily() * elapsed
        var hired = crew.filter { !$0.selfTrained && ($0.hireCost ?? 0) > 0 }.sorted { ($0.hireCost ?? 0) > ($1.hireCost ?? 0) }
        while due > francs, !hired.isEmpty {
            let m = hired.removeFirst()
            let refund = Int((Double(m.hireCost ?? 0) * quitRefundRate).rounded())
            crew.removeAll { $0.id == m.id }
            former.append(CrewRehireOffer(member: m, rehireCost: refund, leftAt: now))
            francs += refund; due = daily() * elapsed
        }
        if due > francs, funded { funded = false; due = daily() * elapsed }
        francs = max(0, francs - min(francs, due))
        n.player.francs = francs; n.player.crew = crew; n.player.formerCrew = former
        n.player.academyFunded = funded; n.player.crewUpkeepSettledDate = today
        n.player.structureCrewAssignments = n.player.structureCrewAssignments.filter { _, id in crew.contains { $0.id == id } }
        return n
    }

    // MARK: Research and funding

    public static func applyResearchAcademy(_ s: GameState) -> GameState {
        guard !s.player.academyResearched, affinityUnlocked(s.player), s.player.researchXP >= academyResearchXP else { return s }
        var n = s; n.player.researchXP -= academyResearchXP; n.player.academyResearched = true; n.player.academyFunded = true; return n
    }
    public static func applySetFunding(_ s: GameState, funded: Bool) -> GameState {
        guard s.player.placed.contains("astronaut-academy") else { return s }
        var n = s; n.player.academyFunded = funded; return n
    }
    public static func applyResearchCrewModule(_ s: GameState) -> GameState {
        guard !s.player.crewModuleResearched, s.player.academyResearched, s.player.researchXP >= crewModuleResearchXP else { return s }
        var n = s; n.player.researchXP -= crewModuleResearchXP; n.player.crewModuleResearched = true; return n
    }

    // MARK: Training

    public static func usageToday(_ p: Player, now: Double) -> Int { p.trainingDate == dateKey(now) ? p.trainingSessionsUsedToday : 0 }
    public static func canStartTraining(_ p: Player, now: Double) -> Bool {
        p.academyFunded && p.placed.contains("astronaut-academy") && usageToday(p, now: now) < sessionsPerDay && p.crewTraining.count < trainingCapacity(p)
    }
    private static func withSession(_ s: GameState, _ session: CrewTrainingSession, now: Double) -> GameState {
        var n = s
        n.player.crewTraining.append(session)
        n.player.trainingSessionsUsedToday = usageToday(s.player, now: now) + 1
        n.player.trainingDate = dateKey(now)
        return n
    }
    public static func applyStartTraining(_ s: GameState, crewId: String, branch: String, now: Double) -> GameState {
        guard canStartTraining(s.player, now: now), let m = s.player.crew.first(where: { $0.id == crewId }), m.condition == .fit,
              archetype(m.crewClass).specialisations.contains(branch), !s.player.crewTraining.contains(where: { $0.crewId == crewId }),
              (m.specialisations.first { $0.branch == branch }?.tier ?? 0) < 3 else { return s }
        return withSession(s, CrewTrainingSession(id: "training-\(crewId)-\(branch)-\(Int(now))", crewId: crewId, candidateId: nil, candidateName: nil,
                                                  branch: branch, startedAt: now, completesAt: now + trainingDurationMs * BuildingLevels.timeMultiplier(BuildingLevels.level(s.player, "astronaut-academy"))), now: now)
    }
    public static func applyStartCandidate(_ s: GameState, branch: String, now: Double) -> GameState {
        guard canStartTraining(s.player, now: now) else { return s }
        let id = "crew-trained-\(Int(now))"
        return withSession(s, CrewTrainingSession(id: "training-\(id)-\(branch)", crewId: nil, candidateId: id,
                                                  candidateName: pickName(id: id, crewClass: .astronaut, taken: s.player.crew), branch: branch,
                                                  startedAt: now, completesAt: now + trainingDurationMs * BuildingLevels.timeMultiplier(BuildingLevels.level(s.player, "astronaut-academy"))), now: now)
    }
    static func addSpecialisation(_ m: CrewMember, _ branch: String) -> CrewMember {
        var n = m
        let cur = m.specialisations.first { $0.branch == branch }?.tier ?? 0
        n.specialisations = m.specialisations.filter { $0.branch != branch } + [CrewSpecialisation(branch: branch, tier: min(3, cur + 1))]
        n.xp += trainingXP
        return n
    }
    public static func applyCollectTraining(_ s: GameState, sessionId: String, now: Double) -> GameState {
        guard let session = s.player.crewTraining.first(where: { $0.id == sessionId }), now >= session.completesAt else { return s }
        var n = s
        if let cid = session.crewId {
            n.player.crew = n.player.crew.map { $0.id == cid ? addSpecialisation($0, session.branch) : $0 }
        } else if let cand = session.candidateId {
            let m = createMember(id: cand, crewClass: .astronaut, name: session.candidateName, selfTrained: true, now: now, taken: n.player.crew)
            n.player.crew.append(addSpecialisation(m, session.branch))
        }
        n.player.crewTraining.removeAll { $0.id == sessionId }
        n.player.academyXP += 250
        return n
    }

    // MARK: Staffing and diplomacy

    public static func applyAssign(_ s: GameState, structureId: String, crewId: String?) -> GameState {
        var cur = s.player.structureCrewAssignments
        for (k, v) in cur where v == crewId || k == structureId { cur[k] = nil }
        if let crewId, s.player.crew.contains(where: { $0.id == crewId && $0.condition == .fit }) { cur[structureId] = crewId }
        var n = s; n.player.structureCrewAssignments = cur; return n
    }
    public static func diplomacyActive(_ p: Player) -> Bool { p.structureCrewAssignments["diplomacy"] != nil }
    public static func diplomacyPayoutMultiplier(_ p: Player, clientId: String) -> Double {
        guard diplomacyActive(p) else { return 1 }
        let a = affinityLevel(p.clientMissions[clientId] ?? 0), charts = p.sharedChartsByClient[clientId] ?? 0
        return 1 + min(0.25, max(0, Double(a - 1)) * 0.05 + Double(charts) * 0.02)
    }
    /// Chart intel has no source since the Scanning Station was removed, so this stays inert as on web.
    public static func applyShareCharts(_ s: GameState, clientId: String) -> GameState { s }

    /// Awards crew XP once per award id and tires or injures whoever flew.
    public static func applyMissionXP(_ s: GameState, awardId: String, crewIds: [String], now: Double, injuredOnReturn: Bool = false) -> GameState {
        guard !crewIds.isEmpty else { return s }
        var n = s
        n.player.crew = n.player.crew.map { m in
            guard crewIds.contains(m.id) else { return m }
            var c = m; let injured = s.player.shipDestroyed && injuredOnReturn
            c.xp += missionXP; c.condition = injured ? .injured : .fatigued
            c.recoveredAt = now + (injured ? injuryRecoveryMs : fatigueRecoveryMs)
            return c
        }
        return n
    }
}
