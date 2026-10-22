import Foundation

/// Static game content the loop reads. The web client fetches this from
/// PocketBase and falls back to the offline generator; native starts from the
/// generator and will accept a remote catalog the same way.
public struct Catalog: Sendable {
    public var missions: [Mission]
    public var targets: [Target]
    public var parts: PartCatalog

    public init(missions: [Mission] = MissionGenerator.everything(), targets: [Target] = Targets.all, parts: PartCatalog = .standard) {
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
        // Off-world builds carry the materials from the stash; no kit, no flight.
        if let plan = mission.construction, mission.isOwnProgram, plan.requiredMaterials.contains(where: { (s.player.stash[$0.key] ?? 0) < $0.value }) { return s }
        var base = s
        // SSL-651: the shower run's 20 fragments count from this accept.
        if id == OrionidsRun.missionId { OrionidsRun.start(&base.player) }
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
                                                   missionsDone: s.player.missionsDone, launchpadUpgraded: s.player.launchpadUpgraded, launchpadLevel: BuildingLevels.level(s.player, "launchpad"),
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

    /// Screens that show the one-screen launch review (the target and vehicle can be switched from any of them).
    public static let reviewScreens: Set<Screen> = [.targets, .rocketBuy, .fab, .launchpad]

    public static func pickTarget(_ s: GameState, id: String, catalog: Catalog) -> GameState {
        guard Self.reviewScreens.contains(s.screen), s.missionId != nil else { return s }
        return finishQuickSetup(pickTargetState(s, id: id, catalog: catalog), catalog: catalog)
    }

    static func pickTargetState(_ s: GameState, id: String, catalog: Catalog) -> GameState {
        guard let mission = catalog.mission(s.missionId), let target = catalog.target(id) else { return s }
        let feasible = Targets.feasible(for: mission, targets: catalog.targets, parts: catalog.parts, missionsDone: s.player.missionsDone,
                                        launchpadUpgraded: s.player.launchpadUpgraded, launchpadLevel: BuildingLevels.level(s.player, "launchpad"), skills: s.player.unlockedSkillNodes)
        guard feasible.contains(where: { $0.id == id }) else { return s }
        let suggested = catalog.parts.suggestBuild(mission: mission, target: target, missionsDone: s.player.missionsDone,
                                                   launchpadUpgraded: s.player.launchpadUpgraded, launchpadLevel: BuildingLevels.level(s.player, "launchpad"), skills: s.player.unlockedSkillNodes)
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
            let feasible = Targets.feasible(for: mission, targets: catalog.targets, parts: catalog.parts, missionsDone: n.player.missionsDone,
                                            launchpadUpgraded: n.player.launchpadUpgraded, launchpadLevel: BuildingLevels.level(n.player, "launchpad"), skills: n.player.unlockedSkillNodes)
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
        guard Self.reviewScreens.contains(s.screen) || s.screen == .hangar, let rocket = Rockets.model(id: rocketId), !rocket.locked,
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

    /// Dismantle an unlaunched vehicle while retaining its mission setup.
    public static func dismantleStagedRocket(_ s: GameState) -> GameState {
        guard s.player.activeMission == nil,
              let id = s.player.selectedStagedRocketId,
              s.player.stagedRockets.contains(where: { $0.id == id }) else { return s }
        var n = s
        n.player.stagedRockets.removeAll { $0.id == id }
        let next = n.player.stagedRockets.first
        n.player.pendingLaunch = !n.player.stagedRockets.isEmpty
        n.player.selectedStagedRocketId = next?.id
        n.player.pendingRocketId = next?.rocketId
        n.player.pendingRocketLocation = next?.location
        n.player.pendingRocketSource = next?.source
        return n
    }

    // MARK: launch

    public static func travelArrival(target: Target?, player: Player, now: Double) -> Double? {
        guard player.freeOperations, let target else { return nil }
        return now + Skills.travelDurationMs(orbit: target.orbit, skills: player.unlockedSkillNodes, msPerOrbit: Economy.orbitMsPerUnit)
    }

    public static func launch(_ s: GameState, catalog: Catalog, now: Double) -> GameState {
        guard s.screen == .fab || s.screen == .launchpad, s.player.activeMission == nil,
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
        // The ascent flies through the shower: fragments are home at once (web applyLaunchCatch, SSL-578).
        OrionidsRun.applyLaunchCatch(&n.player, at: now)
        n.screen = .transit
        n.doneSteps["5"] = true
        return n
    }

    // MARK: transit arrival

    /// Mirrors web `MissionOperationRoutes`: the rover scene is only for the starter-rover survey
    /// mission or the tutorial transport lesson; every other mission mines with the ship laser.
    public static func usesRoverScene(_ mission: Mission?, player: Player) -> Bool {
        Transitions.isStarterRoverMission(mission) || Transitions.isTutorialTransportLesson(mission, player: player)
    }

    public static func transitArrived(_ s: GameState, catalog: Catalog, now: Double) -> GameState {
        guard s.screen == .transit else { return s }
        if s.player.returningToEarth { return Transitions.applyReturnArrived(s) }
        if s.player.headingToDelivery { return Transitions.applyDeliveryArrived(s, now: now) }
        var n = s
        let mission = catalog.mission(s.missionId)
        if let plan = mission?.construction, mission?.isOwnProgram == true {
            // The kit is delivered on arrival: materials leave the stash, the site starts its build clock.
            n = ConstructionMissions.applyDelivery(n, plan: plan, targetId: s.targetId ?? mission?.targetId ?? "", now: now)
            n.player.missionPhase = .debrief
            n.player.arrivalAt = nil
            n.player.transitStartedAt = nil
            n.lastCargo = [:]
            n.screen = .debrief
            n.doneSteps["6"] = true
            return n
        }
        if Instruments.isOrbitalOnly(mission: mission, target: catalog.target(s.targetId)) {
            // Orbital deployments and survey flights end on arrival: the instrument comes online, nothing is mined.
            switch mission?.payload?.instrumentId {
            case "transit-telescope":
                n.player.transitSatelliteLaunchedAt = s.player.transitSatelliteLaunchedAt ?? now
                n.player.transitSatelliteLevel = max(1, s.player.transitSatelliteLevel ?? 1)
                // One telescope: the asteroid feed comes online with the transit feed.
                n.player.deepSpaceTelescopeBuilt = true
                n.player.deepSpaceTelescopeLaunchedAt = s.player.deepSpaceTelescopeLaunchedAt ?? n.player.transitSatelliteLaunchedAt
            case "saturn-imager":
                n.player.saturnImagerLaunchedAt = s.player.saturnImagerLaunchedAt ?? now
            default: break
            }
            n.player.missionPhase = .debrief
            n.player.arrivalAt = nil
            n.player.transitStartedAt = nil
            n.lastCargo = [:]
            n.screen = .debrief
            n.doneSteps["6"] = true
            return n
        }
        let rover = usesRoverScene(mission, player: s.player)
        n.player.missionPhase = rover ? .survey : .mining
        n.screen = rover ? .roverSurvey : .mining
        return n
    }

    public static func miningDone(_ s: GameState, cargo: Cargo, catalog: Catalog, now: Double) -> GameState {
        // SSL-553: the trip home is a short playable flight (boost to arrive); only a delivery leg runs on the clock.
        guard s.deliveryTargetId != nil else {
            return Transitions.applyMiningDone(s, cargo: cargo, arrivalAt: nil, transitStartedAt: now, now: now)
        }
        let arrival = travelArrival(target: catalog.target(s.deliveryTargetId), player: s.player, now: now)
        return Transitions.applyMiningDone(s, cargo: cargo, arrivalAt: arrival, transitStartedAt: s.player.freeOperations ? now : nil, now: now)
    }

    /// The rover survey logs the surface, then the ship laser is the only extraction.
    public static func roverSurveyComplete(_ s: GameState) -> GameState {
        return Transitions.applyRoverSurveyComplete(s)
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
        guard s.screen == .debrief, let missionId = s.missionId, s.targetId != nil, let haulCargo = s.lastCargo else { return s }
        let mission = catalog.mission(missionId)
        var n = s
        // SSL-651: a filled shower run pays its francs and keeps the fragments as fragments. Read once up front, because settling resets the count.
        let showerFilled = missionId == OrionidsRun.missionId && OrionidsRun.filled(s.player)
        let cargo = showerFilled ? OrionidsRun.withoutFragments(haulCargo) : haulCargo
        if showerFilled { OrionidsRun.settle(&n.player, missionsDone: s.player.missionsDone) }
        let isFreeHaul = mission.map { $0.isOwnProgram && $0.deliveryTargetId == nil && $0.construction == nil } ?? false
            && haulCargo.values.contains { $0 > 0 }
        if isFreeHaul && !s.player.cargoSettledOffworld {
            let effective = disposition ?? s.player.freeHaulDisposition ?? (Market.earthStorageBuilt(s.player) ? .store : .sell)
            n = Market.applyFreeHaulDisposition(n, haul: cargo, disposition: effective, now: now)
            n.player.freeHaulDisposition = nil
        }
        let total = (isFreeHaul && !s.player.cargoSettledOffworld) || showerFilled ? 0 : rawTotal
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
        // A client build job mines its materials on site; handing them over raises the structure for that client.
        if let plan = mission?.construction, let client = mission?.client, plan.requiredMaterials.allSatisfy({ (cargo[$0.key] ?? 0) >= $0.value }) {
            n = ConstructionMissions.applyDelivery(n, plan: plan, targetId: s.targetId ?? mission?.targetId ?? "", now: now, clientId: client, takeFromStash: false)
        }
        if DailyClientMissions.isPoolId(missionId), var pool = n.player.dailyClientPool {
            pool.acceptedId = nil
            if !pool.completedIds.contains(missionId) { pool.completedIds.append(missionId) }
            n.player.dailyClientPool = pool
        }
        n.player.francs += total
        if let xp = mission?.programReward?.researchXP, xp > 0 { n.player.researchXP += xp }
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
        WswBadges.grant(&n.player.badges, WswBadges.type(for: mission, freeOperations: wasFreeOps), at: now)
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
        n.player.homeDeliveryPending = false
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
        n.screen = mission?.payload?.type == .satellite ? .instrumentHub : program ? .launchpad : .hub
        return n
    }

    /// Back out of a contract that has not launched: nothing is spent, the setup is cleared.
    public static func cancelSetup(_ s: GameState) -> GameState {
        guard s.player.activeMission == nil, s.missionId != nil else { return s }
        var n = s
        n.missionId = nil; n.targetId = nil; n.deliveryTargetId = nil
        n.screen = .launchpad
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
