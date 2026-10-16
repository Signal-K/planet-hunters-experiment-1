import SwiftUI
import LandnamCore

@main
struct LandnamApp: App {
    @State private var store = GameStore(saveURL: GameStore.defaultSaveURL)

    @State private var auth = AuthModel(api: .fromEnvironment(), store: KeychainSessionStore())

    @State private var services = Services()
    @State private var surveys = SurveyCenter()
    @Environment(\.scenePhase) private var scenePhase
    #if canImport(UIKit)
    @UIApplicationDelegateAdaptor(LandnamAppDelegate.self) private var appDelegate
    @AppStorage(OrientationPreference.storageKey) private var orientation = OrientationPreference.auto.rawValue
    #endif

    init() { AppFont.register() }

    private func announcePriceAlerts() {
        for alert in store.checkPriceAlerts() {
            let name = Minerals.byId[alert.mineralId]?.name ?? alert.mineralId
            LocalNotifications.notifyNow(title: "\(name) hit your price",
                                         body: "Spot is at or above \(Economy.format(francs: alert.target)). Time to sell.",
                                         id: "landnam-alert-\(alert.id)-\(Int(store.now))")
        }
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if let scene = SceneHost.requested { SceneHost(id: scene).environment(store) } else { RootView() }
            }
                .environment(store).environment(auth).environment(services.feed).environment(surveys).environment(services)
                .task {
                    if SceneHost.requested == nil {
                        #if DEBUG
                        DebugSession.prepare()
                        #endif
                        services.start(store: store, auth: auth)
                        #if DEBUG
                        await DebugSession.run(store: store, auth: auth)
                        #endif
                    }
                }
                .onChange(of: auth.session) { _, s in services.attach(s) }
                .onChange(of: scenePhase) { _, p in if p == .active { services.flush(); store.refreshDailyPool(); announcePriceAlerts() } }
                .task {
                    // Sell alerts are checked every 30s while the app runs (web `GameLayoutClient`).
                    while !Task.isCancelled {
                        announcePriceAlerts()
                        try? await Task.sleep(nanoseconds: 30_000_000_000)
                    }
                }
                #if canImport(UIKit)
                .onAppear { OrientationPreference(stored: orientation).apply() }
                .onChange(of: orientation) { _, v in OrientationPreference(stored: v).apply() }
                #endif
                #if os(macOS)
                .frame(minWidth: 480, minHeight: 640)
                #endif
        }
        #if os(macOS)
        .defaultSize(width: 520, height: 820)
        #endif
    }
}
