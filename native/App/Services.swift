import SwiftUI
import Network
import GameKit
import LandnamCore

/// Game Center: sign-in is automatic and optional; the game never depends on it.
@MainActor @Observable
final class GameCenter {
    private(set) var isAuthenticated = false
    private var reportedScores: [String: Int] = [:]
    private var reportedAch: [String: Double] = [:]

    func authenticate() {
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, _ in
            Task { @MainActor in
                guard let self else { return }
                #if os(iOS)
                if let viewController, let root = UIApplication.shared.connectedScenes
                    .compactMap({ ($0 as? UIWindowScene)?.keyWindow?.rootViewController }).first {
                    root.present(viewController, animated: true)
                }
                #else
                _ = viewController
                #endif
                self.isAuthenticated = GKLocalPlayer.local.isAuthenticated
            }
        }
    }

    /// Reports only values that increased since the last report.
    func report(_ player: Player) {
        guard isAuthenticated else { return }
        for (id, v) in Milestones.scores(for: player) where v > (reportedScores[id] ?? -1) {
            reportedScores[id] = v
            Task { try? await GKLeaderboard.submitScore(v, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) }
        }
        let achievements = Milestones.achievements(for: player).filter { $0.value > (reportedAch[$0.key] ?? 0) }
        guard !achievements.isEmpty else { return }
        for (id, pct) in achievements {
            reportedAch[id] = pct
        }
        let list = achievements.map { id, pct -> GKAchievement in
            let a = GKAchievement(identifier: id); a.percentComplete = pct; a.showsCompletionBanner = true; return a
        }
        Task { try? await GKAchievement.report(list) }
    }
}

/// Owns the outbox, cloud sync and the triggers that flush it.
@MainActor @Observable
final class Services {
    let gameCenter = GameCenter()
    private(set) var sync: CloudSync
    let feed: FeedModel
    private(set) var shared: Outbox
    private let token = TokenBox()
    private let sharedToken = TokenBox()
    private let sharedUser = TokenBox()
    private let monitor = NWPathMonitor()
    private let api = AuthAPI.fromEnvironment()
    private weak var store: GameStore?
    private var session: AuthSession?
    private var pulling = false

    init() {
        let box = token, sbox = sharedToken
        let exec = PocketBaseExecutor(baseURL: api.baseURL, token: { box.value })
        sync = CloudSync(outbox: Outbox(store: FileOutboxStore(url: FileOutboxStore.defaultURL()), execute: exec.executor))
        // Citizen-science verdicts go to the shared backend with the shared login, in their own queue
        // so a slow shared backend never holds up the game save.
        let sharedExec = PocketBaseExecutor(baseURL: api.sharedURL, token: { sbox.value })
        shared = Outbox(store: FileOutboxStore(url: FileOutboxStore.defaultURL().deletingLastPathComponent().appendingPathComponent("shared-outbox.json")),
                        execute: sharedExec.executor)
        feed = FeedModel(feed: SharedFeed(baseURL: api.sharedURL, token: { sbox.value }))
    }

    func start(store: GameStore, auth: AuthModel) {
        gameCenter.authenticate()
        self.store = store
        attach(auth.session)
        let sync = sync, gc = gameCenter, shared = shared, user = sharedUser
        store.onChange = { state in
            Task { await sync.save(state) }
            Task { @MainActor in gc.report(state.player) }
        }
        store.onSiteDeed = { siteId in Task { await sync.enqueue(SiteDeed.op(siteId: siteId)) } }
        store.onClassified = { verdict in
            // Local save already happened. Without a shared login (Apple sign-in) the verdict stays local.
            guard let id = user.value, let op = verdict.op(sharedUserId: id) else { return }
            Task { await shared.enqueue(op); await shared.flush() }
        }
        monitor.pathUpdateHandler = { path in
            if path.status == .satisfied { Task { @MainActor in self.pullIfNeeded(); await sync.flush(); await shared.flush() } }
        }
        monitor.start(queue: .global(qos: .utility))
    }

    func attach(_ session: AuthSession?) {
        self.session = session
        token.value = session?.token
        sharedToken.value = session?.sharedToken
        sharedUser.value = session?.sharedUserId
        let shared = shared
        // Cloud pushes stay off until this account's cloud save has been read once, so a fresh
        // install can never overwrite a web player's progress with an empty save.
        Task { await sync.setUser(nil) }
        Task { await shared.flush() }
        pullIfNeeded()
    }

    private func pulledKey(_ id: String) -> String { "landnam.cloudPulled.\(id)" }

    /// Reads the account's web/cloud save once per account per install, then enables pushing.
    /// Offline or failing: local play continues, pushes stay held, and the next reachable moment retries.
    func pullIfNeeded() {
        guard let session, let store, !pulling else { return }
        let id = session.userId
        if UserDefaults.standard.bool(forKey: pulledKey(id)) { Task { await sync.setUser(id); await sync.flush() }; return }
        pulling = true
        let base = api.baseURL, tok = session.token, sync = sync
        Task { @MainActor in
            defer { pulling = false }
            let result = await CloudPull.fetch(baseURL: base, token: tok, userId: id)
            guard self.session?.userId == id else { return }
            switch result {
            case .found(let remote): store.adoptRemote(remote)
            case .none: break
            case .unavailable: return
            }
            UserDefaults.standard.set(true, forKey: pulledKey(id))
            await sync.setUser(id)
            await sync.save(store.state)
        }
    }

    func flush() { let s = sync, o = shared; Task { await s.flush(); await o.flush() } }
}

final class TokenBox: @unchecked Sendable {
    private let lock = NSLock(); private var v: String?
    var value: String? { get { lock.withLock { v } } set { lock.withLock { v = newValue } } }
}
