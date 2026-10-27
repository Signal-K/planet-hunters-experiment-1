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
            Item(id: "build", label: "Build", detail: "New structures and launch support", symbol: "building.2", primary: true, run: onBuild),
            Item(id: "contracts", label: "New mission", detail: "Client contracts and free runs", symbol: "paperplane", primary: true, run: { store.go(.missions) }),
            Item(id: "market", label: "Marketplace", detail: marketDetail(hasMarket), symbol: "cart", primary: true,
                 run: { store.go(.market) }),
        ]
    }

    private var rest: [Item] {
        var rows: [Item] = []
        let ownsOrbitalInstrument = store.player.transitSatelliteLaunchedAt != nil
            || store.player.deepSpaceTelescopeBuilt
            || store.player.deepSpaceTelescopeLaunchedAt != nil
            || store.player.saturnImagerLaunchedAt != nil
        let hasControlStation = store.player.placed.contains("control-station")
        if hasControlStation || ownsOrbitalInstrument { rows.append(Item(id: "instruments", label: "Instruments", detail: "Satellites, telescopes and their feeds", symbol: "antenna.radiowaves.left.and.right", run: { store.go(.instrumentHub) })) }
        rows.append(Item(id: "mission-log", label: "Mission log", detail: "Past runs and what they paid", symbol: "list.bullet.rectangle", run: { store.go(.missionHistory) }))
        rows.append(Item(id: "narrative-ledger", label: "Narrative ledger", detail: "What is live, adapting and planned", symbol: "map", run: { store.go(.narrativeLedger) }))
        rows.append(Item(id: "community-research", label: "Community research", detail: "Choose a weekly path and earn permanent rewards", symbol: "telescope", run: { store.go(.communityResearch) }))
        return rows
    }

    var body: some View {
        GeometryReader { geo in
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
                    Text("AGENCY AND RESEARCH").font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.ink).frame(maxWidth: .infinity, alignment: .leading)
                    grid(rest)
                }
                .padding(16)
            }
            // Bounded by the real window: a landscape phone is under 400pt tall, so a fixed 520 ran off both edges.
            .frame(maxWidth: 640, maxHeight: min(520, max(200, geo.size.height - 24)))
            .background(Theme.hudPanel, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink, lineWidth: 2))
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
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
