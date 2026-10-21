import SwiftUI
import LandnamCore

/// Floating dock. A left arrow sits at the far left, Build and Hub in the middle, a right arrow at the far right.
struct BaseDock: View {
    @Environment(GameStore.self) private var store
    @Environment(\.coach) private var coach
    let tile: CGFloat
    let zones: HUDZones.Zones.BottomNav
    /// Middle buttons; nil gives the base dock (Build, Hub).
    var items: [(title: String, symbol: String, action: () -> Void)]?
    /// When set, the arrows run these (the base dock scrolls the camera along the base) instead of stepping scenes.
    var onPrev: (() -> Void)?
    var onNext: (() -> Void)?
    /// When set, Build runs this (in-scene placement) instead of opening the Build screen.
    var onBuild: (() -> Void)?
    /// When set, the second base button is Menu (opens the base menu) instead of Hub.
    var onMenu: (() -> Void)?
    /// When set, the first middle button is press-and-hold (true on press, false on release) instead of a tap. Mining Fire uses this.
    var holdFirst: ((Bool) -> Void)?
    /// Minimal glass dock (mining): no arrows, glowing outline.
    var glass = false
    /// When set, a Mission button sits between Build and Menu and the arrows drop away to make room.
    var onMission: (() -> Void)?
    /// Base's first carousel slice: the selected world location is called out separately
    /// from its small lower-edge actions. Navigation remains disabled until visited
    /// locations are persisted in the shared model.
    var locationLabel: String?
    var locationNavigationDisabled = false

    private var middle: [(title: String, symbol: String, action: () -> Void)] {
        items ?? [("Build", "hammer.fill", { if let onBuild { onBuild() } else { store.go(.build) } })] + (onMission.map { m in [("Mission", "paperplane", { m() })] } ?? []) + [onMenu.map { menu in ("Menu", "list.bullet", { menu() }) } ?? ("Hub", "dot.radiowaves.left.and.right", { store.go(.instrumentHub) })]
    }

    var body: some View {
        if let locationLabel { locationDock(locationLabel) }
        else { standardDock }
    }

    private var standardDock: some View {
        HStack(spacing: zones.gap) {
            if !glass && onMission == nil { arrow("chevron.left", label: onPrev == nil ? "Previous" : "Scroll left") { if let onPrev { onPrev() } else { step(-1) } } }
            Spacer(minLength: 0)
            ForEach(Array(middle.enumerated()), id: \.offset) { index, item in
                if index > 0, !glass { Rectangle().fill(Theme.hudInk.opacity(0.4)).frame(width: 1, height: 24) }
                if index == 0, let holdFirst {
                    HoldDockButton(title: item.title, symbol: item.symbol, hold: holdFirst)
                } else {
                    let coachTarget = item.title == "Fire" ? "mining-fire-laser" : nil
                    DockButton(title: item.title, symbol: item.symbol, action: {
                        item.action()
                        if coachTarget != nil { coach?.report("fire") }
                    }, coachTarget: coachTarget)
                }
            }
            Spacer(minLength: 0)
            if !glass && onMission == nil { arrow("chevron.right", label: onNext == nil ? "Next" : "Scroll right") { if let onNext { onNext() } else { step(1) } } }
        }
        .environment(\.glassHud, glass)
        .padding(.horizontal, zones.padding + 4)
        .padding(.vertical, 4)
        .frame(width: glass ? 212 : (onMission == nil ? 328 : 356), height: 52)
        .modifier(DockBackdrop(glass: glass))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Scene dock")
    }

    private func locationDock(_ label: String) -> some View {
        HStack(alignment: .bottom, spacing: 12) {
            HStack(spacing: 0) {
                locationArrow("chevron.left", label: "Previous location") { onPrev?() }
                Label(label, systemImage: "globe")
                    .font(AppFont.display(14)).tracking(0.6)
                    .lineLimit(1)
                    .foregroundStyle(Theme.hudPanel)
                    .frame(minWidth: 88, minHeight: 44)
                    .padding(.horizontal, 10)
                    .background(Theme.blue)
                    .accessibilityLabel("Selected location \(label)")
                locationArrow("chevron.right", label: "Next location") { onNext?() }
            }
            .overlay(Rectangle().stroke(Theme.hudInk, lineWidth: 2))

            Spacer(minLength: 0)

            HStack(spacing: 0) {
                DockButton(title: "Build", symbol: "hammer.fill", action: { if let onBuild { onBuild() } else { store.go(.build) } })
                if let onMission {
                    Divider().overlay(Theme.hudInk)
                    DockButton(title: "Find mission", symbol: "paperplane", action: onMission)
                }
                Divider().overlay(Theme.hudInk)
                DockButton(title: "Menu", symbol: "line.3.horizontal", action: { if let onMenu { onMenu() } else { store.go(.instrumentHub) } })
            }
            .padding(4)
            .background(Theme.hudPanel)
            .overlay(Rectangle().stroke(Theme.hudInk, lineWidth: 2))
        }
        .padding(.horizontal, 12)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Location and scene actions")
    }

    private func locationArrow(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Theme.hudInk)
                .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
        .disabled(locationNavigationDisabled)
        .accessibilityLabel(label)
    }

    private func arrow(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 16, weight: .semibold)).foregroundStyle(Theme.hudInk)
                .frame(width: 44, height: 44)
                .background(Circle().fill(Theme.hudPanel))
                .overlay(Circle().stroke(Theme.hudInk, lineWidth: 1))
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
/// Press-and-hold dock button: fires while held, stops on release (SSL-536).
struct HoldDockButton: View {
    let title: String
    let symbol: String
    let hold: (Bool) -> Void
    @State private var down = false
    @Environment(\.glassHud) private var glass

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: symbol).font(.system(size: 14, weight: .bold))
            Text(title.uppercased()).font(AppFont.display(14)).tracking(1.2)
        }
        .foregroundStyle(glass ? (down ? Glass.cyan : Color.white) : Theme.hudInk)
        .padding(.horizontal, 12)
        .frame(minWidth: 88, minHeight: 44)
        .background(Capsule().fill(glass ? (down ? Glass.cyan.opacity(0.25) : Color.clear) : (down ? Theme.hex(0xD7E6F7) : Theme.hudPanel)))
        .overlay(Capsule().stroke(glass ? Color.white.opacity(0.6) : Theme.hudInk, lineWidth: 1))
        .contentShape(Capsule())
        .gesture(DragGesture(minimumDistance: 0)
            .onChanged { _ in if !down { down = true; hold(true) } }
            .onEnded { _ in down = false; hold(false) })
        .accessibilityLabel(title)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { hold(true); hold(false) }
    }
}

struct DockButton: View {
    let title: String
    let symbol: String
    let action: () -> Void
    var coachTarget: String? = nil
    @Environment(\.glassHud) private var glass

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: symbol).font(.system(size: 14, weight: .bold))
                Text(title.uppercased()).font(AppFont.display(14)).tracking(1.2).lineLimit(1).fixedSize()
            }
            .foregroundStyle(glass ? Color.white : Theme.hudInk)
            .padding(.horizontal, 8)
            .frame(minWidth: 88, minHeight: 44)
            .background(Capsule().fill(glass ? Color.clear : Theme.hudPanel))
            .overlay(Capsule().stroke(glass ? Color.white.opacity(0.6) : Theme.hudInk, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .coachTargetIfPresent(coachTarget)
    }
}

private struct DockBackdrop: ViewModifier {
    let glass: Bool
    func body(content: Content) -> some View {
        if glass { content.glowPanel(Capsule()) }
        else { content.background(Capsule().fill(Theme.hudPanel)).overlay(Capsule().stroke(Theme.hudInk, lineWidth: 1)) }
    }
}
