import Foundation

/// Static game content the loop reads. The web client fetches this from
/// PocketBase and falls back to the offline generator; native starts from the
/// generator and will accept a remote catalog the same way.
public struct Catalog: Sendable {
    public var missions: [Mission]
    public var targets: [Target]
    public var parts: PartCatalog

    public init(missions: [Mission] = MissionGenerator.fullBoard(), targets: [Target] = Targets.all, parts: PartCatalog = .standard) {
        self.missions = missions; self.targets = targets; self.parts = parts
    }

    public func mission(_ id: String?) -> Mission? { id.flatMap { id in missions.first { $0.id == id } } }
    public func target(_ id: String?) -> Target? { id.flatMap { id in targets.first { $0.id == id } } }
}

/// Mission-loop actions as pure `(state, catalog) -> state` functions, mirroring
/// `useGameLoop.ts`. `GameStore` wraps these with persistence and observation.
public enum Loop {
    // MARK: pick mission / target

    static func stagedRocket(_ s: GameState, missionId: String, targetId: String) -> StagedRocket? {
        s.player.stagedRockets.first { $0.missionId == missionId && $0.targetId == targetId }
    }

    public static func pickMission(_ s: GameState, id: String, catalog: Catalog, haul: HaulDisposition? = nil) -> GameState {
        guard s.screen == .missions || s.screen == .launchpad, let mission = catalog.mission(id) else { return s }
        if s.screen == .launchpad && !mission.isOwnProgram { return s }
        if s.screen == .missions && s.player.freeOperations && mission.isOwnProgram { return s }
        guard s.player.activeMission == nil else { return s }
        var base = s
        base.player.freeHaulDisposition = haul ?? s.player.freeHaulDisposition
        base.doneSteps["2"] = true
        guard let targetId = mission.targetId else {
            base.missionId = id
            base.targetId = nil
            base.deliveryTargetId = mission.deliveryTargetId
            base.screen = .targets
            return finishQuickSetup(base, catalog: catalog)
        }
        let target = catalog.target(targetId)
        let delivery = mission.deliveryTargetId.flatMap(catalog.target)
        let suggested = catalog.parts.suggestBuild(mission: mission, target: target, deliveryTarget: delivery,
                                                   missionsDone: s.player.missionsDone, launchpadUpgraded: s.player.launchpadUpgraded,
                                                   skills: s.player.unlockedSkillNodes)
        base.missionId = id
        base.targetId = targetId
        base.deliveryTargetId = mission.deliveryTargetId
        base.doneSteps["3"] = true
        if let staged = stagedRocket(s, missionId: id, targetId: targetId) {
            base.screen = .fab
            return Market.applySelectStaged(base, vehicle: staged)
        }
        base.rocket = suggested
        base.screen = .rocketBuy
        return finishQuickSetup(base, catalog: catalog)
    }

    public static func pickTarget(_ s: GameState, id: String, catalog: Catalog) -> GameState {
        guard s.screen == .targets, s.missionId != nil else { return s }
        return finishQuickSetup(pickTargetState(s, id: id, catalog: catalog), catalog: catalog)
    }

    static func pickTargetState(_ s: GameState, id: String, catalog: Catalog) -> GameState {
        guard let mission = catalog.mission(s.missionId), let target = catalog.target(id) else { return s }
        let feasible = Targets.feasible(for: mission, parts: catalog.parts, missionsDone: s.player.missionsDone,
                                        launchpadUpgraded: s.player.launchpadUpgraded, skills: s.player.unlockedSkillNodes)
        guard feasible.contains(where: { $0.id == id }) else { return s }
        let suggested = catalog.parts.suggestBuild(mission: mission, target: target, missionsDone: s.player.missionsDone,
                                                   launchpadUpgraded: s.player.launchpadUpgraded, skills: s.player.unlockedSkillNodes)
        // Switching target releases a free vehicle built for the old one.
        let freeIds = Set(Rockets.models.filter { $0.costFrancs == 0 }.map(\.id))
        var n = s
        n.player.stagedRockets.removeAll { $0.missionId == mission.id && $0.targetId != target.id && freeIds.contains($0.rocketId) }
        n.targetId = id
        n.doneSteps["3"] = true
        if let staged = stagedRocket(n, missionId: mission.id, targetId: target.id) {
            n.screen = .fab
            return Market.applySelectStaged(n, vehicle: staged)
        }
        n.rocket = suggested
        n.screen = .rocketBuy
        return n
    }

    /// Accept Contract lands on the launch review: the recommended target and a free
    /// rocket are chosen and rolled out to the pad; anything costing francs stops at the blueprint.
    public static func finishQuickSetup(_ s: GameState, catalog: Catalog) -> GameState {
        var n = s
        if n.screen == .targets, let mission = catalog.mission(n.missionId) {
            let feasible = Targets.feasible(for: mission, parts: catalog.parts, missionsDone: n.player.missionsDone,
                                            launchpadUpgraded: n.player.launchpadUpgraded, skills: n.player.unlockedSkillNodes)
            guard let pick = feasible.first(where: { $0.recommended == true }) ?? feasible.first else { return n }
            n = pickTargetState(n, id: pick.id, catalog: catalog)
        }
        guard n.screen == .rocketBuy, let mission = catalog.mission(n.missionId), let target = catalog.target(n.targetId) else { return n }
        let required = Rockets.models.filter { !$0.locked && $0.missionsRequired <= n.player.missionsDone }.max { $0.tier < $1.tier } ?? Rockets.models[0]
        let options = Rockets.models.filter { !$0.locked && $0.missionsRequired <= n.player.missionsDone }.filter {
            catalog.parts.validate(mission: mission, target: target, rocket: Rockets.config(for: $0), skills: n.player.unlockedSkillNodes).ok
        }
        guard let rocket = options.first(where: { $0.id == required.id }) ?? options.first,
              rocket.costFrancs == 0, Rockets.compatible(rocket, with: mission),
              Market.purchaseRefusal(n, rocket: rocket) == nil else { return n }
        return rollOutToPad(Market.applyPurchaseRocket(n, rocket: rocket)) ?? n
    }

    public static func rollOutToPad(_ s: GameState) -> GameState? {
        guard let id = s.player.selectedStagedRocketId, let index = s.player.stagedRockets.firstIndex(where: { $0.id == id }) else { return nil }
        var n = s
        n.doneSteps["8"] = true
        n.player.stagedRockets[index].location = .launchpad
        return Market.applySelectStaged(n, vehicle: n.player.stagedRockets[index])
    }

    public static func purchaseRocket(_ s: GameState, rocketId: String, catalog: Catalog) -> GameState {
        guard s.screen == .rocketBuy, let rocket = Rockets.model(id: rocketId), !rocket.locked,
              let mission = catalog.mission(s.missionId), Rockets.compatible(rocket, with: mission),
              Market.purchaseRefusal(s, rocket: rocket) == nil else { return s }
        var n = Market.applyPurchaseRocket(s, rocket: rocket)
        n.doneSteps["8"] = true
        return n
    }

    public static func transferToLaunchpad(_ s: GameState) -> GameState {
        guard s.screen == .fab, let id = s.player.selectedStagedRocketId,
              let vehicle = s.player.stagedRockets.first(where: { $0.id == id }), vehicle.location == .hangar else { return s }
        return rollOutToPad(s) ?? s
    }

    // MARK: launch

    public static func travelArrival(target: Target?, player: Player, now: Double) -> Double? {
        guard player.freeOperations, let target else { return nil }
        return now + Skills.travelDurationMs(orbit: target.orbit, skills: player.unlockedSkillNodes, msPerOrbit: Economy.orbitMsPerUnit)
    }

    public static func launch(_ s: GameState, catalog: Catalog, now: Double) -> GameState {
        guard s.screen == .fab, s.player.activeMission == nil,
              let missionId = s.missionId, let targetId = s.targetId,
              let selectedId = s.player.selectedStagedRocketId,
              let vehicle = s.player.stagedRockets.first(where: { $0.id == selectedId }), vehicle.location == .launchpad,
              let mission = catalog.mission(missionId), let target = catalog.target(targetId) else { return s }
        var n = s
        let remaining = s.player.stagedRockets.filter { $0.id != vehicle.id }
        let next = remaining.first
        n.player.pendingLaunch = !remaining.isEmpty
        n.player.pendingRocketId = next?.rocketId
        n.player.pendingRocketLocation = next?.location
        n.player.pendingRocketSource = next?.source
        n.player.missionRocketSource = vehicle.source
        n.player.stagedRockets = remaining
        n.player.selectedStagedRocketId = next?.id
        n.player.arrivalAt = travelArrival(target: target, player: s.player, now: now)
        n.player.transitStartedAt = now
        n.player.missionPhase = .transit
        n.player.activeMission = ActiveMission(id: mission.id, label: "\(mission.title) → \(target.name)")
        n.screen = .transit
        n.doneSteps["5"] = true
        return n
    }

    // MARK: transit arrival

    public static func transitArrived(_ s: GameState, catalog: Catalog, now: Double) -> GameState {
        guard s.screen == .transit else { return s }
        if s.player.returningToEarth { return Transitions.applyReturnArrived(s) }
        if s.player.headingToDelivery { return Transitions.applyDeliveryArrived(s, now: now) }
        var n = s
        n.player.missionPhase = .mining
        n.screen = catalog.mission(s.missionId)?.requires.drillTier == 0 ? .roverMining : .mining
        return n
    }

    public static func miningDone(_ s: GameState, cargo: Cargo, catalog: Catalog, now: Double) -> GameState {
        let nextLeg = s.deliveryTargetId != nil ? catalog.target(s.deliveryTargetId) : catalog.target(s.targetId)
        let arrival = travelArrival(target: nextLeg, player: s.player, now: now)
        return Transitions.applyMiningDone(s, cargo: cargo, arrivalAt: arrival, transitStartedAt: s.player.freeOperations ? now : nil, now: now)
    }

    public static func deliveryUnloadComplete(_ s: GameState, catalog: Catalog, now: Double) -> GameState {
        let arrival = travelArrival(target: catalog.target(s.targetId), player: s.player, now: now)
        return Transitions.applyDeliveryUnloadComplete(s, arrivalAt: arrival, now: now)
    }

    // MARK: debrief

    /// Settle a finished contract. `payout` is the figure the Debrief screen showed
    /// (already through the onboarding floor), so the ledger and screen agree.
    public static func debriefDone(_ s: GameState, payout rawTotal: Int, affinity: Int, consumed: Cargo = [:],
                                   disposition: HaulDisposition? = nil, catalog: Catalog, now: Double) -> GameState {
        guard s.screen == .debrief, let missionId = s.missionId, s.targetId != nil, let cargo = s.lastCargo else { return s }
        let mission = catalog.mission(missionId)
        var n = s
        let isFreeHaul = mission.map { $0.isOwnProgram && $0.deliveryTargetId == nil && $0.construction == nil } ?? false
            && cargo.values.contains { $0 > 0 }
        if isFreeHaul && !s.player.cargoSettledOffworld {
            let effective = disposition ?? s.player.freeHaulDisposition ?? (Market.earthStorageBuilt(s.player) ? .store : .sell)
            n = Market.applyFreeHaulDisposition(n, haul: cargo, disposition: effective, now: now)
            n.player.freeHaulDisposition = nil
        }
        let total = isFreeHaul && !s.player.cargoSettledOffworld ? 0 : rawTotal
        let consume = isFreeHaul && !s.player.cargoSettledOffworld ? [:] : consumed
        let missionsDone = n.player.missionsDone + 1
        let isStory = mission?.tag == "STORY" && mission?.deliveryTargetId == nil
        let program = mission?.isOwnProgram ?? false
        if let client = mission?.client, !isStory { n.player.clientMissions[client, default: 0] += max(1, affinity) }
        if mission?.deliveryTargetId == nil {
            for (id, amount) in consume {
                let left = (n.player.stash[id] ?? 0) - amount
                n.player.stash[id] = left > 0 ? left : nil
            }
        }
        n.player.francs += total
        if let target = n.targetId, !n.player.seenPlanets.contains(target) { n.player.seenPlanets.append(target) }
        let runId = n.player.missionRunId ?? "\(missionId):\(s.player.missionsDone)"
        let targetName = catalog.target(mission?.targetId ?? n.targetId)
        n.player.completedMissions.removeAll { $0.runId == runId }
        n.player.completedMissions.append(CompletedMissionRecord(
            id: mission?.id ?? missionId, title: mission?.title ?? n.player.activeMission?.label ?? missionId,
            targetId: targetName?.id, clientName: mission?.client.flatMap { Clients.byId[$0]?.name }, targetName: targetName?.name,
            completedAt: now, runId: runId, kind: program ? .program : .client))
        if n.player.completedMissions.count > 100 { n.player.completedMissions.removeFirst(n.player.completedMissions.count - 100) }
        n.player.flightPlan.complete("mining")
        let wasFreeOps = s.player.freeOperations
        n.player.missionsDone = missionsDone
        n.player.freeOperations = Transitions.freeOperationsUnlocked(n.player)
        let justFinishedOnboarding = !wasFreeOps && n.player.freeOperations
        let showLoan = !program && !n.player.loanOffered && n.player.francs < Economy.bankruptcyThreshold && n.player.loanDebt == 0
        n.popup = justFinishedOnboarding ? "tutorial-complete" : (showLoan ? "loan" : s.popup)
        n.player.loanOffered = n.player.loanOffered || showLoan
        n.player.missionCount = catalog.missions.filter { $0.sequence == missionsDone + 1 }.count
        if let client = mission?.client, !isStory, !program { n.player.lastClient = client }
        // Single-use vehicle is spent; clear the run.
        n.player.activeMission = nil
        n.player.missionRunId = nil
        n.player.missionPhase = nil
        n.player.debriefPending = false
        n.player.cargoSettledOffworld = false
        n.player.returningToEarth = false
        n.player.deliveryUnloadStartedAt = nil
        n.player.shipDestroyed = false
        n.player.missionRocketSource = nil
        n.lastCargo = nil
        n.deliveredCargo = nil
        n.missionId = nil
        n.targetId = nil
        n.deliveryTargetId = nil
        n.tutorial = !n.player.freeOperations
        n.doneSteps["9"] = true
        n.screen = program ? .launchpad : ((n.tutorial || justFinishedOnboarding) ? .hub : .market)
        return n
    }

    /// Abandon an in-flight run: the cargo stays lost and the hull is spent.
    public static func abandonMission(_ s: GameState) -> GameState {
        guard s.player.activeMission != nil else { return s }
        var n = s
        n.player.activeMission = nil
        n.player.missionRunId = nil
        n.player.missionPhase = nil
        n.player.arrivalAt = nil
        n.player.transitStartedAt = nil
        n.player.debriefPending = false
        n.player.returningToEarth = false
        n.player.headingToDelivery = false
        n.lastCargo = nil
        n.deliveredCargo = nil
        n.missionId = nil
        n.targetId = nil
        n.deliveryTargetId = nil
        n.screen = .hub
        return n
    }
}
