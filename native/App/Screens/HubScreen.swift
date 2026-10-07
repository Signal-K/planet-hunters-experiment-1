import SwiftUI
import LandnamCore

/// Earth Base: the terrain scene with the player's structures standing on it,
/// a francs rail on top and a dock of destinations along the bottom
/// (mirrors web HubScreen + HubWorldBackground).
struct HubScreen: View {
    @Environment(GameStore.self) private var store

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            let portrait = h > w * 1.3
            let ground = portrait ? 0.36 : 0.28
            let xs: [CGFloat] = portrait ? [0.22, 0.58, 0.88] : [0.30, 0.64, 0.88]
            let k = min(max(w / 402, 0.8), h / 874 * 1.25 + 0.6)
            let groundY = h * (1 - ground)
            ZStack(alignment: .topLeading) {
                TerrainScene(composition: .earthBaseWide, ground: ground)
                building("Launchpad", sprite: "base/launchpad_flat.png", aspect: 192.0 / 318, width: 84 * k * 0.62,
                         x: w * xs[0], groundY: groundY + 2 * k) { store.go(.launchpad) }
                building("Hangar", sprite: "base/hangar_flat.png", aspect: 182.0 / 155, width: 176 * k * 0.62,
                         x: w * xs[1], groundY: groundY + 2 * k) { store.go(.hangar) }
                building("Exchange", sprite: "base/exchange_flat.png", aspect: 1153.0 / 461, width: 210 * k * 0.62,
                         x: w * xs[2], groundY: groundY + 2 * k) { store.go(.market) }
                topHud
                dock.frame(maxHeight: .infinity, alignment: .bottom)
            }
        }
        .background(Theme.bg)
        .ignoresSafeArea()
    }

    private var topHud: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                Eyebrow(text: "Earth Base")
                Text("Landnam").font(AppFont.display(23)).foregroundStyle(Theme.ink)
            }
            RailCard(symbol: "circle.dashed") {
                Text(Economy.format(francs: store.player.francs)).font(AppFont.mono(14)).foregroundStyle(Theme.ink)
            }
            RailCard(symbol: "checkmark.seal", accent: Theme.teal) {
                Text("\(store.player.missionsDone) CONTRACTS").font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.ink)
            }
        }
        .padding(.horizontal, 16).padding(.top, 16).padding(.bottom, 24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LinearGradient(colors: [Theme.bg.opacity(0.68), Theme.bg.opacity(0.22), .clear], startPoint: .top, endPoint: .bottom))
    }

    private func building(_ name: String, sprite: String, aspect: CGFloat, width: CGFloat, x: CGFloat, groundY: CGFloat, tap: @escaping () -> Void) -> some View {
        Button(action: tap) {
            VStack(spacing: 4) {
                Art.view(sprite).resizable().interpolation(.high).aspectRatio(aspect, contentMode: .fit).frame(width: width)
                Text(name.uppercased()).font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.ink)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.border, lineWidth: 1))
            }
        }
        .buttonStyle(.plain)
        .position(x: x, y: groundY - width / aspect / 2 + 18)
    }

    private var dock: some View {
        HStack(spacing: 6) {
            Spacer(minLength: 0)
            dockButton("Missions", "list.bullet.rectangle", accent: true) { store.go(.missions) }
            dockButton("Market", "cart") { store.go(.market) }
            dockButton("Hangar", "shippingbox") { store.go(.hangar) }
            Menu {
                ForEach(Screen.allCases.filter { !$0.needsMissionContext }, id: \.self) { s in
                    Button(s.rawValue) { store.go(s) }
                }
            } label: { dockLabel("All", "square.grid.2x2", accent: false) }
            .menuStyle(.borderlessButton).fixedSize()
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 10).padding(.vertical, 10)
        .frame(maxWidth: .infinity)
        .background(Theme.bg.opacity(0.9))
        .overlay(alignment: .top) { Rectangle().fill(Theme.hairline).frame(height: 1) }
    }

    private func dockButton(_ title: String, _ symbol: String, accent: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) { dockLabel(title, symbol, accent: accent) }.buttonStyle(.plain)
    }

    private func dockLabel(_ title: String, _ symbol: String, accent: Bool) -> some View {
        VStack(spacing: 4) {
            Image(systemName: symbol).font(.system(size: 14, weight: .semibold))
            Text(title.uppercased()).font(AppFont.display(14)).tracking(0.6).lineLimit(1).fixedSize()
        }
        .foregroundStyle(accent ? Color.white : Theme.ink)
        .padding(.horizontal, 10).frame(minWidth: 64, minHeight: 44)
        .background(accent ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1.5))
    }
}
