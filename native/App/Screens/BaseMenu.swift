import SwiftUI
import LandnamCore

/// The base's main menu (mirrors web `BaseMenuSheet`): the places a player goes from the base, one plain row each.
struct BaseMenu: View {
    @Environment(GameStore.self) private var store
    let onClose: () -> Void

    private struct Item: Identifiable {
        let id: String, label: String, detail: String, screen: Screen
    }

    private var items: [Item] {
        var rows = [Item(id: "contracts", label: "Contracts", detail: "Client orders that pay for a run", screen: .missions)]
        if store.player.placed.contains("launchpad") { rows.append(Item(id: "hangar", label: "Hangar", detail: "Ships and their parts", screen: .hangar)) }
        if store.player.placed.contains("market") { rows.append(Item(id: "market", label: "Exchange", detail: "Sell what you have mined", screen: .market)) }
        rows.append(Item(id: "mission-log", label: "Mission log", detail: "Past runs and what they paid", screen: .missionHistory))
        rows.append(Item(id: "subsurface", label: "Subsurface", detail: "Silo and underground rooms", screen: .hubSubsurface))
        if store.player.freeOperations { rows.append(Item(id: "sites", label: "Sites", detail: "Places to survey and settle", screen: .surfaceOps)) }
        // No control station building exists: the screen is the feed from telescopes you own.
        if store.player.transitSatelliteLaunchedAt != nil || store.player.placed.contains("ground-telescope") {
            rows.append(Item(id: "control-station", label: "Telescope feeds", detail: "Observations from your telescopes", screen: .instrumentHub))
        }
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
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 260), spacing: 8)], spacing: 8) {
                        ForEach(items) { item in
                            Button { onClose(); store.go(item.screen) } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.label.uppercased()).font(AppFont.display(16)).tracking(1.1).foregroundStyle(Theme.ink)
                                    Text(item.detail).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                                }
                                .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading).padding(.horizontal, 14).padding(.vertical, 8)
                                .background(Theme.paper, in: RoundedRectangle(cornerRadius: 12))
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 1))
                            }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier("base-menu-\(item.id)")
                        }
                    }
                }
                .padding(16)
            }
            .frame(maxWidth: 640, maxHeight: 420)
            .background(Theme.hudPanel, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink, lineWidth: 2))
            .padding(12)
        }
        .accessibilityIdentifier("base-menu")
    }
}
