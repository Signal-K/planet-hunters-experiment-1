import SwiftUI
import LandnamCore

@main
struct LandnamApp: App {
    @State private var store = GameStore(saveURL: GameStore.defaultSaveURL)

    @State private var auth = AuthModel(api: .fromEnvironment(), store: KeychainSessionStore())

    init() { AppFont.register() }

    var body: some Scene {
        WindowGroup {
            RootView().environment(store).environment(auth)
                #if os(macOS)
                .frame(minWidth: 480, minHeight: 640)
                #endif
        }
        #if os(macOS)
        .defaultSize(width: 520, height: 820)
        #endif
    }
}
