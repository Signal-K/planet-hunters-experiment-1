import SwiftUI
import LandnamCore

/// Build and Place (mirrors web BuildPlaceScreen): pick a structure, pick one of four plots, confirm.
struct BuildScreen: View {
    @Environment(GameStore.self) private var store
    @State private var picked: String?
    @State private var plot: Int?
    @State private var note: String?

    var body: some View {
        let p = store.player
        let catalog = Construction.catalog(for: p)
        let sel = picked.flatMap { id in catalog.first { $0.id == id } }
        let taken = Construction.occupied(p)
        ScreenFrame(title: "Build", back: { store.go(.hub) }) {
            Eyebrow(text: "Base · Setup")
            plots(taken, sel: sel)
            Eyebrow(text: "Structures")
            if catalog.isEmpty {
                Panel { Text("No structures are available yet. Complete your current mission to unlock the next build.").foregroundStyle(Theme.textDim) }
            }
            ForEach(catalog) { b in card(b, p) }
            status(sel)
            upgrades(p)
            PrimaryButton(title: "Confirm · Build here", enabled: sel != nil && plot != nil) {
                guard let sel, let plot else { return }
                if store.place(sel.id, plot: plot) { picked = nil; self.plot = nil; note = nil }
                else { note = "Placement could not be confirmed. Check requirements and try again." }
            }
        }
    }

    /// Placed buildings can be upgraded to level 3 (mirrors the web Edit-mode upgrade rail).
    @ViewBuilder private func upgrades(_ p: Player) -> some View {
        let placed = BuildingLevels.ids.filter { p.placed.contains($0) }
        if !placed.isEmpty {
            Eyebrow(text: "Upgrade")
            ForEach(placed, id: \.self) { id in
                let level = BuildingLevels.level(p, id), price = BuildingLevels.cost(id, level: level)
                let effects = BuildingLevels.effects[id] ?? []
                Panel {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(BuildingLevels.names[id] ?? id) · Level \(level) of \(BuildingLevels.maxLevel)").font(AppFont.display(16))
                        Text("Now: \(effects[level - 1])").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                        if let price {
                            Text("Next: \(effects[level]) · \(Economy.format(francs: price))").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                            PrimaryButton(title: p.francs >= price ? "Upgrade · \(Economy.format(francs: price))" : "Need \(Economy.format(francs: price - p.francs)) more",
                                          enabled: p.francs >= price) { _ = store.upgradeBuilding(id) }
                                .frame(minHeight: 44)
                        } else {
                            Text("Fully upgraded").font(AppFont.body(14, "SemiBold")).foregroundStyle(Theme.teal)
                        }
                    }
                }
            }
        }
    }

    private func plots(_ taken: [String: Int], sel: StructureBlueprint?) -> some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible())], spacing: 8) {
            ForEach(0..<Construction.plotCount, id: \.self) { i in
                let kind = taken.first { $0.value == i }?.key
                let on = plot == i
                Button { if kind == nil, sel != nil { plot = on ? nil : i } } label: {
                    VStack(spacing: 4) {
                        Image(systemName: kind != nil ? "building.2.fill" : (on ? "checkmark.circle.fill" : "plus"))
                            .font(.system(size: 20, weight: .bold)).foregroundStyle(kind != nil ? Theme.ink : Theme.blue)
                        Text((kind.flatMap { Construction.byId[$0]?.name } ?? "Plot \(i + 1)").uppercased())
                            .font(AppFont.display(14)).tracking(0.4).lineLimit(2).multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, minHeight: 76)
                    .foregroundStyle(Theme.ink)
                    .background(on ? Theme.blueBright.opacity(0.25) : Theme.paper, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, style: StrokeStyle(lineWidth: 2.5, dash: kind == nil && !on ? [6, 4] : [])))
                }.buttonStyle(.plain)
                .accessibilityLabel(kind.map { "Plot \(i + 1), \(Construction.byId[$0]?.name ?? $0)" } ?? "Plot \(i + 1), empty\(on ? ", selected" : "")")
            }
        }
    }

    private func card(_ b: StructureBlueprint, _ p: Player) -> some View {
        let unlocked = Construction.unlocked(b, player: p), afford = Construction.canAfford(b, player: p)
        let can = unlocked && afford, on = picked == b.id
        return Button {
            if can { picked = b.id; plot = nil; note = nil }
            else { picked = nil; note = "\(b.name) · " + (!unlocked ? "Unlocks at \(b.unlocksAt)" : "Need \(Construction.gaps(b, player: p).joined(separator: ", "))") }
        } label: {
            Panel(accent: on ? Theme.teal : Theme.blueBright) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: b.id == "launchpad" ? "airplane.departure" : "building.columns").font(.system(size: 22, weight: .bold)).frame(minWidth: 44)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(b.name).font(AppFont.display(16))
                        Text(unlocked ? cost(b) : b.unlocksAt).font(AppFont.mono(14)).foregroundStyle(Theme.textDim)
                        Text(b.summary).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    }
                }
            }
        }.buttonStyle(.plain).frame(minHeight: 44)
        .accessibilityLabel("\(b.name), \(unlocked ? cost(b) : "locked")\(on ? ", selected" : "")")
    }

    private func cost(_ b: StructureBlueprint) -> String {
        let francs = b.cost == 0 ? "Free" : Economy.format(francs: b.cost)
        let mats = b.materials.sorted { $0.key < $1.key }.map { "\($0.value) \($0.key)" }.joined(separator: " · ")
        return mats.isEmpty ? francs : "\(francs) · \(mats)"
    }

    @ViewBuilder private func status(_ sel: StructureBlueprint?) -> some View {
        if let note { Text(note).font(AppFont.body(14, "SemiBold")).foregroundStyle(Theme.crimson) }
        else if let sel {
            Text(plot == nil ? "Select a plot for the \(sel.name) · \(cost(sel)) · Builds in \(Int(Construction.buildMs / 1000))s"
                             : "Place \(sel.name) here? · \(cost(sel)) · Builds in \(Int(Construction.buildMs / 1000))s")
                .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
        }
    }
}
