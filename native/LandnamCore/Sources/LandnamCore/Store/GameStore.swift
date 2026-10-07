import Foundation
import Observation

/// Observable shell around the pure `Loop` transitions. Owns the live `GameState`,
/// persists it locally as web-compatible JSON, and exposes intent methods for views.
@MainActor @Observable
public final class GameStore {
    public private(set) var state: GameState
    public let catalog: Catalog
    private let saveURL: URL?
    private let clock: @Sendable () -> Double
    /// Called after every persisted change; the app wires cloud sync and Game Center here.
    public var onChange: ((GameState) -> Void)?

    public init(state: GameState = GameState(), catalog: Catalog = Catalog(), saveURL: URL? = nil,
                clock: @escaping @Sendable () -> Double = { Date().timeIntervalSince1970 * 1000 }) {
        self.catalog = catalog; self.saveURL = saveURL; self.clock = clock
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

    public func go(_ screen: Screen) { var n = state; n.screen = screen; apply(n) }
    public func reset() { state = GameState(); persist() }

    // MARK: intents
    /// Saturn imager: one verdict per frame, saved locally first (the pool upload goes through the outbox).
    public func classifySaturn(_ candidateId: String, verdict: SaturnVerdict) {
        guard state.player.saturnClassifications[candidateId] == nil else { return }
        var n = state
        n.player.saturnClassifications[candidateId] = SaturnClassification(candidateId: candidateId, verdict: verdict, submittedAt: clock())
        n.player.researchAnnotations += 1
        apply(n)
    }
    public func pickMission(_ id: String) { apply(Loop.pickMission(state, id: id, catalog: catalog)) }
    public func pickTarget(_ id: String) { apply(Loop.pickTarget(state, id: id, catalog: catalog)) }
    public func finishQuickSetup() { apply(Loop.finishQuickSetup(state, catalog: catalog)) }
    public func purchaseRocket(_ id: String) { apply(Loop.purchaseRocket(state, rocketId: id, catalog: catalog)) }
    public func rollOutToPad() { if let n = Loop.rollOutToPad(state) { apply(n) } }
    public func transferToLaunchpad() { apply(Loop.transferToLaunchpad(state)) }
    public func launch() { apply(Loop.launch(state, catalog: catalog, now: now)) }
    public func transitArrived() { apply(Loop.transitArrived(state, catalog: catalog, now: now)) }
    public func miningDone(_ cargo: Cargo) { apply(Loop.miningDone(state, cargo: cargo, catalog: catalog, now: now)) }
    public func deliveryUnloadComplete() { apply(Loop.deliveryUnloadComplete(state, catalog: catalog, now: now)) }
    public func debriefDone(payout: Int, affinity: Int, consumed: Cargo = [:], disposition: HaulDisposition? = nil) {
        apply(Loop.debriefDone(state, payout: payout, affinity: affinity, consumed: consumed, disposition: disposition, catalog: catalog, now: now))
    }
    public func buyLaserCapacitor(expectedLevel: Int, reservedUnits: Int = 0) { apply(LaserCapacitor.applyBuy(state, expectedLevel: expectedLevel, reservedUnits: reservedUnits)) }
    public func abandonMission() { apply(Loop.abandonMission(state)) }
    public func sell(_ mineralId: String, amount: Int) { apply(Market.applySell(state, mineralId: mineralId, amount: amount, now: now)) }
}
