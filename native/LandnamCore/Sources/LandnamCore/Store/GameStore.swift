import Foundation
import Observation

/// Observable shell around the pure `Loop` transitions. Owns the live `GameState`,
/// persists it locally as web-compatible JSON, and exposes intent methods for views.
@MainActor @Observable
public final class GameStore {
    public private(set) var state: GameState
    public let baseCatalog: Catalog
    /// The live catalog: the authored one plus instrument launches and discovered-planet surveys.
    public private(set) var catalog: Catalog
    private let saveURL: URL?
    private let clock: @Sendable () -> Double
    /// Called after every persisted change; the app wires cloud sync and Game Center here.
    public var onChange: ((GameState) -> Void)?
    /// Fires once per new citizen-science verdict, after the local save, so the app can queue the shared upload.
    /// Fires after a site deed is bought locally, so the app can queue the treasury call (offline safe).
    public var onSiteDeed: ((String) -> Void)?
    public var onClassified: ((SharedClassification) -> Void)?
    /// Every persisted transition (old, new, settled payout) so the app can write `mission_runs` receipts.
    public var onTransition: ((GameState, GameState, Int?) -> Void)?
    private var pendingPayout: Int?
    /// This install's ledger entry id (SSL-559).
    public var deviceId: String = Ledger.deviceId()

    public init(state: GameState = GameState(), catalog: Catalog = Catalog(), saveURL: URL? = nil,
                clock: @escaping @Sendable () -> Double = { Date().timeIntervalSince1970 * 1000 }) {
        self.baseCatalog = catalog; self.saveURL = saveURL; self.clock = clock
        let initialState: GameState
        if let saveURL, let data = try? Data(contentsOf: saveURL), let loaded = try? JSONDecoder().decode(GameState.self, from: data) {
            initialState = loaded
        } else {
            initialState = state
        }
        let visibleState = Self.withDeferredExchangeHidden(initialState)
        self.state = visibleState
        self.catalog = Instruments.runtime(catalog, player: visibleState.player, missionId: visibleState.missionId, targetId: visibleState.targetId)
    }

    public static var defaultSaveURL: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Landnam", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("save.json")
    }

    public var player: Player { state.player }
    public var screen: Screen { state.screen }
    public var mission: Mission? { catalog.mission(state.missionId) }
    public var target: Target? { catalog.target(state.targetId) }
    public var now: Double { clock() }

    private static func withDeferredExchangeHidden(_ state: GameState) -> GameState {
        guard state.screen == .market else { return state }
        var visible = state
        visible.screen = .hub
        return visible
    }

    private func apply(_ proposed: GameState) {
        let next = Self.withDeferredExchangeHidden(proposed)
        guard next != state else { return }
        var n = next
        MissionRuns.stamp(old: state, new: &n)
        n = Ledger.stamp(n, device: deviceId)
        n.updatedAt = clock()
        let old = state
        refreshCatalog(for: n)
        state = n
        persist()
        onTransition?(old, n, pendingPayout)
        pendingPayout = nil
        onChange?(n)
    }

    // Rebuild once on relevant transitions, never on every SwiftUI property read.
    private func refreshCatalog(for next: GameState) {
        let p = state.player, n = next.player
        if state.missionId != next.missionId || state.targetId != next.targetId
            || p.freeOperations != n.freeOperations || p.missionsDone != n.missionsDone
            || p.transitSatelliteLaunchedAt != n.transitSatelliteLaunchedAt
            || p.deepSpaceTelescopeLaunchedAt != n.deepSpaceTelescopeLaunchedAt
            || p.deepSpaceTelescopeBuilt != n.deepSpaceTelescopeBuilt
            || p.placed.contains("deep-space-telescope") != n.placed.contains("deep-space-telescope")
            || p.saturnImagerLaunchedAt != n.saturnImagerLaunchedAt
            || p.discoveredExoplanetTargets != n.discoveredExoplanetTargets {
            catalog = Instruments.runtime(baseCatalog, player: n, missionId: next.missionId, targetId: next.targetId)
        }
    }

    private func persist() {
        guard let saveURL, let data = try? JSONEncoder().encode(state) else { return }
        try? data.write(to: saveURL, options: .atomic)
    }

    /// Adopts a cloud save made elsewhere (web) when it is further along than the local one.
    /// The player lands on the hub with the mobile welcome pending; navigation from the web is dropped.
    @discardableResult public func adoptRemote(_ remote: GameState) -> Bool {
        guard CloudPull.shouldAdopt(local: state, remote: remote) else { return false }
        var n = CloudPull.reconcile(remote: remote, keeping: state)
        n.screen = .hub; n.menuOpen = false; n.popup = nil
        // A web mission in flight keeps its mission and target so the hub can resume it.
        if remote.player.activeMission == nil { n.missionId = nil; n.targetId = nil }
        n.extras[CloudPull.welcomeKey] = .bool(true)
        apply(n)
        return true
    }

    /// Sign-in load: merges the account's PocketBase save into the local cache with the web conflict rule.
    /// A first adoption on this device (no local progress) shows the mobile welcome, like `adoptRemote`.
    public func mergeRemote(_ remote: GameState) {
        if !CloudPull.hasProgress(state) { adoptRemote(remote); return }
        var n = CloudMerge.merge(local: state, remote: remote)
        if n.player.activeMission == nil, state.player.activeMission == nil { n.missionId = state.missionId; n.targetId = state.targetId }
        if PocketBaseExecutor.sameContent(n, state) { return }   // nothing new: don't re-save (avoids a write loop)
        apply(n)
    }
    /// Applies the sign-in `mission_runs` repair (reattaches a resumable receipt) and returns the closing writes.
    public func repairRuns(_ runs: [MissionRuns.Record]) -> [OutboxOp] {
        let r = MissionRuns.repair(runs, state: state, catalog: catalog, now: now)
        if r.state != state { var n = r.state; n.updatedAt = clock(); state = n; persist(); onChange?(n) }
        return r.ops
    }

    public var welcomePending: Bool { if case .bool(true)? = state.extras[CloudPull.welcomeKey] { return true } else { return false } }
    public func finishWelcome() { var n = state; n.extras[CloudPull.welcomeKey] = nil; if n.screen == .intro { n.screen = .hub }; apply(n) }

    public func go(_ screen: Screen) { var n = state; n.screen = screen; apply(n) }
    public func setEarthBiome(_ biome: String, asMove: Bool = false) {
        guard ["mountains", "desert", "tundra", "coast"].contains(biome), !state.player.earthBiomeMoveUsed || !asMove else { return }
        var n = state; n.player.earthBiome = biome
        if asMove { n.player.earthBiomeMoveUsed = true }
        apply(n)
    }
    public func reset() { let next = GameState(); refreshCatalog(for: next); state = next; persist() }

    /// Settings: reopen one training try on the screen it is played on (web `openTrainingTry`).
    public func replayTry(_ id: String) {
        var n = state
        n.player.flightPlan.replayTry = id
        n.player.flightPlan.hidden = false
        n.screen = id == "scan" ? .galaxy : id == "part" ? .hangar : .launchpad
        apply(n)
    }

    /// Collapses or restores the training HUD without changing its progress.
    public func setFlightPlanHidden(_ hidden: Bool) {
        var n = state
        n.player.flightPlan.hidden = hidden
        apply(n)
    }

    /// Settings: mark all three tries done and open Free Ops (web `skipFlightPlan`).
    public func skipTraining() {
        var n = state
        for id in FlightPlanProgress.tryIds { n.player.flightPlan.completed[id] = true }
        n.player.flightPlan.replayTry = nil
        n.player.flightPlan.hidden = true
        n.player.freeOperations = true
        n.tutorial = false
        apply(n)
    }

    public func setFreeOps(_ on: Bool) {
        var n = state
        n.player.freeOperations = on
        n.tutorial = !on
        apply(n)
    }

    // MARK: intents
    /// Research XP for the first classification of a TESS or NEOCP subject (mirrors web useGameLoop).
    static let firstClassificationXP = 15

    /// Saturn imager: one verdict per frame, saved locally first (the pool upload goes through `onClassified`).
    public func classifySaturn(_ candidateId: String, verdict: SaturnVerdict) {
        guard state.player.saturnClassifications[candidateId] == nil else { return }
        var n = state
        let at = clock()
        n.player.saturnClassifications[candidateId] = SaturnClassification(candidateId: candidateId, verdict: verdict, submittedAt: at, badgeTier: SkyEvents.saturnTier(at: at)?.rawValue)
        SkyEvents.grant(&n.player.badges, activity: .saturnClassification, at: at)
        WswBadges.grant(&n.player.badges, .citizenScience, at: at)
        n.player.researchAnnotations += 1
        apply(n)
        onClassified?(.saturn(frame: candidateId, verdict: verdict))
    }

    /// Space Telescope: one verdict per subject with the dip marks that justified it.
    public func classifyTess(_ subjectId: String, verdict: TessVerdict, ranges: [TransitRange], candidate: TessCandidate? = nil) {
        guard state.player.tessClassifications[subjectId] == nil else { return }
        let marks = Tess.normalized(ranges)
        var n = state
        if verdict == .planet, let candidate, !subjectId.hasPrefix(MissionLog.trainingPrefix) {
            let t = Instruments.exoplanetTarget(candidate, measuredPeriodDays: Tess.periodFromRanges(marks))
            n.player.discoveredExoplanetTargets[t.id] = n.player.discoveredExoplanetTargets[t.id] ?? t
        }
        n.player.tessClassifications[subjectId] = TessClassification(subjectId: subjectId, verdict: verdict, ranges: marks, submittedAt: clock())
        WswBadges.grant(&n.player.badges, .citizenScience, at: clock())
        n.player.researchAnnotations += 1
        n.player.researchXP += Self.firstClassificationXP
        FlightPlan.completeTry(&n, "scan")
        apply(n)
        onClassified?(.tess(subject: subjectId, verdict: verdict, ranges: marks))
    }

    /// Hangar: fit one module per ship stage; completes the part training try.
    public func fitHangarModules(_ installed: [String: String]) {
        let next = FlightPlan.applyFit(state, installed: installed)
        if next != state { apply(next) }
    }

    /// Space Telescope: one NEOCP verdict per candidate.
    public func classifyAsteroid(_ candidateId: String, verdict: AsteroidVerdict) {
        guard state.player.asteroidClassifications[candidateId] == nil else { return }
        var n = state
        n.player.asteroidClassifications[candidateId] = AsteroidClassification(candidateId: candidateId, verdict: verdict, submittedAt: clock())
        SkyEvents.grant(&n.player.badges, activity: .asteroidClassification, at: clock())
        WswBadges.grant(&n.player.badges, .citizenScience, at: clock())
        n.player.researchAnnotations += 1
        n.player.researchXP += Self.firstClassificationXP
        apply(n)
        onClassified?(.asteroid(candidate: candidateId, verdict: verdict))
    }
    public func pickMission(_ id: String) { apply(Loop.pickMission(state, id: id, catalog: catalog)) }
    public func pickTarget(_ id: String) { apply(Loop.pickTarget(state, id: id, catalog: catalog)) }
    public func finishQuickSetup() { apply(Loop.finishQuickSetup(state, catalog: catalog)) }
    public func purchaseRocket(_ id: String) { apply(Loop.purchaseRocket(state, rocketId: id, catalog: catalog)) }
    public func rollOutToPad() { if let n = Loop.rollOutToPad(state) { apply(n) } }
    public func transferToLaunchpad() { apply(Loop.transferToLaunchpad(state)) }
    public func launch() {
        var n = Loop.launch(state, catalog: catalog, now: now)
        if n != state { SkyEvents.grant(&n.player.badges, activity: .launch, at: now) }
        apply(n)
    }
    /// First shower debris chunk of an event earns that event's badge (idempotent).
    public func debrisMined(_ resourceId: String) {
        guard let preset = SkyEvents.presets.first(where: { $0.resourceId == resourceId }) else { return }
        var n = state
        SkyEvents.grant(&n.player.badges, activity: .debrisMining, at: now, only: preset.eventId)
        apply(n)
    }
    public func transitArrived() { apply(Loop.transitArrived(state, catalog: catalog, now: now)) }
    public func miningDone(_ cargo: Cargo) { apply(Loop.miningDone(state, cargo: cargo, catalog: catalog, now: now)) }
    public func roverSurveyComplete() { apply(Loop.roverSurveyComplete(state)) }
    public func deliveryUnloadComplete() { apply(Loop.deliveryUnloadComplete(state, catalog: catalog, now: now)) }
    public func debriefDone(payout: Int, affinity: Int, consumed: Cargo = [:], disposition: HaulDisposition? = nil) {
        pendingPayout = payout
        apply(Loop.debriefDone(state, payout: payout, affinity: affinity, consumed: consumed, disposition: disposition, catalog: catalog, now: now))
    }
    /// SSL-553: settle the delivery sheet. Market and silo shares settle here; the client share runs through the debrief ledger.
    public func homeDelivery(_ split: HomeDelivery.Split) {
        guard state.screen == .debrief, state.player.homeDeliveryPending, let cargo = state.lastCargo else { return }
        let mission = catalog.mission(state.missionId)
        let demand = HomeDelivery.demand(mission, cargo: cargo)
        let payout = HomeDelivery.clientPayout(mission, split: split, demand: demand, missionsDone: state.player.missionsDone)
        let affinity = payout > 0 ? max(0, mission?.payout.affinity ?? 0) : 0
        let settled = HomeDelivery.apply(state, split: split, now: now)
        pendingPayout = payout
        apply(Loop.debriefDone(settled.state, payout: payout, affinity: affinity, consumed: settled.consumed, catalog: catalog, now: now))
    }
    public func buyLaserCapacitor(expectedLevel: Int, reservedUnits: Int = 0) { apply(LaserCapacitor.applyBuy(state, expectedLevel: expectedLevel, reservedUnits: reservedUnits)) }
    public func abandonMission() { apply(state.player.activeMission == nil ? Loop.cancelSetup(state) : Loop.abandonMission(state)) }
    public func openAcademy() { apply(Academy.settleEconomy(Academy.migrate(state, now: now), now: now)) }
    public func researchAcademy() { apply(Academy.applyResearchAcademy(state)) }
    public func setAcademyFunding(_ funded: Bool) { apply(Academy.applySetFunding(state, funded: funded)) }
    public func hireCrew(_ sourceId: String) { apply(Academy.applyHire(state, sourceId: sourceId, now: now)) }
    public func rehireCrew(_ id: String) { apply(Academy.applyRehire(state, crewId: id, now: now)) }
    public func trainCrew(_ id: String, branch: String) { apply(Academy.applyStartTraining(state, crewId: id, branch: branch, now: now)) }
    public func trainCandidate(branch: String) { apply(Academy.applyStartCandidate(state, branch: branch, now: now)) }
    public func collectTraining(_ id: String) { apply(Academy.applyCollectTraining(state, sessionId: id, now: now)) }
    public func researchCrewModule() { apply(Academy.applyResearchCrewModule(state)) }
    public func assignCrew(_ structureId: String, crewId: String?) { apply(Academy.applyAssign(state, structureId: structureId, crewId: crewId)) }
    @discardableResult public func place(_ kind: String, plot: Int) -> Bool {
        let next = Construction.applyPlace(state, kind: kind, plot: plot, now: now)
        guard next != state else { return false }
        apply(next); return true
    }
    @discardableResult public func upgradeBuilding(_ id: String) -> Bool {
        let next = BuildingLevels.applyUpgrade(state, id: id)
        guard next != state else { return false }
        apply(next); return true
    }
    public func purchaseSiteAccess(_ id: String) {
        let next = SurfaceOps.applyPurchaseAccess(state, id, now: now)
        guard next != state else { return }
        apply(next); onSiteDeed?(id)
    }
    /// Applies a polled global confirmation; returns true when it is new news worth a notice.
    @discardableResult
    public func noteConfirmedDiscovery(_ lastConfirmedAt: String?) -> Bool {
        let (next, announce) = ConfirmedDiscovery.apply(state, lastConfirmedAt: lastConfirmedAt)
        if next != state { apply(next) }
        return announce
    }
    public func buildSettlementPad(_ id: String, pad: Int) { apply(SurfaceOps.applyBuildPad(state, id, pad: pad, now: now)) }
    public func dispatchFerry(_ id: String) { apply(SurfaceOps.applyDispatch(state, id, now: now)) }
    public func retryFerry(_ id: String) { apply(SurfaceOps.applyRetry(state, id, now: now)) }
    public func reconcileFerry(_ id: String) { apply(SurfaceOps.applyReconcile(state, id, now: now)) }
    public func acknowledgeFerry(_ id: String) { apply(SurfaceOps.applyAcknowledge(state, id)) }
    public func chooseSatelliteTarget(_ subjectId: String) {
        var n = state; n.player.satelliteTargetId = subjectId; n.player.pendingRepick = false; apply(n)
    }
    public func unlockSkill(_ id: String) { apply(Progression.applyUnlock(state, nodeId: id)) }
    public func upgradeLicense(to grade: LicenseGrade) { apply(Progression.applyUpgrade(state, to: grade)) }
    public func startRefine(_ recipeId: String) { apply(Refinery.applyStart(state, recipeId: recipeId, now: now)) }
    public func collectRefined(_ recipeId: String) { apply(Refinery.applyCollect(state, recipeId: recipeId, now: now)) }
    public func sellRefined(_ recipeId: String, amount: Int) { apply(Refinery.applySell(state, recipeId: recipeId, amount: amount)) }
    public func sell(_ mineralId: String, amount: Int) { apply(Market.applySell(state, mineralId: mineralId, amount: amount, now: now)) }
    /// Fits a chosen part in a rocket-builder slot.
    @discardableResult public func installBuilderPart(_ slot: String, partId: String) -> Bool {
        let next = RocketBuilder.install(state, slot: slot, partId: partId)
        guard next != state else { return false }
        apply(next)
        return true
    }

    /// Cycles one rocket-builder slot and saves it on `shipCustomizerParts`.
    @discardableResult public func installBuilderPart(_ slot: String) -> Bool {
        let next = RocketBuilder.install(state, slot: slot)
        guard next != state else { return false }
        apply(next)
        return true
    }
}
