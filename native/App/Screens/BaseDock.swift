import SwiftUI
import LandnamCore

/// Floating dock. A left arrow sits at the far left, Build and Hub in the middle, a right arrow at the far right.
struct BaseDock: View {
    @Environment(GameStore.self) private var store
    let tile: CGFloat
    let zones: HUDZones.Zones.BottomNav
    /// Middle buttons; nil gives the base dock (Build, Hub).
    var items: [(title: String, symbol: String, action: () -> Void)]?
    /// When set, the arrows run these (the base dock scrolls the camera along the base) instead of stepping scenes.
    var onPrev: (() -> Void)?
    var onNext: (() -> Void)?

    private var middle: [(title: String, symbol: String, action: () -> Void)] {
        items ?? [("Build", "hammer.fill", { store.go(.build) }), ("Hub", "dot.radiowaves.left.and.right", { store.go(.instrumentHub) })]
    }

    var body: some View {
        HStack(spacing: zones.gap) {
            arrow("chevron.left", label: onPrev == nil ? "Previous" : "Scroll left") { if let onPrev { onPrev() } else { step(-1) } }
            Spacer(minLength: 0)
            ForEach(Array(middle.enumerated()), id: \.offset) { index, item in
                if index > 0 { Rectangle().fill(Theme.hudInk.opacity(0.4)).frame(width: 1, height: 24) }
                DockButton(title: item.title, symbol: item.symbol, action: item.action)
            }
            Spacer(minLength: 0)
            arrow("chevron.right", label: onNext == nil ? "Next" : "Scroll right") { if let onNext { onNext() } else { step(1) } }
        }
        .padding(.horizontal, zones.padding + 4)
        .padding(.vertical, 2)
        .frame(width: 328, height: 48)
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

/// One dock action: its own pill with an icon and an uppercase label. Base and flight docks both use it.
struct DockButton: View {
    let title: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: symbol).font(.system(size: 14, weight: .bold))
                Text(title.uppercased()).font(AppFont.display(14)).tracking(1.2)
            }
            .foregroundStyle(Theme.hudInk)
            .padding(.horizontal, 12)
            .frame(minWidth: 88, minHeight: 44)
            .background(Capsule().fill(Theme.hudPanel))
            .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
    }
}
