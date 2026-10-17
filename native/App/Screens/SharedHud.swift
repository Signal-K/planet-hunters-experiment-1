import SwiftUI
import LandnamCore

/// Cog and clock chips shared by the base and flight scenes (top-left).
struct HudGearClock: View {
    let onSettings: () -> Void
    var body: some View {
        HStack(spacing: 8) {
            Button(action: onSettings) {
                Image(systemName: "gearshape.fill").font(.system(size: 18, weight: .black)).foregroundStyle(Theme.hudInk)
                    .frame(width: 36, height: 36).contentShape(Rectangle())
                    .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
            }
            .buttonStyle(.plain).accessibilityLabel("Settings")
            TimelineView(.periodic(from: .now, by: 30)) { ctx in
                HStack(spacing: 6) {
                    Image(systemName: "clock").font(.system(size: 16, weight: .bold))
                    Text(ctx.date.formatted(date: .omitted, time: .shortened)).font(AppFont.mono(14))
                }
                .foregroundStyle(Theme.hudInk)
                .padding(.horizontal, 8)
                .frame(minWidth: 44, minHeight: 36)
                .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
            }
            .accessibilityLabel("Clock")
        }
    }
}

/// Francs and cargo chips shared by the base and flight scenes (top-right).
struct HudChips: View {
    let francs: Int
    /// Base stock behind the cube chip. Nil keeps the chip inert (flight shows the run's cargo instead).
    var stash: Cargo? = nil
    var onSell: (() -> Void)? = nil
    @State private var stashOpen = false
    @Environment(Services.self) private var services: Services?
    var body: some View {
        HStack(spacing: 8) {
            if let label = SyncChip.label(online: services?.online ?? true, pending: services?.pendingWrites ?? 0, failed: services?.failedWrites ?? 0) {
                SyncChip(label: label, warn: !(services?.online ?? true) || (services?.failedWrites ?? 0) > 0)
            }
            Text(Economy.format(francs: francs)).font(AppFont.mono(14)).foregroundStyle(Theme.hudInk)
                .padding(.horizontal, 8).frame(minWidth: 44, minHeight: 36)
                .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
                .accessibilityLabel("Francs")
            stashChip
        }
    }
}

extension HudChips {
    @ViewBuilder fileprivate var stashChip: some View {
        let icon = Image(systemName: "cube.fill").font(.system(size: 18, weight: .black)).foregroundStyle(Theme.hudInk)
        if let stash {
            let entries = stash.filter { $0.value > 0 }.sorted { $0.key < $1.key }
            let units = entries.reduce(0) { $0 + $1.value }
            Button { stashOpen.toggle() } label: {
                HStack(spacing: 6) {
                    icon
                    if units > 0 { Text("\(units)").font(AppFont.mono(14)).foregroundStyle(Theme.hudInk) }
                }
                .padding(.horizontal, 8).frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Stash \(units) units. Open stash")
            .popover(isPresented: $stashOpen) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("STASH · \(units)").font(AppFont.mono(14))
                    if entries.isEmpty { Text("Empty. Mine something first.").font(AppFont.mono(14)) }
                    ForEach(entries, id: \.key) { entry in
                        Text("\(Minerals.byId[entry.key]?.name ?? entry.key) ×\(entry.value)").font(AppFont.mono(14))
                    }
                    if !entries.isEmpty, let onSell {
                        Button("Sell at Marketplace") { stashOpen = false; onSell() }
                            .frame(minHeight: 44)
                    }
                }
                .padding(16).presentationCompactAdaptation(.popover)
            }
        } else {
            icon.frame(width: 36, height: 36)
                .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
                .accessibilityLabel("Cargo")
        }
    }
}

/// Offline / syncing state next to the francs chip (web LandnamSyncStatus). Blue while uploading, brick red offline.
struct SyncChip: View {
    let label: String
    var warn = false
    static func label(online: Bool, pending: Int, failed: Int) -> String? {
        if !online { return pending > 0 ? "OFFLINE · \(pending)" : "OFFLINE" }
        if pending > 0 { return "SYNCING \(pending)" }
        if failed > 0 { return "NOT SYNCED" }
        return nil
    }
    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(warn ? Color(red: 0.608, green: 0.231, blue: 0.196) : Color(red: 0.25, green: 0.5, blue: 0.95)).frame(width: 7, height: 7)
            Text(label).font(AppFont.mono(11)).foregroundStyle(Theme.hudInk)
                .fixedSize(horizontal: true, vertical: false).layoutPriority(1)
        }
        .padding(.horizontal, 8).frame(minHeight: 36)
        .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
        .accessibilityElement(children: .combine).accessibilityLabel("Sync status \(label)")
    }
}
