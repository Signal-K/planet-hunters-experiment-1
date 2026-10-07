import SwiftUI
import LandnamCore

/// Locked / loading / unavailable state shared by every citizen-science instrument screen.
struct InstrumentGate: View {
    @Environment(GameStore.self) private var store
    let screenTitle: String
    let title: String
    let message: String
    var action: (title: String, run: () -> Void)?

    var body: some View {
        ScreenFrame(title: screenTitle, back: { store.go(.instrumentHub) }) {
            Panel {
                VStack(alignment: .leading, spacing: 10) {
                    Text(title).font(AppFont.display(16))
                    Text(message).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    if let action { PrimaryButton(title: action.title, action: action.run) }
                }
            }
        }
    }
}
