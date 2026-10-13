import SwiftUI
import LandnamCore

/// SSL-553: the core stage lands back on the base pad, then the delivery sheet settles every unit of the haul:
/// deliver to the client (fulfils the contract), store in the underground silo, or sell at the market price.
struct HomecomingScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var landedAt = Date()
    @State private var split: HomeDelivery.Split?
    private static let landing = 2.6

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30)) { ctx in
            let t = reduceMotion ? Self.landing : ctx.date.timeIntervalSince(landedAt)
            let f = min(1, t / Self.landing)
            let lift = CGFloat(pow(1 - f, 2)) * 900
            ZStack {
                HubScreen(homecoming: true, padLift: lift).allowsHitTesting(false)
                if f >= 1 { sheet.transition(.opacity) }
            }
        }
    }

    private var cargo: Cargo { (store.state.lastCargo ?? [:]).filter { $0.value > 0 } }

    @ViewBuilder private var sheet: some View {
        let mission = store.mission
        let demand = HomeDelivery.demand(mission, cargo: cargo)
        let silo = HomeDelivery.silo(store.player, cargo: cargo)
        let current = split ?? HomeDelivery.defaultSplit(cargo, demand: demand, siloFree: silo.free)
        let totals = HomeDelivery.totals(current)
        let payout = HomeDelivery.clientPayout(mission, split: current, demand: demand, missionsDone: store.player.missionsDone)
        let sellValue = HomeDelivery.marketValue(store.player, units: HomeDelivery.pick(current, .sell), now: store.now)
        let short = demand.reduce(0) { $0 + max(0, $1.value - (current[$1.key]?.client ?? 0)) }
        let client = mission?.client.flatMap { id in Clients.all.first { $0.id == id } }
        GeometryReader { g in
            ZStack {
                Color(red: 0.06, green: 0.08, blue: 0.16).opacity(0.45).ignoresSafeArea()
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Cargo home").font(AppFont.display(22)).foregroundStyle(Self.navy)
                            Text([mission?.title, client.map { "for \($0.name)" }].compactMap { $0 }.joined(separator: " · "))
                                .font(AppFont.body(13)).foregroundStyle(Self.steel)
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
                    HStack(spacing: 14) {
                        summary("Client", demand.isEmpty ? "—" : (payout > 0 ? "F\(payout.formatted())" : "Short \(short)"), warn: payout == 0 && !demand.isEmpty)
                        summary("Silo", "\(totals.silo) U", warn: false)
                        summary("Sell", "F\(sellValue.formatted())", warn: false)
                        Spacer()
                        Button { store.homeDelivery(current) } label: {
                            Text("Settle cargo").font(AppFont.display(16)).foregroundStyle(Self.cream)
                                .padding(.horizontal, 18).frame(minHeight: 44).background(Self.navy)
                        }
                        .accessibilityIdentifier("delivery-confirm")
                    }
                }
                .padding(16)
                .frame(width: min(980, g.size.width - 24)).frame(maxHeight: g.size.height - 24)
                .background(Self.cream)
                .overlay(Rectangle().stroke(Self.navy, lineWidth: 3))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func card(_ id: String, row: HomeDelivery.Row, demand: Cargo, silo: HomeDelivery.Silo, current: HomeDelivery.Split) -> some View {
        let meta = Minerals.byId[id]
        let price = Market.unitPrice(id, player: store.player, clientId: nil, now: store.now).price
        let siloLeft = max(0, silo.free - HomeDelivery.totals(current).silo)
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(meta?.name ?? id).font(AppFont.display(16)).foregroundStyle(Self.navy)
                Spacer()
                Text("\(row.total) U").font(AppFont.mono(14)).foregroundStyle(Self.steel)
            }
            HStack(spacing: 6) {
                choice(id, .client, "Deliver", row.client, note: (demand[id] ?? 0) > 0 ? "Needs \(demand[id]!)" : "Not needed", tint: Color(red: 0.882, green: 0.922, blue: 0.973), demand: demand, silo: silo, current: current)
                choice(id, .silo, "Silo", row.silo, note: silo.built ? "\(siloLeft) free" : "No silo", tint: Color(red: 0.902, green: 0.922, blue: 0.945), demand: demand, silo: silo, current: current)
                choice(id, .sell, "Sell", row.sell, note: "F\(price.formatted()) ea", tint: Color(red: 0.937, green: 0.925, blue: 0.894), demand: demand, silo: silo, current: current)
            }
        }
        .padding(10).background(Color.white.opacity(0.55)).overlay(Rectangle().stroke(Self.steel.opacity(0.5), lineWidth: 2))
    }

    private func choice(_ id: String, _ d: HomeDelivery.Destination, _ title: String, _ n: Int, note: String, tint: Color, demand: Cargo, silo: HomeDelivery.Silo, current: HomeDelivery.Split) -> some View {
        VStack(spacing: 4) {
            Text(title).font(AppFont.body(12, "SemiBold")).foregroundStyle(Self.steel)
            HStack(spacing: 2) {
                stepper("minus") { split = HomeDelivery.release(current, id: id, from: d, siloFree: silo.free) }
                Text("\(n)").font(AppFont.display(18)).foregroundStyle(Self.navy).frame(minWidth: 22)
                stepper("plus") { split = HomeDelivery.shift(current, id: id, to: d, demand: demand, siloFree: silo.free) }
            }
            Text(note).font(AppFont.body(11)).foregroundStyle(Self.steel).lineLimit(1).minimumScaleFactor(0.7)
        }
        .padding(6).frame(maxWidth: .infinity).background(tint)
        .accessibilityElement(children: .contain).accessibilityLabel("\(title) \(n)")
    }

    private func stepper(_ icon: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 12, weight: .bold)).foregroundStyle(Self.navy).frame(width: 28, height: 28)
                .background(Self.cream).overlay(Rectangle().stroke(Self.navy, lineWidth: 2))
        }
        .frame(width: 32, height: 44).contentShape(Rectangle())
    }

    private func siloMeter(used: Int, capacity: Int, built: Bool) -> some View {
        VStack(alignment: .trailing, spacing: 4) {
            Text(built ? "Silo \(used)/\(capacity)" : "No silo built").font(AppFont.mono(13)).foregroundStyle(Self.navy)
            ZStack(alignment: .leading) {
                Rectangle().fill(Self.steel.opacity(0.25))
                Rectangle().fill(Color(red: 0.25, green: 0.5, blue: 0.95)).frame(width: capacity > 0 ? 120 * min(1, CGFloat(used) / CGFloat(capacity)) : 0)
            }.frame(width: 120, height: 8)
        }
    }

    private func summary(_ k: String, _ v: String, warn: Bool) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(k).font(AppFont.body(11)).foregroundStyle(Self.steel)
            Text(v).font(AppFont.display(15)).foregroundStyle(warn ? Self.brick : Self.navy)
        }
    }

    static let cream = Color(red: 0.957, green: 0.945, blue: 0.918)
    static let navy = Color(red: 0.12, green: 0.16, blue: 0.32)
    static let steel = Color(red: 0.33, green: 0.38, blue: 0.47)
    static let brick = Color(red: 0.608, green: 0.231, blue: 0.196)
}
