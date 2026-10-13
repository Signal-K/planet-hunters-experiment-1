import SwiftUI
import LandnamCore

/// Cargo dock. Crates for held minerals sit on the conveyor; a tap or a drag onto the
/// sell pad sells one unit through the same market rules as the web Exchange.
/// The francs counter ticks. Sell All is the secondary action.
/// Swift was not compiled in the environment that wrote this file.
struct MarketScreen: View {
    @Environment(GameStore.self) private var store
    @State private var showSettings = false
    @State private var armed = false
    @State private var shownFrancs = 0
    @State private var padLot: String?
    @State private var dragging: String?
    @State private var dragOffset: CGSize = .zero
    @State private var padFrame: CGRect = .zero
    @State private var francsReady = false
    private let zones = HUDZones.standard

    var body: some View {
        GeometryReader { geo in
            let short = geo.size.height < 520
            let wide = geo.size.width >= 900 && geo.size.height >= 640
            ZStack(alignment: .topLeading) {
                Image("scene-exchange-sheet")
                    .resizable()
                    .interpolation(.none)
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()
                play(size: geo.size, short: short, wide: wide)
                    .padding(.top, short ? 60 : 76)
                    .padding(.bottom, short ? 76 : 88)
                    .padding(.horizontal, wide ? 32 : 16)
                HudGearClock(onSettings: { showSettings = true })
                    .padding(.leading, zones.topLeft.inset + (short ? 8 : 12))
                    .padding(.top, zones.topLeft.inset + (short ? 8 : 12))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                HudChips(francs: store.player.francs)
                    .padding(.trailing, zones.topRight.inset + 12)
                    .padding(.top, zones.topRight.inset + (short ? 8 : 12))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                BaseDock(tile: 44, zones: zones.dock,
                         items: [
                            ("Build", "hammer.fill", { store.go(.build) }),
                            ("Hub", "dot.radiowaves.left.and.right", { store.go(.instrumentHub) }),
                         ],
                         onPrev: { store.go(.hub) },
                         onNext: { store.go(store.player.activeMission == nil ? .missions : .launchpad) })
                    .padding(.bottom, zones.dock.bottomInset + 8)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            }
            .coordinateSpace(name: "exchange")
        }
        .background(Theme.tokenBlueprintBg.ignoresSafeArea())
        .sheet(isPresented: $showSettings) { SettingsSheet(onClose: { showSettings = false }) }
        .task(id: store.player.francs) { await tickFrancs(to: store.player.francs) }
        .task(id: padLot) {
            guard padLot != nil else { return }
            try? await Task.sleep(nanoseconds: 700_000_000)
            if !Task.isCancelled { padLot = nil }
        }
        .task(id: armed) {
            guard armed else { return }
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            if !Task.isCancelled { armed = false }
        }
    }

    @ViewBuilder
    private func play(size: CGSize, short: Bool, wide: Bool) -> some View {
        if short {
            HStack(alignment: .top, spacing: 8) {
                board.frame(width: 200)
                VStack(spacing: 8) {
                    window
                    belt
                }
                floor(compact: true).frame(width: 200)
            }
        } else if wide {
            VStack(spacing: 16) {
                HStack(alignment: .top, spacing: 24) {
                    board.frame(width: 360, alignment: .top)
                    window
                }
                belt.frame(height: 188)
                floor(compact: false).frame(height: 168)
            }
        } else {
            VStack(spacing: 12) {
                ZStack(alignment: .bottomLeading) {
                    window
                    board
                        .frame(maxWidth: 340, maxHeight: 196, alignment: .top)
                        .padding(.leading, 8)
                        .padding(.bottom, 12)
                }
                .frame(maxHeight: .infinity)
                belt.frame(minHeight: 132)
                floor(compact: false)
            }
        }
    }

    private var window: some View {
        Image("scene-exchange-plate-window-landscape")
            .resizable()
            .interpolation(.none)
            .scaledToFill()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
            .overlay(Rectangle().stroke(Theme.blue, lineWidth: 3).padding(3))
            .accessibilityHidden(true)
    }

    private var board: some View {
        VStack(alignment: .leading, spacing: 8) {
            if lots.isEmpty {
                Text("NO QUOTES")
                    .font(AppFont.display(14, "ExtraBold"))
                    .tracking(1.2)
                    .foregroundStyle(Theme.ink)
            }
            ForEach(lots) { lot in
                HStack(spacing: 8) {
                    Image(crateAsset(lot.artId))
                        .resizable()
                        .interpolation(.none)
                        .frame(width: 28, height: 24)
                    Text(lot.name.uppercased())
                        .font(AppFont.display(14, "ExtraBold"))
                        .tracking(1.1)
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Spacer(minLength: 8)
                    Text(Economy.format(francs: lot.unit))
                        .font(AppFont.display(16, "ExtraBold"))
                        .foregroundStyle(Theme.ink)
                    trendMark(lot.trend)
                }
                .frame(minHeight: 36)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(lot.name) \(Economy.format(francs: lot.unit)) \(lot.trend.label)")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.paper)
        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
        .overlay(Rectangle().stroke(Theme.blue, lineWidth: 2).padding(3))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Prices")
    }

    private var belt: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .bottom, spacing: 16) {
                if lots.isEmpty {
                    Text("HOLD IS EMPTY")
                        .font(AppFont.display(14, "ExtraBold"))
                        .tracking(1.2)
                        .foregroundStyle(Theme.ink)
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                ForEach(lots) { lot in
                    crateButton(lot)
                }
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
            .frame(minWidth: 0, maxWidth: .infinity, minHeight: 120, alignment: .bottom)
        }
        .frame(maxWidth: .infinity, minHeight: 120, alignment: .bottom)
        .background(
            Image("scene-exchange-conveyor")
                .resizable(resizingMode: .stretch)
                .interpolation(.none)
                .frame(height: 56)
                .frame(maxHeight: .infinity, alignment: .bottom),
            alignment: .bottom
        )
        .accessibilityLabel("Cargo on the conveyor")
    }

    private func floor(compact: Bool) -> some View {
        Group {
                if compact {
                VStack(alignment: .trailing, spacing: 8) {
                    pad
                    face
                    sellAllButton
                }
            } else {
                VStack(alignment: .trailing, spacing: 8) {
                    HStack(alignment: .bottom, spacing: 16) {
                        pad
                        face
                    }
                    sellAllButton
                }
            }
        }
    }

    private var pad: some View {
        ZStack(alignment: .bottom) {
            Image("scene-exchange-sell-pad")
                .resizable()
                .interpolation(.none)
                .scaledToFit()
                .frame(maxWidth: .infinity, maxHeight: 120)
            if padLot != nil {
                Image("scene-exchange-crate-on-pad")
                    .resizable()
                    .interpolation(.none)
                    .frame(width: 72, height: 80)
                    .padding(.bottom, 16)
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .frame(maxWidth: .infinity, minHeight: 88)
        .background(GeometryReader { proxy in
            Color.clear.preference(key: PadFrameKey.self, value: proxy.frame(in: .named("exchange")))
        })
        .onPreferenceChange(PadFrameKey.self) { padFrame = $0 }
        .accessibilityElement()
        .accessibilityLabel("Sell pad")
    }

    private var face: some View {
        ZStack(alignment: .bottomTrailing) {
            Image("scene-exchange-counter-machine")
                .resizable()
                .interpolation(.none)
                .scaledToFit()
                .frame(maxWidth: 320, maxHeight: 160)
            Text(grouped(shownFrancs))
                .font(AppFont.mono(16))
                .foregroundStyle(Theme.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Theme.paper)
                .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                .padding(.trailing, 10)
                .padding(.bottom, 16)
                .accessibilityLabel("Francs \(shownFrancs)")
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
    }

    private var sellAllButton: some View {
        Button(action: sellAll) {
            Text((armed ? "CONFIRM \(Economy.format(francs: total))" : "SELL ALL").uppercased())
                .font(AppFont.display(14, "ExtraBold"))
                .tracking(1.1)
                .foregroundStyle(lots.isEmpty ? Theme.ink.opacity(0.45) : Theme.ink)
                .padding(.horizontal, 16)
                .frame(minWidth: 88, minHeight: 44)
                .background(Theme.paper)
                .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .disabled(lots.isEmpty)
        .accessibilityLabel(armed ? "Confirm sell all" : "Sell all")
    }

    private func crateButton(_ lot: Lot) -> some View {
        let layers = pile(lot.qty)
        return ZStack(alignment: .top) {
            ZStack(alignment: .bottom) {
                ForEach(0..<layers, id: \.self) { index in
                    Image(crateAsset(lot.artId))
                        .resizable()
                        .interpolation(.none)
                        .frame(width: 76, height: 68)
                        .offset(y: CGFloat(-12 * index))
                }
            }
            .frame(width: 76, height: 104, alignment: .bottom)
            Text("\(lot.qty)")
                .font(AppFont.display(14, "ExtraBold"))
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Theme.paper)
                .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
        }
        .frame(minWidth: 72, minHeight: 44)
        .contentShape(Rectangle())
        .offset(dragging == lot.id ? dragOffset : .zero)
        .accessibilityElement(children: .ignore)
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel("Sell one \(lot.name). \(lot.qty) held.")
        .accessibilityAction { sellOne(lot) }
        .highPriorityGesture(DragGesture(minimumDistance: 0, coordinateSpace: .named("exchange"))
            .onChanged { value in
                let moved = hypot(value.translation.width, value.translation.height) > 8
                if moved {
                    dragging = lot.id
                    dragOffset = value.translation
                }
            }
            .onEnded { value in
                let moved = hypot(value.translation.width, value.translation.height) > 8
                let end = CGPoint(x: value.startLocation.x + value.translation.width,
                                  y: value.startLocation.y + value.translation.height)
                dragging = nil
                dragOffset = .zero
                if moved {
                    if padFrame.contains(end) { sellOne(lot) }
                } else {
                    sellOne(lot)
                }
            })
    }

    private func trendMark(_ trend: Trend) -> some View {
        Group {
            if trend == .up {
                Triangle().fill(Theme.blue).frame(width: 14, height: 10)
            } else if trend == .down {
                Triangle().rotationEffect(.degrees(180)).fill(Theme.ink).frame(width: 14, height: 10)
            } else {
                Rectangle().fill(Theme.ink).frame(width: 14, height: 3)
            }
        }
        .accessibilityHidden(true)
    }

    private var lots: [Lot] {
        var out: [Lot] = []
        let player = store.player
        for id in player.stash.keys.sorted() {
            let qty = player.stash[id] ?? 0
            guard qty > 0, let meta = Minerals.byId[id] else { continue }
            let quote = Market.unitPrice(id, player: player, clientId: player.lastClient, now: store.now)
            let fresh = Market.openMarketSellPrice(base: meta.price, unitsSold: 0)
            out.append(Lot(id: id, name: meta.name, qty: qty, unit: quote.price, refined: false,
                           trend: quote.price > fresh + 1 ? .up : quote.price < fresh - 1 ? .down : .flat))
        }
        for id in player.refinedGoods.keys.sorted() {
            let qty = player.refinedGoods[id] ?? 0
            guard qty > 0, let recipe = Refinery.byId[id] else { continue }
            out.append(Lot(id: id, name: recipe.name, qty: qty, unit: recipe.price, refined: true, trend: .flat))
        }
        return out.sorted { $0.name < $1.name }
    }

    private var total: Int {
        lots.reduce(0) { $0 + $1.unit * $1.qty }
    }

    private func sellOne(_ lot: Lot) {
        withAnimation(.easeOut(duration: 0.28)) { padLot = lot.id }
        if lot.refined { store.sellRefined(lot.id, amount: 1) }
        else { store.sell(lot.id, amount: 1) }
    }

    private func sellAll() {
        guard !lots.isEmpty else { return }
        if !armed {
            armed = true
            return
        }
        let snapshot = lots
        for lot in snapshot {
            if lot.refined { store.sellRefined(lot.id, amount: lot.qty) }
            else { store.sell(lot.id, amount: lot.qty) }
        }
        armed = false
        padLot = "all"
    }

    private func tickFrancs(to target: Int) async {
        if !francsReady {
            shownFrancs = target
            francsReady = true
            return
        }
        let start = shownFrancs
        guard start != target else { return }
        let steps = 16
        for step in 1...steps {
            try? await Task.sleep(nanoseconds: 40_000_000)
            if Task.isCancelled { return }
            shownFrancs = start + (target - start) * step / steps
        }
    }

    private func pile(_ qty: Int) -> Int {
        if qty >= 24 { return 4 }
        if qty >= 8 { return 3 }
        if qty >= 2 { return 2 }
        return 1
    }

    private func crateAsset(_ id: String) -> String {
        switch id {
        case "iron": return "scene-exchange-crate-1-iron"
        case "nickel": return "scene-exchange-crate-2-nickel"
        case "silicon", "aluminium", "carbon": return "scene-exchange-crate-5-silver"
        case "platinum", "palladium", "gold", "iridium", "rhodium", "rare": return "scene-exchange-crate-4-platinum"
        case "ice", "hydrogen", "orionid_debris": return "scene-exchange-crate-6-ice"
        default: return "scene-exchange-crate-3-steel-blue"
        }
    }

    private func grouped(_ value: Int) -> String {
        let mark = "₣"
        let number = NumberFormatter.localizedString(from: NSNumber(value: value), number: .decimal)
        return mark + number
    }
}

private struct Lot: Identifiable {
    let id: String
    let name: String
    let qty: Int
    let unit: Int
    let refined: Bool
    let trend: Trend
    var artId: String { refined ? "silicon" : id }
}

private enum Trend {
    case up, down, flat
    var label: String {
        switch self {
        case .up: return "price up"
        case .down: return "price down"
        case .flat: return "price steady"
        }
    }
}

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

private struct PadFrameKey: PreferenceKey {
    static var defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) {
        let next = nextValue()
        if next != .zero { value = next }
    }
}
