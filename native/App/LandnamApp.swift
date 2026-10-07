import SwiftUI
import LandnamCore

@main
struct LandnamApp: App {
    @State private var store = GameStore(saveURL: GameStore.defaultSaveURL)

    @State private var auth = AuthModel(api: .fromEnvironment(), store: KeychainSessionStore())

    @State private var services = Services()
    @Environment(\.scenePhase) private var scenePhase

    init() { AppFont.register() }

    var body: some Scene {
        WindowGroup {
            RootView().environment(store).environment(auth).environment(services.feed)
                .task { services.start(store: store, auth: auth) }
                .onChange(of: auth.session) { _, s in services.attach(s) }
                .onChange(of: scenePhase) { _, p in if p == .active { services.flush() } }
                #if os(macOS)
                .frame(minWidth: 480, minHeight: 640)
                #endif
        }
        #if os(macOS)
        .defaultSize(width: 520, height: 820)
        #endif
    }
}
