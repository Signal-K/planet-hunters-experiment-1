import SwiftUI
import LandnamCore

@main
struct LandnamApp: App {
    @State private var store = GameStore(saveURL: GameStore.defaultSaveURL)

    var body: some Scene {
        WindowGroup {
            RootView().environment(store)
        }
    }
}
