import SwiftUI
import LandnamCore

/// Floating dock. A left arrow sits at the far left, Build and Hub in the middle, a right arrow at the far right.
struct BaseDock: View {
    @Environment(GameStore.self) private var store
    let tile: CGFloat
    let zones: HUDZones.Zones.BottomNav
    /// Middle buttons; nil gives the base dock (Build, Hub).
    var items: [(title: String, action: () -> Void)]?

    private var middle: [(title: String, action: () -> Void)] {
        items ?? [("Build", { store.go(.build) }), ("Hub", { store.go(.instrumentHub) })]
    }

    var body: some View {
        HStack(spacing: zones.gap) {
            arrow("chevron.left", label: "Previous") { step(-1) }
            Spacer(minLength: zones.gap)
            ForEach(Array(middle.enumerated()), id: \.offset) { _, item in
                Button(action: item.action) {
                    Text(item.title.uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.hudInk)
                        .frame(minWidth: 56, minHeight: 36)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(item.title)
            }
            Spacer(minLength: zones.gap)
            arrow("chevron.right", label: "Next") { step(1) }
        }
        .padding(.horizontal, zones.padding + 4)
        .padding(.vertical, 2)
        .frame(width: items == nil ? 248 : 320, height: 44)
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
