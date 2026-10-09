import Foundation

public struct ArchiveRequirement: Identifiable, Equatable, Sendable {
    public var id: String { label }
    public let label: String
    public let detail: String
    public let met: Bool
}

public struct ArchiveEntry: Identifiable, Equatable, Sendable {
    public enum Category: String, CaseIterable, Sendable {
        case guided = "Guided path", contracts = "Client contracts", transport = "Transport", crew = "Crew"
        case program = "Your programme", instruments = "Instruments", spacecraft = "Spacecraft", structures = "Structures", spaceWeek = "Space Week"
    }
    public enum Status: String, Sendable { case done = "Done", available = "Available", locked = "Locked", live = "Live now", upcoming = "Upcoming", ended = "Ended" }

    public let id: String
    public let category: Category
    public let title: String
    public let subtitle: String
    public let summary: String
    public let status: Status
    public let requirements: [ArchiveRequirement]
    /// "What you need to do", in order.
    public let steps: [String]
    public let rewards: [String]
    public let missionId: String?
}

/// The pathway view: every mission, spacecraft, structure, instrument and Space Week event with what unlocks it.
public enum Archive {
    private static func req(_ label: String, _ detail: String, _ met: Bool) -> ArchiveRequirement { ArchiveRequirement(label: label, detail: detail, met: met) }
    private static func f(_ n: Int) -> String { Economy.format(francs: n) }
    private static func name(_ id: String) -> String { Minerals.byId[id]?.name ?? id }
    private static func list(_ c: Cargo) -> String { c.sorted { $0.key < $1.key }.map { "\($0.value) \(name($0.key))" }.joined(separator: ", ") }

    public static func entries(catalog: Catalog, player p: Player, now: Double) -> [ArchiveEntry] {
        missions(catalog, p, now) + spacecraft(p) + structures(p) + instruments(p) + spaceWeek(p, now)
    }

    // MARK: pathway

    public struct PathNode: Identifiable, Equatable, Sendable {
        public var id: String { title }
        public let title: String
        public let detail: String
        public let entryId: String?
        public let done: Bool
    }

    /// The main road through the game, in the order most players walk it. The first node not done is "next".
    public static func pathway(player p: Player, entries: [ArchiveEntry]) -> [PathNode] {
        func done(_ id: String) -> Bool { entries.first { $0.id == id }?.status == .done }
        let firstContract = entries.first { $0.category == .guided && $0.id.hasPrefix("mission:") }?.id
        return [
            PathNode(title: "First contract", detail: "Take a guided contract from the mission board and fly it home.", entryId: firstContract, done: p.missionsDone >= 1),
            PathNode(title: "Transport lesson", detail: "Mine at one asteroid and hand the cargo off at another.", entryId: "mission:lnm_m3_relay_bennu_vesta", done: p.missionsDone >= 2),
            PathNode(title: "Surface Silo", detail: "Build storage at Base so ore can wait for a better price.", entryId: "structure:surface-silo", done: p.placed.contains("surface-silo")),
            PathNode(title: "Free Operations", detail: "Finish the guided path to fly your own programme with no client.", entryId: "mission:freeops-self-directed-mining", done: p.freeOperations),
            PathNode(title: "Prospector rocket", detail: "A bigger hull and a tier 2 laser for deeper contracts.", entryId: "rocket:prospector", done: (p.rocketPurchaseCounts["prospector"] ?? 0) > 0 || p.stagedRockets.contains { $0.rocketId == "prospector" }),
            PathNode(title: "Your own instrument", detail: "Launch a telescope or imager and classify real data.", entryId: "instrument:transit", done: done("instrument:transit") || done("instrument:deep-space") || done("instrument:saturn")),
            PathNode(title: "Astronaut Academy", detail: "Research and build the Academy, then train a crew.", entryId: "structure:astronaut-academy", done: p.placed.contains("astronaut-academy")),
            PathNode(title: "Crewed prospecting", detail: "Fly a trained specialist to Eros for a frontier bonus.", entryId: "mission:freeops-crewed-prospecting", done: p.completedMissions.contains { $0.id == "freeops-crewed-prospecting" }),
            PathNode(title: "Off-world builds", detail: "Settlement, remote silo, then a refinery near the ore.", entryId: "mission:program-build-mars-mining-settlement",
                     done: Set(ConstructionMissions.records(p).map(\.structureKind)).isSuperset(of: ["mining-settlement", "mineral-silo"])),
        ]
    }

    // MARK: missions

    static func category(_ m: Mission) -> ArchiveEntry.Category {
        if m.id.hasPrefix("story-") && m.payload != nil { return .instruments }
        if m.tag == "TRANSPORT" { return .transport }
        if m.tag == "CREW" { return .crew }
        if m.isOwnProgram { return .program }
        if m.sequence <= MissionGenerator.onboardingSequenceCount { return .guided }
        return .contracts
    }

    /// The rocket that can fly this mission and what stands between the player and it.
    static func rocketRequirement(_ m: Mission, _ p: Player) -> ArchiveRequirement {
        let fits = Rockets.models.filter { !$0.locked && Rockets.compatible($0, with: m) }
        if m.requires.cargoMin == 0 && m.requires.minerals.isEmpty { return req("Rocket", "Any rocket; no cargo needed", true) }
        guard let first = fits.first else { return req("Rocket", "No current rocket carries \(m.requires.cargoMin) cargo with a tier \(m.requires.drillTier) laser", false) }
        if let ready = fits.first(where: { $0.missionsRequired <= p.missionsDone }) {
            return req("Rocket", "\(ready.name) can fly it (cargo \(ready.cargo), laser tier \(ready.drillTier), reach orbit \(ready.maxOrbit))", true)
        }
        return req("Rocket", "Needs the \(first.name): complete \(first.missionsRequired) contract\(first.missionsRequired == 1 ? "" : "s") first, then buy it for \(f(first.costFrancs))", false)
    }

    static func missionSteps(_ m: Mission, _ catalog: Catalog) -> [String] {
        var s: [String] = []
        let launchpad = m.isOwnProgram ? "Launchpad" : "Launchpad → Mission board"
        if m.id == AuthoredMissions.academyStoryId {
            return ["Build the Astronaut Academy at Base once it is researched.", "Fund its first day-long session in the Academy.", "Collect the finished session to graduate your first named astronaut."]
        }
        s.append("Open \(launchpad) and take “\(m.title)”.")
        if let plan = m.construction {
            s.append("Keep \(list(plan.requiredMaterials)) in storage (mine or buy it; the kit leaves your stash on delivery).")
            s.append("Choose a destination and rocket in launch review, then launch.")
            s.append("The kit is delivered on arrival and the \(plan.structureKind.replacingOccurrences(of: "-", with: " ")) starts its \(plan.buildTimeMs / 60_000) minute build.")
            return s
        }
        if m.payload != nil {
            s.append("Pick the orbit lane in launch review and launch.")
            s.append("On arrival the instrument comes online; its daily feed opens in the Control Station.")
            return s
        }
        let target = m.targetId.flatMap(catalog.target)?.name
        s.append(target.map { "Pick \($0) in launch review." } ?? "Pick a reachable target in launch review (orbit \(m.requires.maxOrbit) or closer).")
        s.append("Buy or roll out a rocket that carries \(m.requires.cargoMin) cargo, then launch.")
        if let c = m.requires.crew { s.append("Have a fit \(c.branch) specialist (tier \(c.minTier), level \(c.minLevel)) on your roster.") }
        if !m.requires.minerals.isEmpty { s.append("Mine \(list(m.requires.minerals)) with the rover laser.") }
        if let d = m.deliveryTargetId.flatMap(catalog.target)?.name { s.append("Fly the cargo on to \(d) and unload it, then fly home.") }
        else { s.append("Fly home, unload at Base and collect your payout at debrief.") }
        return s
    }

    static func missions(_ catalog: Catalog, _ p: Player, _ now: Double) -> [ArchiveEntry] {
        let doneIds = Set(p.completedMissions.map(\.id))
        return catalog.missions.map { m in
            let gate = MissionBoard.gate(m, player: p, now: now)
            let completed = gate == "Completed" || (m.isOwnProgram && m.construction == nil && m.payload == nil && doneIds.contains(m.id) && m.tag == "STORY")
            let status: ArchiveEntry.Status = completed ? .done : (gate == nil ? .available : .locked)
            var reqs: [ArchiveRequirement] = []
            let unlockText: String = {
                if p.freeOperations || m.sequence <= p.missionsDone + 1 && !m.isOwnProgram { return gate == nil || completed ? "Open to you now" : (gate ?? "") }
                return m.unlockAt ?? gate ?? "Keep playing"
            }()
            reqs.append(req("Unlock", gate == nil || completed ? "Open to you now" : (gate ?? unlockText), gate == nil || completed))
            if let c = m.requires.crew { let st = MissionBoard.crewStatus(c, crew: p.crew); reqs.append(req("Crew", st.reason, st.met)) }
            if let plan = m.construction {
                for (id, n) in plan.requiredMaterials.sorted(by: { $0.key < $1.key }) {
                    reqs.append(req(name(id), "\(p.stash[id] ?? 0) of \(n) in storage", (p.stash[id] ?? 0) >= n))
                }
            } else if m.payload == nil && m.requires.cargoMin > 0 {
                reqs.append(rocketRequirement(m, p))
                let maxTier = m.requires.minerals.keys.compactMap { Minerals.byId[$0]?.laserAccess }.max() ?? 1
                reqs.append(req("Laser", "Tier \(max(maxTier, m.requires.drillTier)) laser to cut \(list(m.requires.minerals))", Rockets.models.contains { !$0.locked && $0.missionsRequired <= p.missionsDone && $0.drillTier >= max(maxTier, m.requires.drillTier) }))
            }
            let rewards: [String] = {
                var r: [String] = []
                if m.payout.francs > 0 { r.append("Payout \(f(m.payout.francs))") }
                if m.payout.affinity > 0 { r.append("+\(m.payout.affinity) client standing") }
                if let o = m.programReward?.outcome { r.append(o) }
                if r.isEmpty { r.append("You keep the haul and sell it at market") }
                return r
            }()
            let who = m.client.flatMap { Clients.byId[$0]?.name } ?? "Your programme"
            return ArchiveEntry(id: "mission:\(m.id)", category: category(m), title: m.title, subtitle: "\(who) · \(m.difficulty)",
                                summary: m.brief, status: status, requirements: reqs, steps: missionSteps(m, catalog), rewards: rewards, missionId: m.id)
        }
    }

    // MARK: spacecraft

    static func spacecraft(_ p: Player) -> [ArchiveEntry] {
        var out: [ArchiveEntry] = Rockets.models.map { r in
            let reachable = !r.locked && r.missionsRequired <= p.missionsDone
            var reqs: [ArchiveRequirement] = []
            if r.locked { reqs.append(req("Announcement", r.unlockHint, false)) }
            else {
                reqs.append(req("Experience", r.missionsRequired == 0 ? "Available from the start" : "Complete \(r.missionsRequired) contract\(r.missionsRequired == 1 ? "" : "s") (you have \(p.missionsDone))", p.missionsDone >= r.missionsRequired))
                if r.costFrancs > 0 { reqs.append(req("Price", "\(f(r.costFrancs)) (you have \(f(p.francs)))", p.francs >= r.costFrancs)) }
            }
            return ArchiveEntry(id: "rocket:\(r.id)", category: .spacecraft, title: r.name, subtitle: "Rocket · tier \(r.tier)",
                                summary: r.locked ? "Not announced yet." : "Carries \(r.cargo) cargo, reaches orbit \(r.maxOrbit), tier \(r.drillTier) laser.",
                                status: r.locked ? .locked : (reachable ? .available : .locked), requirements: reqs,
                                steps: r.locked ? ["Nothing to do yet. Watch for its announcement."] :
                                    ["Take a contract that needs this much cargo or reach.", "In launch review, buy or roll out the \(r.name).", "Launch; each flight uses one vehicle."],
                                rewards: ["Flies contracts up to \(r.cargo) cargo and orbit \(r.maxOrbit)"], missionId: nil)
        }
        let parts = PartCatalog.standard
        func part(_ x: Part, _ kind: String) -> ArchiveEntry {
            let need = x.missionsRequired ?? 0
            let ok = !x.locked && p.missionsDone >= need
            return ArchiveEntry(id: "part:\(x.id)", category: .spacecraft, title: x.name, subtitle: "\(kind) · tier \(x.tier)",
                                summary: "A \(kind.lowercased()) for custom builds.", status: ok ? .available : .locked,
                                requirements: [req("Experience", need == 0 ? "Available from the start" : "Complete \(need) contract\(need == 1 ? "" : "s") (you have \(p.missionsDone))", p.missionsDone >= need)]
                                    + (x.locked ? [req("Release", "Not released to players yet", false)] : []),
                                steps: ["Unlock it by completing contracts.", "Fit it in the Hangar when you customise a ship (Ship Customizer skill)."], rewards: [], missionId: nil)
        }
        out += parts.chassis.map { part($0, "Hull") } + parts.propulsion.map { part($0, "Propulsion") } + parts.drill.map { part($0, "Laser") }
        return out
    }

    // MARK: structures

    static func structures(_ p: Player) -> [ArchiveEntry] {
        Construction.all.map { b in
            let built = p.placed.contains(b.id)
            let open = Construction.unlocked(b, player: p)
            var reqs: [ArchiveRequirement] = [req("Unlock", b.unlocksAt, open || built)]
            if b.cost > 0 { reqs.append(req("Price", "\(f(b.cost)) (you have \(f(p.francs)))", p.francs >= b.cost || built)) }
            for (id, n) in b.materials.sorted(by: { $0.key < $1.key }) { reqs.append(req(name(id), "\(p.stash[id] ?? 0) of \(n) in storage", (p.stash[id] ?? 0) >= n || built)) }
            return ArchiveEntry(id: "structure:\(b.id)", category: .structures, title: b.name, subtitle: "Base structure", summary: b.summary,
                                status: built ? .done : (open ? .available : .locked), requirements: reqs,
                                steps: b.id == "astronaut-academy"
                                    ? ["Reach client level 2 with two clients.", "Research the Academy with your research points.", "Place it on a free plot in Build."]
                                    : ["Meet the unlock condition above.", "Open Build, pick the structure, then a free plot.", "Wait for construction to finish."],
                                rewards: [b.summary], missionId: nil)
        }
    }

    // MARK: instruments

    static func instruments(_ p: Player) -> [ArchiveEntry] {
        func inst(_ id: String, _ title: String, _ summary: String, launched: Bool, feed: String, mission: String) -> ArchiveEntry {
            ArchiveEntry(id: "instrument:\(id)", category: .instruments, title: title, subtitle: "Own instrument", summary: summary,
                         status: launched ? .done : (p.freeOperations ? .available : .locked),
                         requirements: [req("Free Operations", p.freeOperations ? "Unlocked" : "Finish the guided contracts and build a Surface Silo", p.freeOperations)],
                         steps: ["Open Launchpad and plan the “\(title)” launch.", "Launch; the instrument comes online on arrival.", feed],
                         rewards: ["Daily instrument feed for citizen-science classification"], missionId: mission)
        }
        return [
            inst("transit", "Transit Telescope", "A TESS-class telescope in Earth orbit. Classify real light curves for exoplanet transits.",
                 launched: p.transitSatelliteLaunchedAt != nil, feed: "Open the Control Station and classify a transit candidate.", mission: Instruments.transitMissionId),
            inst("deep-space", "Deep Space Telescope", "A survey instrument that opens asteroid-discovery classification from the Minor Planet Center feed.",
                 launched: p.deepSpaceTelescopeLaunchedAt != nil || p.deepSpaceTelescopeBuilt, feed: "Open the Control Station and review a new asteroid candidate.", mission: Instruments.deepSpaceMissionId),
            inst("saturn", "Saturn Imager", "Downlinks archived Cassini frames for storm-cloud review.",
                 launched: p.saturnImagerLaunchedAt != nil, feed: "Open the Control Station and mark storm clouds in a frame.", mission: Instruments.saturnMissionId),
        ]
    }

    // MARK: Space Week

    static func spaceWeek(_ p: Player, _ now: Double) -> [ArchiveEntry] {
        let fmt = DateFormatter(); fmt.dateFormat = "d MMM"; fmt.timeZone = TimeZone(identifier: "UTC")
        func day(_ ms: Double) -> String { fmt.string(from: Date(timeIntervalSince1970: ms / 1000)) }
        return SkyEvents.all.map { e in
            let badge = p.badges[e.id]
            let live = now >= e.startMs && now < e.endMs
            let status: ArchiveEntry.Status = badge != nil ? .done : (now < e.startMs ? .upcoming : (live ? .live : .ended))
            let activity = e.activities.first ?? .launch
            var reqs: [ArchiveRequirement] = [req("Window", "\(day(e.startMs)) to \(day(e.endMs - 86_400_000)) (UTC). Gold during the window, silver after.", now >= e.startMs)]
            let (summary, steps): (String, [String])
            switch activity {
            case .launch:
                summary = "Launch a rocket during Space Week."
                steps = ["Take any contract or own operation.", "Launch from the Launchpad.", "Your badge is awarded at lift-off."]
            case .saturnClassification:
                reqs.append(req("Saturn Imager", p.saturnImagerLaunchedAt != nil ? "Launched" : "Launch the Saturn Imager from the Launchpad first", p.saturnImagerLaunchedAt != nil))
                summary = "Classify a real Cassini frame of Saturn."
                steps = ["Launch the Saturn Imager (Free Operations).", "Open the Control Station → Saturn Imager.", "Mark storm clouds and submit a verdict."]
            case .asteroidClassification:
                reqs.append(req("Deep Space Telescope", (p.deepSpaceTelescopeLaunchedAt != nil || p.deepSpaceTelescopeBuilt) ? "Launched" : "Launch the Deep Space Telescope first", p.deepSpaceTelescopeLaunchedAt != nil || p.deepSpaceTelescopeBuilt))
                summary = "Review a new asteroid candidate on the new-moon night."
                steps = ["Launch the Deep Space Telescope (Free Operations).", "Open the Control Station → Deep Space Telescope.", "Classify a candidate and submit your verdict."]
            case .debrisMining:
                summary = "Mine meteor-shower debris while the shower is active."
                steps = ["Fly any mining contract during the window.", "In the field, collect the glowing debris chunks.", "The first chunk earns the badge."]
            }
            return ArchiveEntry(id: "event:\(e.id)", category: .spaceWeek, title: e.name, subtitle: "\(day(e.startMs)) – \(day(e.endMs - 86_400_000))",
                                summary: summary, status: status, requirements: reqs, steps: steps,
                                rewards: [badge.map { "\($0.tier.rawValue.capitalized) badge earned" } ?? "Gold badge in the window, silver after"], missionId: nil)
        }
    }
}
