import SwiftUI
import LandnamCore

/// SSL-553: the core stage lands back on the base pad, then the delivery sheet settles every unit of the haul:
/// deliver to the client (fulfils the contract), store in the Surface Silo, or sell at the market price.
struct HomecomingScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var landedAt = Date()
    @State private var split: HomeDelivery.Split?
    /// Set when the player settles: crates leave the hold and the rocket is taken apart, then the delivery is applied.
    @State private var settling: (at: Date, split: HomeDelivery.Split)?
    /// Fixtures and screenshots: start settling once the sheet is up, as if the player tapped Settle cargo.
    var autoSettle = false
    private static let landing = 2.6
    private static let settle = 2.4
    private static let maxCrates = 8

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30)) { ctx in
            let t = reduceMotion ? Self.landing : ctx.date.timeIntervalSince(landedAt)
            let f = min(1, t / Self.landing)
            let lift = CGFloat(pow(1 - f, 2)) * 900
            let st = settling.map { reduceMotion ? Self.settle : ctx.date.timeIntervalSince($0.at) }
            let dismantle = CGFloat(max(0, min(1, ((st ?? 0) - 0.5) / 1.6)))
            ZStack {
                HubScreen(homecoming: true, padLift: lift, padDismantle: dismantle).allowsHitTesting(false)
                if f >= 1 && settling == nil { sheet.transition(.opacity) }
                if let st, let s = settling { settleOverlay(split: s.split, t: st) }
            }
            .task { if autoSettle { try? await Task.sleep(for: .seconds(0.2)); autoSettleIfNeeded() } }
        }
    }

    private func autoSettleIfNeeded() {
        guard autoSettle, settling == nil else { return }
        let c = cargo
        let demand = HomeDelivery.demand(store.mission, cargo: c)
        let room = HomeDelivery.silo(store.player, cargo: c)
        settle(HomeDelivery.defaultSplit(c, demand: demand, siloFree: store.player.freeHaulDisposition == .store ? room.limit : room.free))
    }

    private var cargo: Cargo { (store.state.lastCargo ?? [:]).filter { $0.value > 0 } }

    @ViewBuilder private var sheet: some View {
        let mission = store.mission
        let demand = HomeDelivery.demand(mission, cargo: cargo)
        let silo = HomeDelivery.silo(store.player, cargo: cargo)
        let current = split ?? HomeDelivery.defaultSplit(cargo, demand: demand, siloFree: store.player.freeHaulDisposition == .store ? silo.limit : silo.free)
        let totals = HomeDelivery.totals(current)
        let payout = HomeDelivery.clientPayout(mission, split: current, demand: demand, missionsDone: store.player.missionsDone)
        let sellValue = HomeDelivery.marketValue(store.player, units: HomeDelivery.pick(current, .sell), now: store.now)
        let short = demand.reduce(0) { $0 + max(0, $1.value - (current[$1.key]?.client ?? 0)) }
        let client = mission?.client.flatMap { id in Clients.all.first { $0.id == id } }
        GeometryReader { g in
            ZStack {
                Theme.tokenPurpleDepth.opacity(0.45).ignoresSafeArea()
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Cargo home").font(AppFont.display(22)).foregroundStyle(Self.foreground)
                            Text([mission?.title, client.map { "for \($0.name)" }].compactMap { $0 }.joined(separator: " · "))
                                .font(AppFont.body(14)).foregroundStyle(Self.muted)
                        }
                        Spacer()
                        siloMeter(used: silo.used + totals.silo, capacity: silo.capacity, built: silo.built)
                    }
                    ScrollView {
                        let cols = min(980, g.size.width - 24) > 640 ? [GridItem(.flexible()), GridItem(.flexible())] : [GridItem(.flexible())]
                        LazyVGrid(columns: cols, spacing: 10) {
                            ForEach(cargo.keys.sorted(), id: \.self) { id in
                                card(id, row: current[id] ?? .init(), demand: demand, silo: silo, current: current)
                            }
                        }
                    }
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 16) {
                            settlementSummary(demand: demand, payout: payout, short: short, totals: totals, sellValue: sellValue)
                            Spacer()
                            settleButton(current)
                        }
                        VStack(alignment: .leading, spacing: 12) {
                            settlementSummary(demand: demand, payout: payout, short: short, totals: totals, sellValue: sellValue)
                            settleButton(current).frame(maxWidth: .infinity)
                        }
                    }
                }
                .padding(16)
                .frame(width: min(980, g.size.width - 24)).frame(maxHeight: g.size.height - 24)
                .background(Self.panel)
                .overlay(Rectangle().stroke(Self.foreground, lineWidth: 3))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func settlementSummary(demand: Cargo, payout: Int, short: Int, totals: HomeDelivery.Row, sellValue: Int) -> some View {
        HStack(alignment: .top, spacing: 16) {
            summary("Client", demand.isEmpty ? "—" : (payout > 0 ? "F\(payout.formatted())" : "Short \(short)"), warn: payout == 0 && !demand.isEmpty)
            summary("Silo", "\(totals.silo) U", warn: false)
            summary("Sell", "F\(sellValue.formatted())", warn: false)
        }
        .fixedSize(horizontal: true, vertical: false)
    }

    private func settleButton(_ current: HomeDelivery.Split) -> some View {
        Button { settle(current) } label: {
            Text("SETTLE CARGO").font(AppFont.display(16)).foregroundStyle(Self.panel)
                .padding(.horizontal, 16).frame(minHeight: 48).frame(maxWidth: .infinity)
                .background(Self.foreground, in: RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain).accessibilityIdentifier("delivery-confirm")
    }

    private func settle(_ current: HomeDelivery.Split) {
        guard settling == nil else { return }
        settling = (Date(), current)
        if reduceMotion { store.homeDelivery(current); return }
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(Self.settle))
            store.homeDelivery(current)
        }
    }

    private static func mineralColor(_ id: String) -> Color {
        let hex = Minerals.byId[id]?.colorHex ?? "#c8ccd2"
        return UInt32(hex.dropFirst(), radix: 16).map { Theme.hex($0) } ?? Self.muted
    }

    private struct Crate: Identifiable { let id: Int; let stored: Bool; let color: Color }

    private func crates(_ split: HomeDelivery.Split) -> [Crate] {
        var out: [Crate] = []
        for id in split.keys.sorted() {
            let row = split[id] ?? .init()
            let color = Self.mineralColor(id)
            for _ in 0..<row.silo where out.count < Self.maxCrates { out.append(Crate(id: out.count, stored: true, color: color)) }
            for _ in 0..<row.sell where out.count < Self.maxCrates { out.append(Crate(id: out.count, stored: false, color: color)) }
        }
        return out
    }

    /// Stored crates sink into the ground, sold crates fly to the francs counter; a note says what happened.
    private func settleOverlay(split: HomeDelivery.Split, t: TimeInterval) -> some View {
        let totals = HomeDelivery.totals(split)
        let sale = HomeDelivery.marketValue(store.player, units: HomeDelivery.pick(split, .sell), now: store.now)
        let note = [totals.sell > 0 ? "Sold \(totals.sell) for F\(sale.formatted())" : nil, totals.silo > 0 ? "Stored \(totals.silo) in the silo" : nil, "Rocket recycled"].compactMap { $0 }.joined(separator: " · ")
        return GeometryReader { g in
            ZStack {
                ForEach(crates(split)) { c in
                    let p = CGFloat(max(0, min(1, (t - Double(c.id) * 0.14) / 1.1)))
                    let q = (p * 10).rounded(.down) / 10
                    RoundedRectangle(cornerRadius: 2).fill(c.color).frame(width: 14, height: 14)
                        .overlay(RoundedRectangle(cornerRadius: 2).stroke(Self.foreground, lineWidth: 2))
                        .opacity(p <= 0 || p >= 1 ? 0 : 1)
                        .scaleEffect(c.stored ? 1 - 0.5 * q : 1 - 0.4 * q)
                        .position(x: g.size.width * 0.5 + CGFloat(c.id % 4) * 10 - 15 + (c.stored ? 0 : 60 * q),
                                  y: g.size.height * 0.7 + (c.stored ? 110 * q : -160 * q))
                }
                VStack {
                    // Clear sky under the HUD: at the bottom it sat over the building labels and the mission bar.
                    Text(note.uppercased()).font(AppFont.display(14)).tracking(0.8).multilineTextAlignment(.center).foregroundStyle(Self.foreground)
                        .padding(.horizontal, 16).padding(.vertical, 8).background(Self.panel, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Self.foreground, lineWidth: 2))
                        .padding(.top, 150).padding(.horizontal, 16).accessibilityIdentifier("settle-note")
                    Spacer()
                }
            }
        }
        .allowsHitTesting(false)
    }

    private func card(_ id: String, row: HomeDelivery.Row, demand: Cargo, silo: HomeDelivery.Silo, current: HomeDelivery.Split) -> some View {
        let meta = Minerals.byId[id]
        let price = Market.unitPrice(id, player: store.player, clientId: nil, now: store.now).price
        let siloUsed = HomeDelivery.totals(current).silo
        let siloNote = !silo.built ? "No silo" : siloUsed > silo.free ? "Sells \(siloUsed - silo.free) cheapest" : "\(silo.free - siloUsed) free"
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(meta?.name ?? id).font(AppFont.display(16)).foregroundStyle(Self.foreground)
                Spacer()
                Text("\(row.total) U").font(AppFont.mono(14)).foregroundStyle(Self.muted)
            }
            VStack(spacing: 8) {
                choice(id, .client, "Deliver to client", row.client, note: (demand[id] ?? 0) > 0 ? "Needs \(demand[id]!)" : "Not needed", tint: Theme.tokenCyan.opacity(0.08), demand: demand, silo: silo, current: current)
                choice(id, .silo, "Store in silo", row.silo, note: siloNote, tint: Theme.tokenCyan.opacity(0.08), demand: demand, silo: silo, current: current)
                choice(id, .sell, "Sell", row.sell, note: "F\(price.formatted()) ea", tint: Theme.tokenCyan.opacity(0.08), demand: demand, silo: silo, current: current)
            }
        }
        .padding(12).background(Theme.tokenBlueprintBlue.opacity(0.16), in: RoundedRectangle(cornerRadius: 14))
    }

    private func choice(_ id: String, _ d: HomeDelivery.Destination, _ title: String, _ n: Int, note: String, tint: Color, demand: Cargo, silo: HomeDelivery.Silo, current: HomeDelivery.Split) -> some View {
        let row = current[id] ?? .init()
        let siloUsed = HomeDelivery.totals(current).silo
        let available = d == .client ? (demand[id] ?? 0) > 0 : d == .silo ? silo.built : true
        let canAdd = available && row.total > n
            && (d != .client || n < (demand[id] ?? 0))
            && (d != .silo || siloUsed < silo.limit)
        let canRemove = available && n > 0 && (d != .sell || siloUsed < silo.limit)
        return HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(AppFont.body(14, "SemiBold")).foregroundStyle(Self.foreground)
                Text(note).font(AppFont.body(14)).foregroundStyle(Self.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 4) {
                stepper("minus", label: "Fewer \(Minerals.byId[id]?.name ?? id) to \(title)", enabled: canRemove) {
                    split = HomeDelivery.release(current, id: id, from: d, siloFree: silo.limit)
                }
                Text("\(n)").font(AppFont.display(18)).monospacedDigit().foregroundStyle(Self.foreground).frame(minWidth: 32)
                stepper("plus", label: "More \(Minerals.byId[id]?.name ?? id) to \(title)", enabled: canAdd) {
                    split = HomeDelivery.shift(current, id: id, to: d, demand: demand, siloFree: silo.limit)
                }
            }
            .fixedSize()
        }
        .padding(8).background(tint, in: RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .contain).accessibilityLabel("\(title) \(n)")
    }

    private func stepper(_ icon: String, label: String, enabled: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 18, weight: .bold)).foregroundStyle(Self.panel)
                .frame(width: 44, height: 44)
                .background(Self.foreground, in: RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain).disabled(!enabled).opacity(enabled ? 1 : 0.35)
        .accessibilityLabel(label)
    }

    private func siloMeter(used: Int, capacity: Int, built: Bool) -> some View {
        VStack(alignment: .trailing, spacing: 4) {
            Text(built ? "Silo \(used)/\(capacity)" : "No silo built").font(AppFont.mono(14)).foregroundStyle(Self.foreground)
            ZStack(alignment: .leading) {
                Rectangle().fill(Self.muted.opacity(0.25))
                Rectangle().fill(Theme.tokenCyan).frame(width: capacity > 0 ? 120 * min(1, CGFloat(used) / CGFloat(capacity)) : 0)
            }.frame(width: 120, height: 8)
        }
    }

    private func summary(_ k: String, _ v: String, warn: Bool) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(k).font(AppFont.body(14)).foregroundStyle(Self.muted)
            Text(v).font(AppFont.display(15)).foregroundStyle(warn ? Self.warning : Self.foreground)
        }
    }

    static let panel = Theme.tokenPurpleDepth
    static let foreground = Theme.tokenMapSun
    static let muted = Theme.tokenMapSun.opacity(0.78)
    static let warning = Theme.tokenCrit
}
