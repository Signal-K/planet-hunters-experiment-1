import SwiftUI
import LandnamCore

/// Marketplace panel (web `MarketScreen.tsx`): spot prices and the balance, with Sell for everyone.
/// The built Exchange adds Buy (at a dealer markup) and per-mineral sell alerts.
struct MarketScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(Services.self) private var services: Services?
    @Environment(\.flatLayout) private var flat
    @State private var showSettings = false
    @State private var armed = false
    @State private var tab: Tab = .sell
    @State private var targets: [String: Int] = [:]
    enum Tab: String, CaseIterable { case sell, buy, alerts }

    init(tab: Tab = .sell) { _tab = State(initialValue: tab) }
    private let zones = HUDZones.standard

    var body: some View {
        // The inner reader ignores the safe area to fill the screen, which zeroes its own insets: read them out here.
        GeometryReader { outer in content(safe: outer.safeAreaInsets) }
            .background(Theme.tokenBlueprintBg.ignoresSafeArea())
            .task(id: armed) {
                guard armed else { return }
                try? await Task.sleep(nanoseconds: 4_000_000_000)
                if !Task.isCancelled { armed = false }
            }
    }

    private func content(safe: EdgeInsets) -> some View {
        GeometryReader { geo in
            let short = geo.size.height < 520
            let wide = geo.size.width >= 900 && geo.size.height >= 640
            let landscapeSideInset = short ? max(24, safe.leading + 12) : max(12, safe.leading + 8)
            let coachInset: CGFloat = FlightPlan.coach(store.player, screen: .market, includeHidden: true) == nil ? 0 : 68
            ZStack(alignment: .topLeading) {
                Image("scene-exchange-plate-dock")
                    .resizable()
                    .interpolation(.none)
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()
                LinearGradient(stops: [
                    .init(color: Theme.blue.opacity(0.18), location: 0),
                    .init(color: Theme.blue.opacity(0.38), location: 0.48),
                    .init(color: Theme.hudTrack.opacity(0.78), location: 0.68),
                    .init(color: Theme.blue.opacity(0.34), location: 1),
                ], startPoint: .top, endPoint: .bottom)
                .blendMode(.multiply)
                .allowsHitTesting(false)
                panel(compact: short || geo.size.width < 500)
                    .frame(maxWidth: wide ? 720 : .infinity, maxHeight: .infinity, alignment: .top)
                    .padding(.top, max((short ? 56 : 76) + coachInset, safe.top + 56 + coachInset))
                    .padding(.bottom, short ? max(68, safe.bottom + 60) : 88)
                    .padding(.leading, landscapeSideInset)
                    .padding(.trailing, short ? max(24, safe.trailing + 12) : max(12, safe.trailing + 8))
                    .frame(maxWidth: .infinity, alignment: .center)
                Button("BACK") { store.go(.hub) }
                    .font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.ink)
                    .frame(minWidth: 44, minHeight: 44).padding(.horizontal, 12)
                    .background(Theme.paper).overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                    .buttonStyle(.plain)
                    .padding(.leading, landscapeSideInset)
                    .padding(.top, max(12, safe.top + 8))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
        .ignoresSafeArea(edges: [.top, .horizontal])
    }

    // MARK: panel

    private var exchangeBuilt: Bool { Marketplace.exchangeBuilt(store.player) }
    private var board: [SpotQuote] { Marketplace.board(store.player, now: store.now) }
    private var refinedLots: [Lot] {
        store.player.refinedGoods.keys.sorted().compactMap { id in
            let qty = store.player.refinedGoods[id] ?? 0
            guard qty > 0, let recipe = Refinery.byId[id] else { return nil }
            return Lot(id: id, name: recipe.name, qty: qty, unit: Refinery.unitPrice(recipe, player: store.player, now: store.now))
        }
    }
    private var heldValue: Int {
        board.reduce(0) { $0 + $1.spot * $1.held } + refinedLots.reduce(0) { $0 + $1.unit * $1.qty }
    }
    private var hasCargo: Bool { board.contains { $0.held > 0 } || !refinedLots.isEmpty }

    private func panel(compact: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("SPOT PRICES").font(AppFont.display(14, "ExtraBold")).tracking(1.1).foregroundStyle(Theme.ink)
                Spacer()
                Text(Economy.format(francs: store.player.francs))
                    .font(AppFont.display(16, "ExtraBold")).foregroundStyle(Theme.ink)
                    .accessibilityLabel("Balance \(Economy.format(francs: store.player.francs))")
                    .accessibilityIdentifier("market-balance")
            }
            HStack(spacing: 6) {
                ForEach(Tab.allCases, id: \.self) { t in
                    Button { tab = t } label: {
                        Text(t.rawValue.uppercased()).font(AppFont.display(14, "ExtraBold")).tracking(1.1)
                            .foregroundStyle(tab == t ? Theme.paper : Theme.ink)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(tab == t ? Theme.ink : Theme.paper)
                            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(tab == t ? .isSelected : [])
                    .accessibilityIdentifier("market-tab-\(t.rawValue)")
                }
            }
            if tab != .sell && !exchangeBuilt {
                locked
            } else {
                Group {
                    if flat { list.frame(maxHeight: .infinity, alignment: .top) }   // ImageRenderer draws nothing inside a ScrollView
                    else { ScrollView { list } }
                }
                .overlay(alignment: .top) { Rectangle().fill(Theme.ink).frame(height: 1) }
            }
            if tab == .sell { sellAllButton }
        }
        .padding(12)
        .background(Theme.paper.opacity(0.94))
        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Marketplace")
    }

    private var list: some View {
        VStack(spacing: 0) {
            ForEach(rows) { q in row(q, compact: false) }
            if tab == .sell { ForEach(refinedLots) { refinedRow($0) } }
        }
    }

    /// Selling leads with what you hold; the other tabs list the whole board by price.
    private var rows: [SpotQuote] {
        tab == .sell ? board.sorted { ($0.held > 0 ? 0 : 1) < ($1.held > 0 ? 0 : 1) } : board
    }

    private var locked: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(tab == .buy ? "Build the Exchange to buy ore." : "Build the Exchange to set sell alerts.")
                .font(AppFont.display(14, "ExtraBold")).foregroundStyle(Theme.ink)
            Button { store.go(.build) } label: {
                Text("BUILD THE EXCHANGE").font(AppFont.display(14, "ExtraBold")).tracking(1.1).foregroundStyle(Theme.ink)
                    .padding(.horizontal, 16).frame(minHeight: 44)
                    .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("market-build-exchange")
        }
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func row(_ q: SpotQuote, compact: Bool) -> some View {
        let alert = store.player.priceAlerts.first { $0.mineralId == q.id }
        let blocker = tab == .buy ? Marketplace.buyBlocker(store.player, q.id, now: store.now) : nil
        let fresh = Market.openMarketSellPrice(base: Minerals.byId[q.id]?.price ?? 0, unitsSold: 0)
        let trend: Trend = q.spot > fresh + 1 ? .up : q.spot < fresh - 1 ? .down : .flat
        return VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(q.name.uppercased()).font(AppFont.display(14, "ExtraBold")).tracking(1.1).foregroundStyle(Theme.ink)
                    Text(detail(q, alert: alert)).font(AppFont.display(14, "Medium")).foregroundStyle(Theme.ink.opacity(0.75))
                }
                Spacer(minLength: 8)
                Text(Economy.format(francs: tab == .buy ? q.ask : q.spot))
                    .font(AppFont.display(16, "ExtraBold")).foregroundStyle(Theme.ink).fixedSize()
                    .accessibilityIdentifier("market-price-\(q.id)")
                trendMark(trend)
            }
            if tab == .sell && q.held > 0 {
                if Minerals.isArtifact(q.id) {
                    Text("PROTECTED RESEARCH EVIDENCE").font(AppFont.display(14, "ExtraBold")).tracking(1.1).foregroundStyle(Theme.blue)
                } else {
                    sellActions(q)
                }
            }
            if tab == .buy { buyActions(q, blocker: blocker) }
            if tab == .alerts { alertActions(q, alert: alert) }
        }
        .padding(.vertical, 6)
        .padding(.leading, tab == .alerts && alert?.firedAt != nil ? 8 : 0)
        .overlay(alignment: .leading) { if tab == .alerts && alert?.firedAt != nil { Rectangle().fill(Theme.blue).frame(width: 4) } }
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink.opacity(0.3)).frame(height: 1) }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("exchange-price-\(q.id)")
    }

    private func detail(_ q: SpotQuote, alert: PriceAlert?) -> String {
        switch tab {
        case .sell: return "\(q.held) held"
        case .buy: return "Spot \(Economy.format(francs: q.spot))"
        case .alerts:
            guard let alert else { return "Spot \(Economy.format(francs: q.spot))" }
            return alert.firedAt != nil ? "Hit \(Economy.format(francs: alert.target))" : "Alert at \(Economy.format(francs: alert.target))"
        }
    }

    private func sellActions(_ q: SpotQuote) -> some View {
        HStack(spacing: 6) {
            panelButton("Sell 1", id: "exchange-crate-\(q.id)") { store.sell(q.id, amount: 1) }
            if q.held > 1 { panelButton("Sell \(q.held)", id: "market-sell-all-\(q.id)") { store.sell(q.id, amount: q.held) } }
        }
    }

    private func buyActions(_ q: SpotQuote, blocker: String?) -> some View {
        HStack(spacing: 6) {
            panelButton("Buy 1", id: "market-buy-\(q.id)", disabled: blocker != nil) { store.buy(q.id, amount: 1) }
            panelButton("x10", id: "market-buy-10-\(q.id)", disabled: Marketplace.buyBlocker(store.player, q.id, amount: 10, now: store.now) != nil) { store.buy(q.id, amount: 10) }
            if let blocker { Text(blocker).font(AppFont.display(14, "Medium")).foregroundStyle(Theme.ink.opacity(0.75)).lineLimit(1) }
        }
    }

    private func alertActions(_ q: SpotQuote, alert: PriceAlert?) -> some View {
        let step = max(1, Int((Double(q.spot) * 0.05).rounded()))
        let target = targets[q.id] ?? alert?.target ?? Int((Double(q.spot) * 1.1).rounded())
        return HStack(spacing: 6) {
            panelButton("-", id: "market-alert-down-\(q.id)", minWidth: 44) { targets[q.id] = max(1, target - step) }
            Text(Economy.format(francs: target)).font(AppFont.display(14, "ExtraBold")).foregroundStyle(Theme.ink)
                .frame(minWidth: 72).accessibilityIdentifier("market-alert-target-\(q.id)")
            panelButton("+", id: "market-alert-up-\(q.id)", minWidth: 44) { targets[q.id] = target + step }
            panelButton(alert == nil ? "Set" : "Move", id: "market-alert-set-\(q.id)") { store.setPriceAlert(q.id, target: target); targets[q.id] = nil }
            if let alert { panelButton("Clear", id: "market-alert-clear-\(q.id)") { store.removePriceAlert(alert.id) } }
        }
    }

    private func refinedRow(_ lot: Lot) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(lot.name.uppercased()).font(AppFont.display(14, "ExtraBold")).tracking(1.1).foregroundStyle(Theme.ink)
                    Text("\(lot.qty) held").font(AppFont.display(14, "Medium")).foregroundStyle(Theme.ink.opacity(0.75))
                }
                Spacer()
                Text(Economy.format(francs: lot.unit)).font(AppFont.display(16, "ExtraBold")).foregroundStyle(Theme.ink)
            }
            panelButton("Sell 1", id: "exchange-crate-\(lot.id)") { store.sellRefined(lot.id, amount: 1) }
        }
        .padding(.vertical, 6)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink.opacity(0.3)).frame(height: 1) }
    }

    private func panelButton(_ title: String, id: String, disabled: Bool = false, minWidth: CGFloat = 64, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title.uppercased()).font(AppFont.display(14, "ExtraBold")).tracking(1.1)
                .foregroundStyle(disabled ? Theme.ink.opacity(0.45) : Theme.ink)
                .padding(.horizontal, 12).frame(minWidth: minWidth, minHeight: 44)
                .background(Theme.paper)
                .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .accessibilityIdentifier(id)
    }

    private var sellAllButton: some View {
        Button(action: sellAll) {
            Text((armed ? "CONFIRM \(Economy.format(francs: heldValue))" : "SELL ALL").uppercased())
                .font(AppFont.display(14, "ExtraBold")).tracking(1.1)
                .foregroundStyle(hasCargo ? Theme.paper : Theme.ink.opacity(0.45))
                .padding(.horizontal, 16).frame(maxWidth: .infinity, minHeight: 44)
                .background(hasCargo ? (armed ? Theme.blue : Theme.ink) : Theme.paper)
                .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .disabled(!hasCargo)
        .accessibilityLabel(armed ? "Confirm sell all" : "Sell all")
        .accessibilityIdentifier("sell-all-btn")
    }

    private func sellAll() {
        guard hasCargo else { return }
        if !armed { armed = true; return }
        for q in board where q.held > 0 { store.sell(q.id, amount: q.held) }
        for lot in refinedLots { store.sellRefined(lot.id, amount: lot.qty) }
        armed = false
    }

    private func trendMark(_ trend: Trend) -> some View {
        Group {
            if trend == .up { Triangle().fill(Theme.blue).frame(width: 14, height: 10) }
            else if trend == .down { Triangle().fill(Theme.ink).rotationEffect(.degrees(180)).frame(width: 14, height: 10) }
            else { Rectangle().fill(Theme.ink).frame(width: 14, height: 3) }
        }
        .accessibilityHidden(true)
    }
}

private struct Lot: Identifiable {
    let id: String
    let name: String
    let qty: Int
    let unit: Int
}

private enum Trend { case up, down, flat }

private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}
