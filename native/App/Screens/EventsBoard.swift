import SwiftUI
import LandnamCore

/// The mission board's compact Events tab. Event cards carry the useful state and action;
/// Atlas is linked once rather than repeated as a second event browser.
struct EventsBoard: View {
    @Environment(GameStore.self) private var store
    var onOpenDebris: (String) -> Void = { _ in }

    private enum Status { case upcoming(String), live, ended }

    /// Web `WSW_CARD_ORDER`.
    private static let wswOrder = ["draconids-2026", "saturn-night-2026", "rocket-revolution-2026", "new-moon-hunt-2026-10"]

    private static let gold = Theme.hex(0x8ECAE6)
    private static let silver = Theme.hex(0xC8CDD4)

    var body: some View {
        let now = store.now
        let ids = ["orionids-2026"] + Self.wswOrder
        let orderedIds = ids.sorted { eventSortRank($0, now: now) < eventSortRank($1, now: now) }
        VStack(alignment: .leading, spacing: 16) {
            ForEach(orderedIds, id: \.self) { id in
                card(id, now: now)
            }
            Link("OPEN IN ATLAS", destination: URL(string: "https://youratlas.cc/orionids")!)
                .font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity, minHeight: 44)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2))
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("mission-board-events")
    }

    private func eventStatus(_ id: String, now: Double) -> Int {
        guard let event = SkyEvents.event(id) else { return 2 }
        if now < event.startMs { return 0 }
        return now < event.endMs ? 1 : 2
    }

    private func eventSortRank(_ id: String, now: Double) -> Int {
        switch eventStatus(id, now: now) {
        case 1: return 0 // Live first.
        case 0: return 1 // Then the next thing the player can prepare for.
        default: return 2
        }
    }

    private func status(_ start: Double, _ end: Double, now: Double, countdown: Bool) -> Status {
        if now < start {
            guard countdown else { return .upcoming("") }
            let hours = Int(max(0, start - now) / 3_600_000)
            let d = hours / 24, h = hours % 24
            return .upcoming("\(d) day\(d == 1 ? "" : "s") \(h) hour\(h == 1 ? "" : "s") to start")
        }
        return now < end ? .live : .ended
    }

    private func statusLabel(_ s: Status) -> some View {
        let text: String
        switch s {
        case .upcoming(let label): text = label
        case .live: text = "LIVE"
        case .ended: text = "ENDED"
        }
        return Text(text).font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.textDim)
    }

    private func medal(_ tier: BadgeTier?, want: BadgeTier? = nil) -> some View {
        let on = want == nil ? tier != nil : tier == want
        let fill: Color = on ? (tier == .gold ? Self.gold : Self.silver) : Self.silver.opacity(0.4)
        return Image(systemName: "medal").font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.ink)
            .frame(width: 44, height: 44).background(fill, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 2))
            .accessibilityHidden(true)
    }

    private func card(_ id: String, now: Double) -> some View {
        let event = SkyEvents.event(id)
        let tier = store.player.badges[id]?.tier
        let s = event.map { status($0.startMs, $0.endMs, now: now, countdown: false) } ?? .ended
        let ended = eventStatus(id, now: now) == 2
        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(event?.name ?? id).font(AppFont.display(16)).foregroundStyle(Theme.ink)
                    statusLabel(s)
                }
                Spacer(minLength: 8)
                medal(tier)
            }
            Text(id == "orionids-2026" && store.player.orionidsEventStage == 1 ? "TIER 2 · SURFACE OBSERVATION READY" : tier != nil ? "\(tier!.rawValue.uppercased()) BADGE EARNED" : ended ? "REPLAY REWARD · SILVER BADGE" : "EVENT REWARD · GOLD BADGE")
                .font(AppFont.display(14)).tracking(0.8).foregroundStyle(Theme.textDim)
            if id == "orionids-2026" {
                let local = SkyEventWindows.localWindow(location: store.player.skyEventLocation)
                Text("\(local.location.city ?? local.location.timeZone): best \(SkyEventWindows.label(local.best, timeZone: local.location.timeZone)) · moon-free \(SkyEventWindows.label(local.moonFree, timeZone: local.location.timeZone))")
                    .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    .accessibilityIdentifier("orionids-local-window")
            }
            Button(id == "orionids-2026" && store.player.orionidsEventStage == 1 ? "CONTINUE RESEARCH" : ended ? "PLAY FOR SILVER" : eventStatus(id, now: now) == 1 ? "PARTICIPATE" : "PREPARE") { open(id) }
                .font(AppFont.display(14)).tracking(1).foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity, minHeight: 44)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2))
                .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity, alignment: .leading).padding(12)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink, lineWidth: 2))
        .accessibilityIdentifier(id == "orionids-2026" ? "events-orionids" : "events-card-\(id)")
    }

    private func open(_ id: String) {
        switch id {
        case "orionids-2026":
            if store.player.orionidsEventStage == 1 { store.pickMission(OrionidsRun.surfaceResearchMissionId) }
            else { onOpenDebris(id) }
        case "draconids-2026": onOpenDebris(id)
        case "saturn-night-2026": store.go(.saturnStormSearch)
        case "new-moon-hunt-2026-10": store.go(.asteroidDiscovery)
        default: store.go(.launchpad)
        }
    }
}
