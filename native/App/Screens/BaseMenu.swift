import SwiftUI
import LandnamCore

/// The base's main menu (mirrors web `BaseMenuSheet`): build, fly and sell first, then the places a player looks things up.
struct BaseMenu: View {
    @Environment(GameStore.self) private var store
    let onClose: () -> Void
    /// Opens in-scene placement on the base.
    let onBuild: () -> Void

    private struct Item: Identifiable {
        let id: String, label: String, detail: String, symbol: String
        var primary = false
        let run: () -> Void
    }

    private func marketDetail(_ hasMarket: Bool) -> String {
        let fired = Marketplace.firedCount(store.player)
        if fired > 0 { return fired == 1 ? "1 price alert hit" : "\(fired) price alerts hit" }
        return hasMarket ? "Spot prices, sell, buy and alerts" : "Spot prices and selling"
    }

    private var primary: [Item] {
        let hasMarket = store.player.placed.contains("market")
        return [
            Item(id: "build", label: "Build", detail: "New structures, a control station, satellites", symbol: "building.2", primary: true, run: onBuild),
            Item(id: "contracts", label: "New mission", detail: "Client contracts and free runs", symbol: "paperplane", primary: true, run: { store.go(.missions) }),
            Item(id: "market", label: "Marketplace", detail: marketDetail(hasMarket), symbol: "cart", primary: true,
                 run: { store.go(.market) }),
        ]
    }

    private var rest: [Item] {
        var rows: [Item] = []
        if store.player.placed.contains("control-station") { rows.append(Item(id: "control-station", label: "Control station", detail: "Satellites, telescopes and their feeds", symbol: "antenna.radiowaves.left.and.right", run: { store.go(.instrumentHub) })) }
        rows.append(Item(id: "mission-log", label: "Mission log", detail: "Past runs and what they paid", symbol: "list.bullet.rectangle", run: { store.go(.missionHistory) }))
        if store.player.freeOperations { rows.append(Item(id: "sites", label: "Sites", detail: "Places to survey and settle", symbol: "globe", run: { store.go(.surfaceOps) })) }
        return rows
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.45).ignoresSafeArea().onTapGesture(perform: onClose)
            ScrollView {
                VStack(spacing: 8) {
                    HStack {
                        Text("MENU").font(AppFont.display(14)).tracking(1.8).foregroundStyle(Theme.ink)
                        Spacer()
                        Button(action: onClose) {
                            Text("CLOSE").font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.ink)
                                .padding(.horizontal, 16).frame(minHeight: 44)
                                .overlay(Capsule().stroke(Theme.ink, lineWidth: 1))
                        }.buttonStyle(.plain)
                    }
                    grid(primary, single: true)
                    grid(rest)
                }
                .padding(16)
            }
            .frame(maxWidth: 640, maxHeight: 520)
            .background(Theme.hudPanel, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink, lineWidth: 2))
            .padding(12)
        }
        .accessibilityIdentifier("base-menu")
    }

    private func grid(_ items: [Item], single: Bool = false) -> some View {
        LazyVGrid(columns: single ? [GridItem(.flexible())] : [GridItem(.adaptive(minimum: 260), spacing: 8)], spacing: 8) {
            ForEach(items) { item in
                Button { onClose(); item.run() } label: {
                    HStack(spacing: 12) {
                        Image(systemName: item.symbol).font(.system(size: item.primary ? 24 : 22, weight: .semibold))
                            .foregroundStyle(item.primary ? Theme.paper : Theme.blue).frame(width: 32)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.label.uppercased()).font(AppFont.display(16)).tracking(1.1)
                            Text(item.detail).font(AppFont.body(14)).opacity(item.primary ? 0.92 : 0.8)
                        }
                        .foregroundStyle(item.primary ? Theme.paper : Theme.ink)
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, minHeight: item.primary ? 68 : 56, alignment: .leading).padding(.horizontal, 14).padding(.vertical, 8)
                    .background(item.primary ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("base-menu-\(item.id)")
            }
        }
    }
}
