import SwiftUI
import Network
import GameKit
import UserNotifications
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
    private let unauthorized = UnauthorizedBox()
    private let mergedBox: MergedBox
    private weak var auth: AuthModel?
    private static let ownerKey = "landnam.saveOwner"
    /// HUD sync chip state: offline, uploading queued writes, or idle (nil).
    private(set) var online = !PocketBaseExecutor.forceOffline
    private(set) var pendingWrites = 0
    private(set) var failedWrites = 0

    init() {
        let box = token, sbox = sharedToken
        let bad = unauthorized
        var exec = PocketBaseExecutor(baseURL: api.baseURL, token: { box.value })
        exec.onUnauthorized = { bad.fire() }
        let merged = MergedBox()
        mergedBox = merged
        exec.onMerged = { st in merged.fire(st) }
        sync = CloudSync(outbox: Outbox(store: FileOutboxStore(url: FileOutboxStore.defaultURL()), execute: exec.executor))
        // Citizen-science verdicts go to the shared backend with the shared login, in their own queue
        // so a slow shared backend never holds up the game save.
        var sharedExec = PocketBaseExecutor(baseURL: api.sharedURL, token: { sbox.value })
        sharedExec.onUnauthorized = { bad.fire() }
        shared = Outbox(store: FileOutboxStore(url: FileOutboxStore.defaultURL().deletingLastPathComponent().appendingPathComponent("shared-outbox.json")),
                        execute: sharedExec.executor)
        feed = FeedModel(feed: SharedFeed(baseURL: api.sharedURL, token: { sbox.value }))
    }

    func start(store: GameStore, auth: AuthModel) {
        gameCenter.authenticate()
        self.store = store
        self.auth = auth
        // A server 401 means the token aged out: renew it, or ask the player to sign in again.
        mergedBox.handler = { [weak store] st in Task { @MainActor in store?.mergeRemote(st); store?.leaveOrphanedMissionScreen() } }
        unauthorized.handler = { [weak auth] in Task { @MainActor in await auth?.refreshSession() } }
        store.leaveOrphanedMissionScreen()
        attach(auth.session)
        let sync = sync, gc = gameCenter, shared = shared, user = sharedUser
        store.onChange = { state in
            Task { await sync.save(state) }
            Task { @MainActor in gc.report(state.player) }
        }
        // mission_runs receipts (create on launch, phase/cargo, close on settle or abandon) and the shared mission_log.
        let ses = { [weak self] in self?.session }
        store.onTransition = { old, new, payout in
            guard let session = ses() else { return }
            let now = Date().timeIntervalSince1970 * 1000
            let ops = MissionRuns.ops(old: old, new: new, userId: session.userId, now: now, payout: payout)
            let log = session.sharedUserId.flatMap { MissionRuns.logOp(old: old, new: new, sharedUserId: $0, payout: payout, now: now) }
            if !ops.isEmpty { Task { for op in ops { await sync.enqueue(op) } } }
            if let log { Task { await shared.enqueue(log); await shared.flush() } }
        }
        Task { @MainActor [weak self] in
            var lastRetry = Date.distantPast
            while true {
                let snap = await sync.snapshot()
                self?.pendingWrites = snap.waiting; self?.failedWrites = snap.failed
                // A server-only outage leaves the network path satisfied, so neither the reachability change nor the
                // app-active trigger fires when it recovers. While writes wait, retry every 15s (offline passes do not
                // burn attempts; rejected ones keep their own backoff).
                if snap.waiting > 0, self?.online == true, Date().timeIntervalSince(lastRetry) >= 15 {
                    lastRetry = Date()
                    await sync.flush(); await shared.flush()
                }
                try? await Task.sleep(for: .seconds(1))
            }
        }
        TakeonPersistence.upload = { target, seed, state, snapshot in
            guard let session = ses() else { return }
            let ops = NativeRecords.voxelWorld(userId: session.userId, targetId: target, seed: seed, state: state, snapshot: snapshot)
            Task { for op in ops { await sync.enqueue(op) } }
        }
        LocalNotifications.requestProvisional()
        scheduleOrionidsPeakReminder()
        store.onClassified = { verdict in
            // Local save already happened. Without a shared login (Apple sign-in) the verdict stays local.
            guard let id = user.value, let op = verdict.op(sharedUserId: id) else { return }
            Task { await shared.enqueue(op); await shared.flush() }
        }
        monitor.pathUpdateHandler = { path in
            let up = path.status == .satisfied && !PocketBaseExecutor.forceOffline
            Task { @MainActor in self.online = up }
            if up { Task { @MainActor in self.pullIfNeeded(); await sync.flush(); await shared.flush() } }
        }
        monitor.start(queue: .global(qos: .utility))
    }

    func attach(_ session: AuthSession?) {
        self.session = session
        claimSave(for: session)
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

    /// Social actions are deliberately online-only. Unlike game-state writes,
    /// requests and daily gifts must be checked atomically by PocketBase and
    /// therefore never enter the offline outbox.
    func friendsAPI() -> FriendsAPI? {
        guard let session else { return nil }
        let bad = unauthorized
        return FriendsAPI(baseURL: api.baseURL, token: session.token, onUnauthorized: { bad.fire() })
    }

    func notificationsAPI() -> NotificationsAPI? {
        guard let session else { return nil }
        let bad = unauthorized
        return NotificationsAPI(baseURL: api.baseURL, token: session.token, onUnauthorized: { bad.fire() })
    }

    func refreshFriendPresence() {
        guard let api = friendsAPI() else { return }
        Task { try? await api.heartbeat() }
    }

    /// SSL-673: the shared monthly research total. Read-only, so it is fetched live and never queued.
    func communityResearchAPI() -> CommunityResearchAPI? {
        guard let session else { return nil }
        return CommunityResearchAPI(baseURL: api.baseURL, token: session.token)
    }

    /// One local save per account. A different player signing in on this device starts clean (and the previous
    /// player's queued cloud writes are dropped); the same player signing back in resumes where they left off.
    private func claimSave(for session: AuthSession?) {
        guard let session, let store else { return }
        let defaults = UserDefaults.standard
        if let owner = defaults.string(forKey: Self.ownerKey), owner != session.userId {
            store.reset()
            defaults.removeObject(forKey: pulledKey(session.userId))   // re-read this account's cloud save into the clean slate
            let sync = sync, shared = shared
            Task { await sync.clear(); await shared.clear() }
        }
        defaults.set(session.userId, forKey: Self.ownerKey)
    }

    private func pulledKey(_ id: String) -> String { "landnam.cloudPulled.\(id)" }

    /// Loads the account's PocketBase save on every sign-in and reconnect (the local file is only the offline cache),
    /// merges it with the web conflict rule, repairs stuck `mission_runs`, then enables pushing.
    /// Offline or failing: local play continues; once this account has been read on this device its writes queue in the outbox.
    func pullIfNeeded() {
        guard let session, let store, !pulling else { return }
        let id = session.userId
        let capturedSync = sync
        if UserDefaults.standard.bool(forKey: pulledKey(id)) { Task { await capturedSync.setUser(id) } }
        pulling = true
        let base = api.baseURL, tok = session.token
        Task { @MainActor in
            defer { pulling = false }
            let result = await CloudPull.fetch(baseURL: base, token: tok, userId: id)
            guard self.session?.userId == id else { return }
            switch result {
            case .found(let remote): store.mergeRemote(remote); store.leaveOrphanedMissionScreen()
            case .none: break
            case .unavailable: return
            }
            await capturedSync.enqueue(NativeRecords.pushSubscription(userId: id, endpoint: LocalNotifications.endpoint))
            if TakeonPersistence.load("moon") == nil,
               let (_, snap) = await NativeRecords.fetchWorld(baseURL: base, token: tok, userId: id, targetId: "moon"), let snap {
                TakeonPersistence.storeLocal("moon", snap)
            }
            if let runs = await MissionRuns.fetchOpen(baseURL: base, token: tok, userId: id), self.session?.userId == id {
                for op in store.repairRuns(runs) { await capturedSync.enqueue(op) }
            }
            UserDefaults.standard.set(true, forKey: pulledKey(id))
            await capturedSync.setUser(id)
            await capturedSync.save(store.state)
        }
    }

    func flush() { let s = sync, o = shared; Task { await s.flush(); await o.flush() } }

    /// One local alert at 22 Oct 02:00, mirrored into scheduled_notifications so it is not device-only.
    private func scheduleOrionidsPeakReminder() {
        let at = SkyEvents.orionidsPeakReminderMs()
        guard at > Date().timeIntervalSince1970 * 1000 else { return }
        LocalNotifications.schedule(title: SkyEvents.orionidsPeakReminderTitle, body: SkyEvents.orionidsPeakReminderBody, at: at)
        let op = NativeRecords.orionidsPeakReminder(endpoint: LocalNotifications.endpoint, at: at)
        Task { await sync.enqueue(op) }
    }
}

/// Lets the executors report a 401 before `Services` has finished initialising.
final class UnauthorizedBox: @unchecked Sendable {
    private let lock = NSLock(); private var h: (@Sendable () -> Void)?
    var handler: (@Sendable () -> Void)? { get { lock.withLock { h } } set { lock.withLock { h = newValue } } }
    func fire() { handler?() }
}

/// Carries a merged save from the executor back to the store (SSL-559).
final class MergedBox: @unchecked Sendable {
    private let lock = NSLock(); private var h: (@Sendable (GameState) -> Void)?
    var handler: (@Sendable (GameState) -> Void)? { get { lock.withLock { h } } set { lock.withLock { h = newValue } } }
    func fire(_ s: GameState) { handler?(s) }
}

final class TokenBox: @unchecked Sendable {
    private let lock = NSLock(); private var v: String?
    var value: String? { get { lock.withLock { v } } set { lock.withLock { v = newValue } } }
}

/// Local iOS notifications (SSL-559). Delivered by iOS itself, so they work offline; each one is mirrored to
/// `scheduled_notifications`. Without an APNs entitlement the device registers a local-only endpoint.
@MainActor
enum LocalNotifications {
    static var endpoint: String { "ios-local:" + Ledger.deviceId() }
    static func requestProvisional() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .provisional]) { _, _ in }
    }
    /// Delivers now (SSL-617 sell alerts). iOS shows it even when the app has moved to the background.
    static func notifyNow(title: String, body: String, id: String) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .provisional]) { _, _ in }
        let c = UNMutableNotificationContent(); c.title = title; c.body = body
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: c,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)))
    }
    static func schedule(title: String, body: String, at ms: Double) {
        let c = UNMutableNotificationContent(); c.title = title; c.body = body
        let wait = max(1, ms / 1000 - Date().timeIntervalSince1970)
        let req = UNNotificationRequest(identifier: "landnam-\(Int(ms))-\(title.hashValue)", content: c,
                                        trigger: UNTimeIntervalNotificationTrigger(timeInterval: wait, repeats: false))
        UNUserNotificationCenter.current().add(req)
    }
}
