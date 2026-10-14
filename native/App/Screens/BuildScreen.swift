import SwiftUI
import LandnamCore

/// Build and Place is the base scene itself in placement mode (mirrors web): pick an unlocked structure, tap a free slot.
struct BuildScreen: View {
    var body: some View { HubScreen(placing: true) }
}
