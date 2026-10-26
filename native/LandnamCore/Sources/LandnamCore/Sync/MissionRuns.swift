import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// PocketBase `mission_runs` lifecycle receipts, mirroring web useGameLoop / useEconomyActions / useAuthSync.
/// Ops are derived from state transitions (old -> new), so every path that starts, advances or ends a run
/// writes the same receipt shape as web: create on launch, phase/cargo updates, close on settle or abandon.
/// Run ids are minted on the client (15 lowercase alphanumerics) so an offline replay never duplicates a run.
public enum MissionRuns {
    public static let runIdKey = "missionRunId"

    public static func runId(_ p: Player) -> String? { if case .string(let id)? = p.extras[runIdKey] { return id } else { return nil } }
    public static func setRunId(_ p: inout Player, _ id: String?) { p.extras[runIdKey] = id.map { .string($0) } }

    public static func iso(_ ms: Double) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.string(from: Date(timeIntervalSince1970: ms / 1000))
    }

    static func cargoJSON(_ c: Cargo?) -> JSONValue { .object((c ?? [:]).mapValues { .number(Double($0)) }) }

    /// Mints the run id when a mission becomes active without one (the launch).
    public static func stamp(old: GameState, new: inout GameState, mint: () -> String = OutboxPolicy.newRecordId) {
        if new.player.activeMission != nil, old.player.activeMission == nil, runId(new.player) == nil {
            setRunId(&new.player, mint())
        }
        if new.player.activeMission == nil, runId(new.player) != nil { setRunId(&new.player, nil) }
    }

    /// Receipt writes for one transition. `payout` is the francs the settle paid (debrief ledger).
    public static func ops(old: GameState, new: GameState, userId: String, now: Double, payout: Int? = nil) -> [OutboxOp] {
        let oldId = runId(old.player), newId = runId(new.player)
        var out: [OutboxOp] = []
        if let oldId, oldId != newId {
            let completed = new.player.missionsDone > old.player.missionsDone || old.screen == .debrief || old.player.missionPhase == .debrief
            var data: [String: JSONValue] = ["status": .string(completed ? "completed" : "abandoned"),
                                             "phase": .string(completed ? "debrief" : (old.player.missionPhase ?? .transit).rawValue),
                                             "completed_at": .string(iso(now))]
            if completed {
                data["cargo"] = cargoJSON(old.deliveredCargo ?? old.lastCargo)
                data["payout_francs"] = .number(Double(payout ?? max(0, new.player.francs - old.player.francs)))
            }
            out.append(.update(collection: "mission_runs", id: oldId, data: data))
        }
        if let newId, newId != oldId, let mission = new.player.activeMission {
            out.append(.create(collection: "mission_runs", id: newId, data: [
                "user": .string(userId), "mission_id": .string(new.missionId ?? mission.id),
                "target_id": new.targetId.map { .string($0) } ?? .null,
                "status": .string("in_progress"), "phase": .string((new.player.missionPhase ?? .transit).rawValue),
                "cargo": .object([:]), "launched_at": .string(iso(new.player.transitStartedAt ?? now)),
            ]))
        } else if let newId, newId == oldId {
            var data: [String: JSONValue] = [:]
            if new.player.missionPhase != old.player.missionPhase, let ph = new.player.missionPhase { data["phase"] = .string(ph.rawValue) }
            if new.lastCargo != old.lastCargo { data["cargo"] = cargoJSON(new.lastCargo) }
            if !data.isEmpty { data["status"] = .string("in_progress"); out.append(.update(collection: "mission_runs", id: newId, data: data)) }
        }
        return out
    }

    public struct Record: Equatable, Sendable {
        public var id: String, missionId: String?, targetId: String?, phase: String?, launchedAt: String?
        public init(id: String, missionId: String?, targetId: String?, phase: String?, launchedAt: String?) {
            self.id = id; self.missionId = missionId; self.targetId = targetId; self.phase = phase; self.launchedAt = launchedAt
        }
    }

    /// Sign-in repair for `in_progress` receipts (SSL-553 stuck-run fix, web restoreInProgressRun):
    /// the save's own run stays; a resumable receipt is reattached when the save has no run; anything else is closed.
    public static func repair(_ runs: [Record], state: GameState, catalog: Catalog, now: Double) -> (state: GameState, ops: [OutboxOp]) {
        var s = state, ops: [OutboxOp] = []
        let mine = runId(state.player)
        for run in runs where run.id != mine {
            let mission = catalog.mission(run.missionId)
            let resumable = mission != nil && catalog.target(run.targetId) != nil
            if resumable, s.player.activeMission == nil, let mission {
                s.missionId = mission.id; s.targetId = run.targetId
                s.player.activeMission = ActiveMission(id: mission.id, label: mission.title)
                s.player.missionPhase = run.phase.flatMap(MissionPhase.init(rawValue:)) ?? .transit
                setRunId(&s.player, run.id)
                continue
            }
            ops.append(.update(collection: "mission_runs", id: run.id, data: [
                "status": .string("abandoned"), "completed_at": .string(iso(now))]))
        }
        return (s, ops)
    }

    public static func decodeList(_ data: Data) -> [Record]? {
        guard case .object(let root)? = try? JSONDecoder().decode(JSONValue.self, from: data), case .array(let items)? = root["items"] else { return nil }
        return items.compactMap { item in
            guard case .object(let o) = item, case .string(let id)? = o["id"] else { return nil }
            func str(_ k: String) -> String? { if case .string(let v)? = o[k], !v.isEmpty { return v }; return nil }
            return Record(id: id, missionId: str("mission_id"), targetId: str("target_id"), phase: str("phase"), launchedAt: str("launched_at"))
        }
    }
}

/// Conflict rule for `game_states`, ported from web `mergeRemoteState`:
/// the side further along (missionsDone) wins; on a tie the newer `updatedAt` wins per field,
/// but francs/XP/stash/refined goods/contracts never shrink (per-field max), structures and plots union,
/// building levels take the max, classifications/badges union, and an in-flight run is never erased.
public enum CloudMerge {
    static func maxRec(_ a: [String: Int], _ b: [String: Int]) -> [String: Int] { a.merging(b) { max($0, $1) } }

    public static func merge(local: GameState, remote: GameState) -> GameState {
        if !CloudPull.hasProgress(remote) && Ledger.untouched(remote) { return local }
        if !CloudPull.hasProgress(local) && Ledger.untouched(local) { return remote }
        var n: GameState
        // SSL-559: with the ledger on both sides no side wins wholesale; everything goes field by field.
        let both = Ledger.get(local) != nil && Ledger.get(remote) != nil
        if !both && local.player.missionsDone > remote.player.missionsDone {
            n = local
        } else if !both && remote.player.missionsDone > local.player.missionsDone {
            n = CloudPull.reconcile(remote: remote, keeping: local)
        } else {
            let remoteNewer = (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)
            n = remoteNewer ? CloudPull.reconcile(remote: remote, keeping: local) : local
            let l = local.player, r = remote.player
            n.player.francs = max(l.francs, r.francs)
            n.player.researchXP = max(l.researchXP, r.researchXP)
            n.player.researchAnnotations = max(l.researchAnnotations, r.researchAnnotations)
            n.player.stash = maxRec(l.stash, r.stash)
            n.player.refinedGoods = maxRec(l.refinedGoods, r.refinedGoods)
            n.player.clientMissions = maxRec(l.clientMissions, r.clientMissions)
            n.tutorial = local.tutorial; n.doneSteps = local.doneSteps
        }
        let l = local.player, r = remote.player
        n.player.placed = l.placed + r.placed.filter { !l.placed.contains($0) }
        n.player.placementPlots = r.placementPlots.merging(l.placementPlots) { _, mine in mine }
        n.player.buildingLevels = maxRec(l.buildingLevels, r.buildingLevels)
        n.player.launchpadUpgraded = l.launchpadUpgraded || r.launchpadUpgraded
        n.player.discoveredExoplanetTargets = r.discoveredExoplanetTargets.merging(l.discoveredExoplanetTargets) { _, mine in mine }
        n.player.tessClassifications = r.tessClassifications.merging(l.tessClassifications) { _, mine in mine }
        n.player.asteroidClassifications = r.asteroidClassifications.merging(l.asteroidClassifications) { _, mine in mine }
        // Research stamps are a log, so two devices keep both.
        n.player.researchStamps = ResearchStampRules.merge(l.researchStamps, r.researchStamps)
        n.player.researchUniversalFragments = max(l.researchUniversalFragments, r.researchUniversalFragments)
        n.player.researchFragments = max(l.researchFragments, r.researchFragments)
        n.player.researchFragmentHistory = ResearchFragments.mergeHistory(l.researchFragmentHistory, r.researchFragmentHistory)
        n.player.saturnClassifications = r.saturnClassifications.merging(l.saturnClassifications) { _, mine in mine }
        // Run resumability: keep a local in-flight run unless the remote stage moved past it; adopt a remote run when local has none.
        if l.activeMission != nil, both || r.missionsDone <= l.missionsDone {
            n.player.activeMission = l.activeMission; n.player.missionPhase = l.missionPhase
            n.player.transitStartedAt = l.transitStartedAt; n.player.arrivalAt = l.arrivalAt
            n.player.returningToEarth = l.returningToEarth; n.player.debriefPending = l.debriefPending
            n.player.homeDeliveryPending = l.homeDeliveryPending
            MissionRuns.setRunId(&n.player, MissionRuns.runId(l))
            n.missionId = local.missionId; n.targetId = local.targetId; n.lastCargo = local.lastCargo; n.deliveredCargo = local.deliveredCargo
            n.deliveryTargetId = local.deliveryTargetId
        } else if l.activeMission == nil, r.activeMission != nil, r.missionsDone >= l.missionsDone {
            n.player.activeMission = r.activeMission; n.player.missionPhase = r.missionPhase
            n.player.transitStartedAt = r.transitStartedAt; n.player.arrivalAt = r.arrivalAt
            n.player.returningToEarth = r.returningToEarth; n.player.debriefPending = r.debriefPending
            MissionRuns.setRunId(&n.player, MissionRuns.runId(r))
            n.missionId = remote.missionId; n.targetId = remote.targetId; n.lastCargo = remote.lastCargo; n.deliveredCargo = remote.deliveredCargo
            n.deliveryTargetId = remote.deliveryTargetId
        }
        n.screen = local.screen
        n.updatedAt = max(local.updatedAt ?? 0, remote.updatedAt ?? 0)
        return Ledger.apply(n, local: local, remote: remote)
    }
}

extension MissionRuns {
    /// Reads the account's open receipts (`status = "in_progress"`); nil when offline or failing.
    public static func fetchOpen(baseURL: URL, token: String, userId: String, session: URLSession = .shared) async -> [Record]? {
        if PocketBaseExecutor.forceOffline { return nil }
        var comps = URLComponents(url: baseURL.appendingPathComponent("api/collections/mission_runs/records"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [.init(name: "filter", value: "user = \"\(userId)\" && status = \"in_progress\""),
                            .init(name: "sort", value: "-launched_at"), .init(name: "perPage", value: "50")]
        var req = URLRequest(url: comps.url!)
        req.setValue(token, forHTTPHeaderField: "Authorization")
        req.timeoutInterval = 15
        guard let (data, resp) = try? await session.data(for: req), let http = resp as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else { return nil }
        return decodeList(data)
    }

    /// Shared-backend `mission_log` entry written when a run completes (web onDebriefDone).
    public static func logOp(old: GameState, new: GameState, sharedUserId: String, payout: Int?, now: Double) -> OutboxOp? {
        guard runId(old.player) != nil, runId(new.player) == nil, new.player.missionsDone > old.player.missionsDone else { return nil }
        return .create(collection: "mission_log", id: OutboxPolicy.newRecordId(), data: [
            "user": .string(sharedUserId), "mission_id": old.missionId.map { .string($0) } ?? .null,
            "target_id": old.targetId.map { .string($0) } ?? .null,
            "payout_francs": .number(Double(payout ?? max(0, new.player.francs - old.player.francs))),
            "minerals_delivered": cargoJSON(old.deliveredCargo ?? old.lastCargo),
            "missions_done_after": .number(Double(new.player.missionsDone)), "completed_at": .string(iso(now)),
        ])
    }
}
