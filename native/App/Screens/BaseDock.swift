import SwiftUI
import LandnamCore

/// The Base scene's only dock. Its three controls and measurements come from
/// `shared/layout/base-hud-zones.json` through `HUDZones`.
struct BaseDock: View {
    @Environment(GameStore.self) private var store
    let tile: CGFloat
    let zones: HUDZones.Zones.BottomNav
    let locations: [(title: String, screen: Screen)]
    @Binding var showLocations: Bool

    var body: some View {
        HStack(alignment: .top, spacing: zones.gap) {
            operationSwitch
            Button { store.go(.build) } label: {
                tile(label: "Build") {
                    Image(systemName: "hammer.fill").font(.system(size: tile * 0.5, weight: .black)).foregroundStyle(Theme.hudInk)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Build")
            Button { store.go(.instrumentHub) } label: {
                tile(label: "Hub") {
                    Image(systemName: "globe").font(.system(size: tile * 0.5, weight: .bold)).foregroundStyle(Theme.hudInk)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Open the Hub")
        }
        .padding(zones.padding)
        .hudPanel(radius: 14)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(Strings.Scene.base) dock")
    }

    private var operationSwitch: some View {
        Button {
            if locations.count == 1, let only = locations.first { store.go(only.screen) } else { showLocations = true }
        } label: {
            tile(label: nil) { Text("« »").font(AppFont.display(tile * 0.5)).foregroundStyle(Theme.hudInk) }
        }
        .buttonStyle(.plain)
        .disabled(locations.isEmpty)
        .opacity(locations.isEmpty ? 0.4 : 1)
        .accessibilityLabel("Switch operation")
        .confirmationDialog("Go to", isPresented: $showLocations, titleVisibility: .visible) {
            ForEach(Array(locations.enumerated()), id: \.offset) { _, location in
                Button(location.title) { store.go(location.screen) }
            }
        }
    }

    private func tile<Glyph: View>(label: String?, @ViewBuilder glyph: () -> Glyph) -> some View {
        VStack(spacing: 2) {
            glyph().frame(width: tile, height: tile).hudPanel(radius: 12)
            Text((label ?? " ").uppercased()).font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.hudInk).lineLimit(1)
        }
    }
}
