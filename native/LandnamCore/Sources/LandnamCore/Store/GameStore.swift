import Foundation
import Observation

/// Observable shell around the pure `Loop` transitions. Owns the live `GameState`,
/// persists it locally as web-compatible JSON, and exposes intent methods for views.
@MainActor @Observable
public final class GameStore {
    public private(set) var state: GameState
    public let baseCatalog: Catalog
    /// The live catalog: the authored one plus instrument launches and discovered-planet surveys.
    public var catalog: Catalog { Instruments.runtime(baseCatalog, player: state.player, missionId: state.missionId, targetId: state.targetId) }
    private let saveURL: URL?
    private let clock: @Sendable () -> Double
    /// Called after every persisted change; the app wires cloud sync and Game Center here.
    public var onChange: ((GameState) -> Void)?
    /// Fires once per new citizen-science verdict, after the local save, so the app can queue the shared upload.
    /// Fires after a site deed is bought locally, so the app can queue the treasury call (offline safe).
    public var onSiteDeed: ((String) -> Void)?
    public var onClassified: ((SharedClassification) -> Void)?

    public init(state: GameState = GameState(), catalog: Catalog = Catalog(), saveURL: URL? = nil,
                clock: @escaping @Sendable () -> Double = { Date().timeIntervalSince1970 * 1000 }) {
        self.baseCatalog = catalog; self.saveURL = saveURL; self.clock = clock
        if let saveURL, let data = try? Data(contentsOf: saveURL), let loaded = try? JSONDecoder().decode(GameState.self, from: data) {
            self.state = loaded
        } else {
            self.state = state
        }
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

    private func apply(_ next: GameState) {
        guard next != state else { return }
        var n = next
        n.updatedAt = clock()
        state = n
        persist()
        onChange?(n)
    }

    private func persist() {
        guard let saveURL, let data = try? JSONEncoder().encode(state) else { return }
        try? data.write(to: saveURL, options: .atomic)
    }

    /// Adopts a cloud save made elsewhere (web) when it is further along than the local one.
    /// The player lands on the hub with the mobile welcome pending; navigation from the web is dropped.
    @discardableResult public func adoptRemote(_ remote: GameState) -> Bool {
        guard CloudPull.shouldAdopt(local: state, remote: remote) else { return false }
        var n = remote
        n.screen = .hub; n.menuOpen = false; n.popup = nil
        // A web mission in flight keeps its mission and target so the hub can resume it.
        if remote.player.activeMission == nil { n.missionId = nil; n.targetId = nil }
        n.extras[CloudPull.welcomeKey] = .bool(true)
        apply(n)
        return true
    }

    public var welcomePending: Bool { if case .bool(true)? = state.extras[CloudPull.welcomeKey] { return true } else { return false } }
    public func finishWelcome() { var n = state; n.extras[CloudPull.welcomeKey] = nil; if n.screen == .intro { n.screen = .hub }; apply(n) }

    public func go(_ screen: Screen) { var n = state; n.screen = screen; apply(n) }
    public func reset() { state = GameState(); persist() }

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

    /// Transit Telescope: one verdict per subject with the dip marks that justified it.
    public func classifyTess(_ subjectId: String, verdict: TessVerdict, ranges: [TransitRange], candidate: TessCandidate? = nil) {
        guard state.player.tessClassifications[subjectId] == nil else { return }
        let marks = Tess.normalized(ranges)
        var n = state
        if verdict == .planet, let candidate {
            let t = Instruments.exoplanetTarget(candidate, measuredPeriodDays: Tess.periodFromRanges(marks))
            n.player.discoveredExoplanetTargets[t.id] = n.player.discoveredExoplanetTargets[t.id] ?? t
        }
        n.player.tessClassifications[subjectId] = TessClassification(subjectId: subjectId, verdict: verdict, ranges: marks, submittedAt: clock())
        WswBadges.grant(&n.player.badges, .citizenScience, at: clock())
        n.player.researchAnnotations += 1
        n.player.researchXP += Self.firstClassificationXP
        apply(n)
        onClassified?(.tess(subject: subjectId, verdict: verdict, ranges: marks))
    }

    /// Deep Space Telescope: one NEOCP verdict per candidate.
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
    public func roverMiningDone(_ cargo: Cargo) { apply(Loop.roverMiningDone(state, cargo: cargo, catalog: catalog, now: now)) }
    public func deliveryUnloadComplete() { apply(Loop.deliveryUnloadComplete(state, catalog: catalog, now: now)) }
    public func debriefDone(payout: Int, affinity: Int, consumed: Cargo = [:], disposition: HaulDisposition? = nil) {
        apply(Loop.debriefDone(state, payout: payout, affinity: affinity, consumed: consumed, disposition: disposition, catalog: catalog, now: now))
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
    public func recordSurfaceMined(_ id: String, mineral: String, amount: Int) { apply(SurfaceOps.applyMined(state, id, mineral: mineral, amount: amount)) }
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
}
