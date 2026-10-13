import Testing
import Foundation
@testable import LandnamCore

/// Drives launch -> mine -> fly home -> settle and records every receipt write.
@MainActor func playRun(_ store: GameStore, into ops: RunBox<[OutboxOp]>, user: String = "u1") {
    store.onTransition = { old, new, payout in
        ops.value += MissionRuns.ops(old: old, new: new, userId: user, now: 1_000, payout: payout)
    }
    store.go(.missions)
    let m = store.catalog.missions.first { $0.sequence == 1 }!
    store.pickMission(m.id)
    store.launch()
    store.transitArrived()
    if store.screen == .roverSurvey { store.roverSurveyComplete() }
    let need = store.mission?.requires.minerals ?? [:]
    store.miningDone(need.isEmpty ? ["nickel": 2] : need)
    if store.screen == .transit { store.transitArrived() }
    if store.player.homeDeliveryPending, let cargo = store.state.lastCargo {
        let mission = store.mission
        let demand = HomeDelivery.demand(mission, cargo: cargo)
        store.homeDelivery(HomeDelivery.defaultSplit(cargo, demand: demand, siloFree: 0))
    }
}

final class RunBox<T>: @unchecked Sendable { var value: T; init(_ v: T) { value = v } }

@MainActor @Suite struct MissionRunsTests {
    @Test func runLifecycleWritesCreatePhaseAndClose() {
        let store = GameStore()
        let ops = RunBox<[OutboxOp]>([])
        playRun(store, into: ops)
        guard case .create("mission_runs", let id, let data)? = ops.value.first else { Issue.record("no create: \(ops.value)"); return }
        #expect(data["status"] == JSONValue.string("in_progress"))
        #expect(data["user"] == JSONValue.string("u1"))
        let updates = ops.value.dropFirst().compactMap { op -> [String: JSONValue]? in
            if case .update("mission_runs", id, let d) = op { return d } else { return nil }
        }
        #expect(updates.contains { $0["cargo"] != nil })
        #expect(updates.last?["status"] == JSONValue.string("completed"))
        #expect(store.player.activeMission == nil)
        #expect(MissionRuns.runId(store.player) == nil)
    }

    @Test func abandonClosesTheRunAsAbandoned() {
        let store = GameStore()
        let ops = RunBox<[OutboxOp]>([])
        store.onTransition = { old, new, p in ops.value += MissionRuns.ops(old: old, new: new, userId: "u1", now: 1, payout: p) }
        store.go(.missions)
        store.pickMission(store.catalog.missions.first { $0.sequence == 1 }!.id)
        store.launch()
        store.abandonMission()
        guard case .update(_, _, let d)? = ops.value.last else { Issue.record("no close"); return }
        #expect(d["status"] == JSONValue.string("abandoned"))
    }

    @Test func repairClosesStuckRunsAndKeepsTheSavesOwnRun() {
        var gs = GameState()
        let cat = Catalog()
        let orphan = MissionRuns.Record(id: "orphan", missionId: "retired-mission", targetId: "nowhere", phase: "transit", launchedAt: nil)
        let r = MissionRuns.repair([orphan], state: gs, catalog: cat, now: 0)
        #expect(r.ops.count == 1)
        #expect(r.state.player.activeMission == nil)
        let m = cat.missions.first { $0.sequence == 1 }!
        let resumable = MissionRuns.Record(id: "live", missionId: m.id, targetId: m.targetId ?? cat.targets[0].id, phase: "mining", launchedAt: nil)
        let r2 = MissionRuns.repair([resumable], state: gs, catalog: cat, now: 0)
        #expect(r2.ops.isEmpty)
        #expect(MissionRuns.runId(r2.state.player) == "live")
        MissionRuns.setRunId(&gs.player, "live"); gs.player.activeMission = ActiveMission(id: m.id, label: "x")
        #expect(MissionRuns.repair([resumable], state: gs, catalog: cat, now: 0).ops.isEmpty)
    }

    @Test func tieMergeNeverLosesFrancsOrCargo() {
        var local = GameState(), remote = GameState()
        local.player.missionsDone = 2; remote.player.missionsDone = 2
        local.player.placed = ["launchpad"]; remote.player.placed = ["launchpad", "surface-silo"]
        local.player.francs = 900; remote.player.francs = 500
        local.player.stash = ["nickel": 4]; remote.player.stash = ["nickel": 1, "cobalt": 3]
        local.updatedAt = 1; remote.updatedAt = 2
        let n = CloudMerge.merge(local: local, remote: remote)
        #expect(n.player.francs == 900)
        #expect(n.player.stash == ["nickel": 4, "cobalt": 3])
        #expect(Set(n.player.placed) == ["launchpad", "surface-silo"])
        remote.player.missionsDone = 3; remote.player.francs = 100
        #expect(CloudMerge.merge(local: local, remote: remote).player.francs == 100)  // the stage ahead wins
    }

    @Test func offlineRunReplaysInOrderOnReconnect() async {
        let online = RunBox<Bool>(false)
        let sent = RunBox<[OutboxOp]>([])
        let outbox = Outbox(store: MemoryOutboxStore()) { op in
            if !online.value { return .offline }
            sent.value.append(op); return nil
        }
        let store = GameStore()
        let ops = RunBox<[OutboxOp]>([])
        playRun(store, into: ops)
        for op in ops.value { await outbox.enqueue(op) }
        await outbox.flush()
        #expect(sent.value.isEmpty)
        #expect(await outbox.snapshot().waiting == ops.value.count)
        online.value = true
        await outbox.flush()
        #expect(sent.value == ops.value)
        #expect(await outbox.snapshot().waiting == 0)
    }
}
