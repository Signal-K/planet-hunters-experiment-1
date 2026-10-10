import SwiftUI
import LandnamCore

/// Refinery (mirrors web RefineryScreen): one shipment of raw ore a day becomes a higher-value good.
/// A TimelineView ticks the countdown, so the running job needs no timer state of its own.
struct RefineryScreen: View {
    @Environment(GameStore.self) private var store
    @State private var selected: String?
    var at: Double?

    var body: some View {
        ScreenFrame(title: "Refinery", back: { store.go(.hub) }) {
            TimelineView(.periodic(from: .now, by: 1)) { ctx in
                content(now: at ?? max(store.now, ctx.date.timeIntervalSince1970 * 1000))
            }
        }
    }

    @ViewBuilder private func content(now: Double) -> some View {
        let p = store.player
        VStack(alignment: .leading, spacing: 12) {
            Eyebrow(text: "Base · Industry")
            Panel(accent: Theme.teal) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("On-site Ore Processing").font(AppFont.display(16))
                    Text("Level 1 capacity: one shipment per day. \(Refinery.isStaffed(p) ? "Crew staffed, cycles 25% faster." : "Assign crew at the Academy for faster cycles.")")
                        .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                }
            }
            if let job = p.refineryQueue.first, let r = Refinery.byId[job.recipeId] { running(job, r, now: now) }
            let goods = p.refinedGoods.filter { $0.value > 0 }.sorted { $0.key < $1.key }
            if !goods.isEmpty { finished(goods) }
            Eyebrow(text: "Available recipes")
            ForEach(Refinery.recipes) { r in recipe(r, now: now) }
            if let id = selected {
                PrimaryButton(title: "Start refinement") { store.startRefine(id); selected = nil }
            }
        }
    }

    private func running(_ job: RefineryJob, _ r: RefineryRecipe, now: Double) -> some View {
        let total = Refinery.durationMs(job), elapsed = now - job.startedAt
        let done = Refinery.isDone(job, now: now)
        return Panel(accent: done ? Theme.teal : Theme.blueBright) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Swatch(hex: r.colorHex, symbol: r.symbol)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(r.name + (done ? " ✓" : "")).font(AppFont.display(16))
                        Text(done ? "Complete, collect it" : "\(max(0, Int(((total - elapsed) / 1000).rounded(.up))))s remaining")
                            .font(AppFont.mono(14)).foregroundStyle(Theme.textDim)
                    }
                    Spacer(minLength: 0)
                }
                if done { PrimaryButton(title: "Collect") { store.collectRefined(r.id) } }
                else {
                    Bar(value: elapsed / total)
                }
            }
        }
    }

    private func finished(_ goods: [(key: String, value: Int)]) -> some View {
        Panel(accent: Theme.teal) {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "Finished goods")
                ForEach(goods, id: \.key) { id, n in
                    if let r = Refinery.byId[id] {
                        HStack {
                            Swatch(hex: r.colorHex, symbol: r.symbol)
                            Text("\(r.name) ×\(n)").font(AppFont.body(14, "SemiBold"))
                            Spacer(minLength: 0)
                            Text(Economy.format(francs: r.price * n)).font(AppFont.display(14))
                            Button { store.sellRefined(id, amount: n) } label: {
                                Text("SELL").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.onAccent)
                                    .padding(.horizontal, 14).frame(minHeight: 44)
                                    .background(Theme.blue, in: RoundedRectangle(cornerRadius: 8))
                            }.buttonStyle(.plain).accessibilityLabel("Sell \(r.name)")
                        }
                    }
                }
            }
        }
    }

    private func recipe(_ r: RefineryRecipe, now: Double) -> some View {
        let p = store.player
        let hasInput = (p.stash[r.inputMineral] ?? 0) >= r.inputAmount
        let today = Refinery.startedToday(p, now: now)
        let can = Refinery.canStart(r, player: p, now: now)
        let status = !hasInput ? "Missing input" : today ? "Daily limit" : p.francs < r.cost ? "Need funds" : !p.refineryQueue.isEmpty ? "Busy" : "Ready"
        let secs = Int((Double(r.seconds) * (Refinery.isStaffed(p) ? 0.75 : 1)).rounded())
        return Button { if can { selected = r.id } } label: {
            Panel(accent: selected == r.id ? Theme.teal : Theme.blueBright) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Swatch(hex: r.colorHex, symbol: r.symbol)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(r.name).font(AppFont.display(16))
                            Text("\(r.inputAmount)× \(r.inputMineral) → \(r.name)").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                        }
                    }
                    HStack {
                        Text(Economy.format(francs: r.cost)); Text("\(secs)s"); Spacer(minLength: 0)
                        Text(status.uppercased()).foregroundStyle(can ? Theme.teal : Theme.crimson)
                    }.font(AppFont.display(14))
                }
            }
        }.buttonStyle(.plain).disabled(!can).frame(minHeight: 44)
        .accessibilityLabel("\(r.name), \(status)")
    }
}

/// Mineral chip: outlined swatch with the element symbol.
struct Swatch: View {
    let hex: String
    let symbol: String
    var body: some View {
        Text(symbol).font(AppFont.display(14)).foregroundStyle(Theme.ink)
            .frame(width: 44, height: 44)
            .background(Theme.hex(UInt32(hex.dropFirst(), radix: 16) ?? 0xFFFFFF), in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
    }
}
