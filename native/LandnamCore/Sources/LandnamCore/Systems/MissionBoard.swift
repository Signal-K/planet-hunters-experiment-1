import Foundation

/// Which missions a player can see and start (port of web `useMissionRelayModels` + `mission-primers`).
/// One rule set feeds both the mission board and the archive, so they can never disagree.
public enum MissionBoard {
    public struct Entry: Identifiable, Equatable, Sendable {
        public var id: String { mission.id }
        public let mission: Mission
        public let unlocked: Bool
        /// Why a card is locked, in player words.
        public let lockedReason: String?
        public let feasibleTargets: Int
    }

    public struct CrewStatus: Equatable, Sendable { public let met: Bool; public let reason: String }

    /// In Free Ops the board lists client work; the player's own programme lives on the Launchpad.
    public static func isBoardMission(_ m: Mission, freeOps: Bool) -> Bool { !freeOps || !m.isOwnProgram }

    /// Guided missions offer at most two clients, picked to pay as evenly as possible (web `tutorialClientMissionOptions`).
    public static func tutorialOptions(_ missions: [Mission], sequence: Int) -> [Mission] {
        let candidates = missions.filter { $0.sequence == sequence && $0.client != nil }
        if candidates.count <= 2 { return candidates }
        var best: (Mission, Mission)?
        var bestScore = Double.infinity
        for i in 0..<(candidates.count - 1) {
            for j in (i + 1)..<candidates.count where candidates[i].client != candidates[j].client {
                let scale = Double(max(candidates[i].payout.francs, candidates[j].payout.francs, 1))
                let score = abs(Double(candidates[i].payout.francs - candidates[j].payout.francs)) / scale
                if score < bestScore { bestScore = score; best = (candidates[i], candidates[j]) }
            }
        }
        return best.map { [$0.0, $0.1] } ?? Array(candidates.prefix(2))
    }

    public static func crewStatus(_ req: CrewRequirement?, crew: [CrewMember]) -> CrewStatus {
        guard let req else { return CrewStatus(met: true, reason: "No crew needed") }
        let fit = crew.filter { $0.condition == .fit }
        let matches = fit.filter { m in
            (m.specialisations.first { $0.branch == req.branch }?.tier ?? 0) >= req.minTier && Academy.crewLevel(m) >= req.minLevel
        }
        let need = max(1, req.count ?? 1)
        let what = "\(req.branch) specialist, tier \(req.minTier), level \(req.minLevel)"
        if matches.count >= need { return CrewStatus(met: true, reason: "\(matches[0].name) qualifies (\(what))") }
        if crew.isEmpty { return CrewStatus(met: false, reason: "Hire and train a \(what)") }
        if fit.isEmpty { return CrewStatus(met: false, reason: "Your crew needs rest; a fit \(what) is required") }
        return CrewStatus(met: false, reason: "Train a \(what)")
    }

    /// Everything that must hold before this mission can be taken, beyond finding a reachable target.
    public static func gate(_ m: Mission, player p: Player, now: Double) -> String? {
        let freeOps = p.freeOperations
        if !freeOps {
            let seq = p.missionsDone + 1
            if m.sequence < seq { return "Completed" }
            if m.sequence > seq { return "Complete \(m.sequence - seq) more guided contract\(m.sequence - seq == 1 ? "" : "s")" }
        }
        switch m.id {
        case AuthoredMissions.academyStoryId:
            if p.placed.contains("astronaut-academy") && !p.crew.isEmpty { return "Completed" }
            if !Academy.affinityUnlocked(p) { return "Reach client level 2 with two clients" }
        case AuthoredMissions.refineryBuildId:
            if !ConstructionMissions.delivered(p, kind: "mining-settlement", now: now) || !ConstructionMissions.delivered(p, kind: "mineral-silo", now: now) {
                return "Deliver a mining settlement and a remote silo first"
            }
        case AuthoredMissions.crewedProspectingId:
            if !p.placed.contains("astronaut-academy") { return "Build the Astronaut Academy first" }
            let c = crewStatus(m.requires.crew, crew: p.crew)
            if !c.met { return c.reason }
        default: break
        }
        if let plan = m.construction {
            let short = plan.requiredMaterials.filter { (p.stash[$0.key] ?? 0) < $0.value }
            if !short.isEmpty {
                return "Needs " + short.sorted { $0.key < $1.key }.map { "\($0.value) \($0.key) (have \(p.stash[$0.key] ?? 0))" }.joined(separator: ", ") + " in storage"
            }
        }
        return nil
    }

    private static func entry(_ m: Mission, catalog: Catalog, player p: Player, now: Double) -> Entry {
        let targets = Targets.feasible(for: m, parts: catalog.parts, missionsDone: p.missionsDone,
                                       launchpadUpgraded: p.launchpadUpgraded, skills: p.unlockedSkillNodes).count
        var reason = gate(m, player: p, now: now)
        // Academy setup has no flight target; everything else needs somewhere reachable to fly.
        if reason == nil, targets == 0, m.id != AuthoredMissions.academyStoryId, m.targetId != nil || m.requires.maxOrbit > 0 {
            reason = "No reachable target with your current rocket parts"
        }
        return Entry(mission: m, unlocked: reason == nil, lockedReason: reason, feasibleTargets: targets)
    }

    /// Client work on the mission board. During the guided missions only this step's options show.
    public static func clientBoard(catalog: Catalog, player p: Player, now: Double) -> [Entry] {
        let freeOps = p.freeOperations
        let seq = p.missionsDone + 1
        var raw = catalog.missions.filter { m in
            isBoardMission(m, freeOps: freeOps) && (m.client.map { Clients.byId[$0] != nil } ?? false) && (freeOps || m.sequence == seq)
        }
        if !freeOps {
            let feasible = raw.filter { entry($0, catalog: catalog, player: p, now: now).feasibleTargets > 0 }
            let ids = Set(tutorialOptions(feasible, sequence: seq).map(\.id))
            raw = feasible.filter { ids.contains($0.id) }
        }
        return raw.map { entry($0, catalog: catalog, player: p, now: now) }
    }

    /// The player's own programme (Free Ops): self-directed runs, builds, story, instruments, surveys.
    public static func programBoard(catalog: Catalog, player p: Player, now: Double) -> [Entry] {
        guard p.freeOperations else { return [] }
        return catalog.missions.filter { $0.isOwnProgram }.map { entry($0, catalog: catalog, player: p, now: now) }
    }
}
