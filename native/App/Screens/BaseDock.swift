import SwiftUI
import LandnamCore

/// Floating dock. A left arrow sits at the far left, Build and Hub in the middle, a right arrow at the far right.
struct BaseDock: View {
    @Environment(GameStore.self) private var store
    let tile: CGFloat
    let zones: HUDZones.Zones.BottomNav

    var body: some View {
        HStack(spacing: zones.gap) {
            arrow("chevron.left", label: "Previous") { step(-1) }
            Spacer(minLength: zones.gap)
            Button { store.go(.build) } label: {
                Text("BUILD").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.hudInk)
                    .frame(minWidth: 56, minHeight: 36)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Build")
            Button { store.go(.instrumentHub) } label: {
                Text("HUB").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.hudInk)
                    .frame(minWidth: 56, minHeight: 36)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Open the Hub")
            Spacer(minLength: zones.gap)
            arrow("chevron.right", label: "Next") { step(1) }
        }
        .padding(.horizontal, zones.padding + 4)
        .padding(.vertical, 2)
        .frame(width: 248, height: 44)
        .background(Capsule().fill(Theme.hudPanel))
        .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 1))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Scene dock")
    }

    private func arrow(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 16, weight: .semibold)).foregroundStyle(Theme.hudInk)
                .frame(width: 36, height: 36)
                .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private var stops: [Screen] {
        var out: [Screen] = [.missions]
        if store.player.freeOperations { out.append(.market) }
        if store.player.activeMission != nil { out.append(.launchpad) }
        return out
    }

    private func step(_ delta: Int) {
        let list = stops
        guard let first = list.first else { return }
        let index = list.firstIndex(of: store.screen) ?? 0
        let next = (index + delta + list.count) % list.count
        let target = list.indices.contains(next) ? list[next] : first
        store.go(target)
    }
}
