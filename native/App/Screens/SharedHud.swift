import SwiftUI
import LandnamCore

/// Cog and clock chips shared by the base and flight scenes (top-left).
struct HudGearClock: View {
    let onSettings: () -> Void
    var onFriends: (() -> Void)? = nil
    var onNotifications: (() -> Void)? = nil
    var notificationCount = 0
    var compact = false
    var body: some View {
        if compact { compactControl } else { regularControl }
    }

    private var compactControl: some View {
        Menu {
            if let onFriends {
                Button("Friends", systemImage: "person.2.fill", action: onFriends)
            }
            if let onNotifications {
                Button("Notifications", systemImage: "bell.fill", action: onNotifications)
            }
            Button("Settings", systemImage: "gearshape.fill", action: onSettings)
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "slider.horizontal.3").font(.system(size: 15, weight: .bold))
                TimelineView(.periodic(from: .now, by: 30)) { ctx in
                    Text(ctx.date.formatted(date: .omitted, time: .shortened)).font(AppFont.mono(12))
                }
            }
            .foregroundStyle(Glass.ink)
            .padding(.horizontal, 11).frame(minHeight: 34)
            .contentShape(Capsule())
        }
        .accessibilityLabel("Open base controls")
        .menuStyle(.borderlessButton)
        .padding(3)
        .background(Capsule().fill(Theme.hex(0x07111D, 0.84)))
        .overlay(Capsule().stroke(Glass.ink.opacity(0.75), lineWidth: 1.25))
        .shadow(color: .black.opacity(0.22), radius: 8, y: 3)
    }

    private var regularControl: some View {
        HStack(spacing: 0) {
            if let onFriends {
                Button(action: onFriends) {
                    Image(systemName: "person.2.fill").font(.system(size: 15, weight: .bold)).foregroundStyle(Glass.ink)
                        .frame(width: 40, height: 40).contentShape(Rectangle())
                }
                .buttonStyle(.plain).accessibilityLabel("Friends")
            }
            if let onNotifications {
                Button(action: onNotifications) {
                    ZStack(alignment: .topTrailing) {
                        Image(systemName: "bell.fill").font(.system(size: 15, weight: .bold)).foregroundStyle(Glass.ink)
                            .frame(width: 44, height: 44).contentShape(Rectangle())
                        if notificationCount > 0 {
                            // SSL-740: 14pt like web, capped at 9+ so the badge stays round.
                            Text(notificationCount > 9 ? "9+" : "\(notificationCount)").font(AppFont.mono(14)).foregroundStyle(Glass.ink).frame(minWidth: 20, minHeight: 20)
                                .background(Glass.cyan, in: Capsule()).offset(x: 2, y: -2)
                        }
                    }
                }
                .buttonStyle(.plain).accessibilityLabel("Notifications\(notificationCount > 0 ? ", \(notificationCount) unread" : "")")
            }
            Button(action: onSettings) {
                Image(systemName: "gearshape.fill").font(.system(size: 16, weight: .bold)).foregroundStyle(Glass.ink)
                    .frame(width: 40, height: 40).contentShape(Rectangle())
            }
            .buttonStyle(.plain).accessibilityLabel("Settings")
            TimelineView(.periodic(from: .now, by: 30)) { ctx in
                HStack(spacing: 6) {
                    Image(systemName: "clock").font(.system(size: 14, weight: .bold))
                    Text(ctx.date.formatted(date: .omitted, time: .shortened)).font(AppFont.mono(13))
                }
                .foregroundStyle(Glass.ink)
                .padding(.horizontal, 10)
                .frame(minWidth: 74, minHeight: 40)
            }
            .accessibilityLabel("Clock")
        }
        .padding(4)
        .background(Capsule().fill(Theme.hex(0x07111D, 0.84)))
        .overlay(Capsule().stroke(Glass.ink.opacity(0.75), lineWidth: 1.25))
        .shadow(color: .black.opacity(0.22), radius: 8, y: 3)
    }
}

/// Francs and cargo chips shared by the base and flight scenes (top-right).
struct HudChips: View {
    let francs: Int
    /// Base stock behind the cube chip. Nil keeps the chip inert (flight shows the run's cargo instead).
    var stash: Cargo? = nil
    var onSell: (() -> Void)? = nil
    var compact = false
    @State private var stashOpen = false
    @State private var syncTrayOpen = false
    @Environment(Services.self) private var services: Services?
    @Environment(\.helpButtonReserve) private var helpReserve
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    var body: some View {
        HStack(spacing: 4) {
            // SSL-729: always shown, so "synced" is visible too; a tap opens the sync tray.
            let label = SyncChip.label(online: services?.online ?? true, pending: services?.pendingWrites ?? 0, failed: services?.failedWrites ?? 0) ?? "SYNCED"
            Button { syncTrayOpen.toggle() } label: {
                SyncChip(label: label, warn: !(services?.online ?? true) || (services?.failedWrites ?? 0) > 0, compact: horizontalSizeClass == .compact)
            }
            .buttonStyle(.plain)
            .accessibilityHint("Shows what is saved on this device and what has reached your account")
            .popover(isPresented: $syncTrayOpen) { SyncTrayView().presentationCompactAdaptation(.popover) }
            // One line always: with the sync chip and the help button the row is tight, and "₣9.0 / M" wrapped.
            Text(Economy.format(francs: francs)).font(AppFont.mono(13)).foregroundStyle(Glass.cyan)
                .lineLimit(1).fixedSize(horizontal: true, vertical: false)
                .padding(.horizontal, compact ? 6 : 8).frame(minWidth: 44, minHeight: compact ? 34 : 40)
                .accessibilityLabel("Francs")
            stashChip
        }
        .padding(compact ? 3 : 4)
        .background(Capsule().fill(Theme.hex(0x07111D, 0.84)))
        .overlay(Capsule().stroke(Glass.ink.opacity(0.75), lineWidth: 1.25))
        .shadow(color: .black.opacity(0.22), radius: 8, y: 3)
        .padding(.trailing, helpReserve)
    }
}

extension HudChips {
    @ViewBuilder fileprivate var stashChip: some View {
        let icon = Image(systemName: "cube.fill").font(.system(size: compact ? 14 : 16, weight: .bold)).foregroundStyle(Glass.ink)
        if let stash {
            let entries = stash.filter { $0.value > 0 }.sorted { $0.key < $1.key }
            let units = entries.reduce(0) { $0 + $1.value }
            Button { stashOpen.toggle() } label: {
                HStack(spacing: 6) {
                    icon
                    if units > 0 { Text("\(units)").font(AppFont.mono(13)).foregroundStyle(Glass.ink) }
                }
                .padding(.horizontal, compact ? 6 : 8).frame(minWidth: compact ? 38 : 44, minHeight: compact ? 34 : 40).contentShape(Rectangle())
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
    /// Icon and count only (iPhone widths); the full text stays in the accessibility label.
    var compact = false
    static func label(online: Bool, pending: Int, failed: Int) -> String? {
        if !online { return pending > 0 ? "OFFLINE · \(pending)" : "OFFLINE" }
        if pending > 0 { return "SYNCING \(pending)" }
        if failed > 0 { return "NOT SYNCED" }
        return nil
    }
    private var compactIcon: String {
        if label.hasPrefix("OFFLINE") { return "wifi.slash" }
        if label.hasPrefix("NOT") { return "exclamationmark.triangle" }
        if label == "SYNCED" { return "checkmark.icloud" }
        return "arrow.triangle.2.circlepath"
    }
    var body: some View {
        HStack(spacing: 5) {
            if compact {
                Image(systemName: compactIcon).font(.system(size: 13, weight: .semibold)).foregroundStyle(warn ? Color(red: 1, green: 0.46, blue: 0.38) : Glass.cyan)
                let count = label.filter(\.isNumber)
                if !count.isEmpty { Text(count).font(AppFont.mono(14)).foregroundStyle(Glass.ink).fixedSize() }
            } else {
            Circle().fill(warn ? Color(red: 1, green: 0.46, blue: 0.38) : Glass.cyan).frame(width: 7, height: 7)
            Text(label).font(AppFont.mono(11)).foregroundStyle(Glass.ink)
                .fixedSize(horizontal: true, vertical: false).layoutPriority(1)
            }
        }
        .padding(.horizontal, 8).frame(minWidth: compact ? 44 : nil, minHeight: 36)
        .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
        .accessibilityElement(children: .combine).accessibilityLabel("Sync status \(label)")
    }
}

/// SSL-729 sync tray (web `SyncTray`): where progress is, each waiting change, and Upload now. Two-tone style.
struct SyncTrayView: View {
    @Environment(Services.self) private var services: Services?
    @State private var items: [String] = []
    @State private var trying = false
    @State private var unreachable = false
    private var state: SyncTray.State {
        SyncTray.state(online: services?.online ?? true, pending: services?.pendingWrites ?? 0, failed: services?.failedWrites ?? 0)
    }
    var body: some View {
        let copy = SyncTray.copy(state, waiting: services?.pendingWrites ?? 0)
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Circle().fill(state == .synced ? Glass.cyan : state == .waiting ? Color(red: 0.5, green: 0.69, blue: 1) : Color(red: 0.89, green: 0.53, blue: 0.49)).frame(width: 12, height: 12)
                Text(copy.title.uppercased()).font(AppFont.display(16, "Bold")).tracking(1.2)
            }
            Text(copy.body).font(AppFont.body(15, "Regular")).fixedSize(horizontal: false, vertical: true)
            ForEach(Array(items.prefix(6).enumerated()), id: \.offset) { _, name in
                Text(name).font(AppFont.body(14, "Regular")).frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12).padding(.vertical, 10)
                    .background(Color(red: 0.24, green: 0.17, blue: 0.46).opacity(0.45), in: RoundedRectangle(cornerRadius: 12))
            }
            if items.count > 6 { Text("\(items.count - 6) more").font(AppFont.body(14, "Regular")) }
            if unreachable && (services?.pendingWrites ?? 0) > 0 {
                Text("Could not reach the server. Your changes stay on this device and upload by themselves when you reconnect.")
                    .font(AppFont.body(14, "Regular")).foregroundStyle(Glass.ink.opacity(0.8)).fixedSize(horizontal: false, vertical: true)
            }
            if (services?.online ?? false) && (services?.pendingWrites ?? 0) > 0 {
                Button {
                    trying = true; unreachable = false
                    services?.flush()
                    Task { try? await Task.sleep(for: .seconds(5)); trying = false; unreachable = (services?.pendingWrites ?? 0) > 0 }
                } label: {
                    Text(trying ? "TRYING…" : "UPLOAD NOW").font(AppFont.display(14, "Bold")).tracking(1.1)
                        .foregroundStyle(Theme.ink).frame(maxWidth: .infinity, minHeight: 48)
                        .background(Theme.paper, in: Capsule())
                }.buttonStyle(.plain).disabled(trying)
            }
        }
        .foregroundStyle(Glass.ink)
        .padding(16)
        .frame(width: 320)
        .background(Color(red: 0.03, green: 0.06, blue: 0.13).opacity(0.94))
        .task(id: services?.pendingWrites ?? 0) { items = await services?.pendingDescriptions() ?? [] }
    }
}
