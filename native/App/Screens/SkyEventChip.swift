import SwiftUI
import LandnamCore

/// "Orionids active" chip (mirrors web SkyEventChip): a 44pt tap target.
/// On Base (`allDay`) it stays up for the whole shower window. Mining still waits for local night.
struct SkyEventChip: View {
    @Environment(GameStore.self) private var store
    @State private var open = false
    var allDay = false

    var body: some View {
        TimelineView(.periodic(from: .now, by: 60)) { _ in
            let preset = SkyEvents.activePreset(at: store.now)
            let daytime = allDay && preset == nil && SkyEvents.isOrionidsWindow(store.now)
            if let preset = preset {
                chip(label: preset.chipLabel.uppercased(), orionids: preset.eventId == "orionids-2026", note: "\(preset.label) falls while you mine tonight. Laser it, then sell it at the Market spot price.")
            } else if daytime {
                chip(label: "ORIONIDS TONIGHT", orionids: true, note: SkyEvents.orionidsPanelPeak)
            }
        }
    }

    private func chip(label: String, orionids: Bool, note: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if !open {
                Button { open = true } label: {
                    Text(label).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.ink)
                        .padding(.horizontal, 16).frame(minHeight: 44, alignment: .center)
                        .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.border, lineWidth: 2))
                }.buttonStyle(.plain).accessibilityIdentifier("sky-event-chip")
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Text(orionids ? "ORIONIDS" : "SKY EVENT").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.bluePress)
                        Spacer(minLength: 8)
                        Button { open = false } label: {
                            Text("CLOSE").font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.ink)
                                .frame(minWidth: 44, minHeight: 44).padding(.horizontal, 8)
                                .background(Theme.paper2, in: RoundedRectangle(cornerRadius: 8))
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1.5))
                        }.buttonStyle(.plain)
                    }
                    if orionids {
                        Text(SkyEvents.orionidsPanelPeak).font(AppFont.body(14)).foregroundStyle(Theme.textDim).frame(maxWidth: 280, alignment: .leading)
                        ForEach(SkyEvents.orionidsPanelSteps, id: \.self) { step in
                            Text(step).font(AppFont.body(14)).foregroundStyle(Theme.ink).frame(maxWidth: 280, alignment: .leading)
                        }
                        // Return hook (mirrors web SkyEventChip): a player who already earned the badge is told to launch again.
                        if store.player.badges["orionids-2026"] != nil {
                            Text("The shower runs to 7 Nov. Launch again to catch more, peak night 21–22 Oct pays double.")
                                .font(AppFont.body(14)).foregroundStyle(Theme.ink).frame(maxWidth: 280, alignment: .leading)
                                .accessibilityIdentifier("orionids-return-hook")
                        }
                    } else {
                        Text(note).font(AppFont.body(14)).foregroundStyle(Theme.textDim).frame(maxWidth: 260, alignment: .leading)
                    }
                    Button { store.openMissionBoard(tab: 2) } label: {
                        Text("VIEW EVENT").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Color.white)
                            .frame(minHeight: 44).padding(.horizontal, 14)
                            .background(Theme.blue, in: RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("sky-event-participate")
                }
                .padding(10).background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1.5))
                .accessibilityIdentifier(orionids ? "orionids-panel" : "sky-event-note")
            }
        }
    }
}

/// Earned sky-event badges (mirrors web SkyBadgeRow). Renders nothing until one is earned.
struct SkyBadgeRow: View {
    @Environment(SurveyCenter.self) private var surveys: SurveyCenter?
    let badges: [String: PlayerBadge]

    var body: some View {
        let earned = badges.values.filter { SkyEvents.event($0.eventId) != nil || WswBadges.badge(id: $0.eventId) != nil }.sorted { $0.earnedAt < $1.earnedAt }
        if !earned.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "Sky event badges")
                ForEach(earned, id: \.eventId) { b in
                    let wsw = WswBadges.badge(id: b.eventId)
                    let badgeName = wsw?.name ?? SkyEvents.event(b.eventId)?.name
                    HStack(spacing: 10) {
                        Image(systemName: "rosette").font(.system(size: 18, weight: .bold))
                        Text(b.tier == .gold ? "GOLD" : "SILVER").font(AppFont.display(14)).tracking(1.2)
                        if wsw != nil { Text("WSW").font(AppFont.display(14)).tracking(1.2) }
                        Text(badgeName ?? "").font(AppFont.body(14))
                        Spacer(minLength: 0)
                        if let badgeName {
                            ShareLink(item: BadgeShare.url, message: Text(BadgeShare.text(badgeName, tier: b.tier))) {
                                Text("SHARE").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.bluePress)
                                    .frame(minWidth: 44, minHeight: 44)
                            }.simultaneousGesture(TapGesture().onEnded { surveys?.enqueue(Surveys.badgeShared) })
                        }
                    }
                    .foregroundStyle(Theme.ink).padding(.horizontal, 12).frame(minHeight: 44)
                    .background(b.tier == .gold ? Theme.blueBright.opacity(0.35) : Theme.paper2, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                    .overlay(alignment: .leading) { if let wsw { Rectangle().fill(wswColor(wsw.tone)).frame(width: 6).clipShape(RoundedRectangle(cornerRadius: 3)) } }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
}

/// World Space Week banner (mirrors web WorldSpaceWeekBanner): dates, the tier rule, and how many of the week's badges are earned.
struct WorldSpaceWeekBanner: View {
    let banner: WorldSpaceWeek.Banner

    var body: some View {
        let title = Text(banner.title.uppercased()).font(AppFont.display(14)).tracking(1.7)
        let detail = Text(banner.detail).font(AppFont.body(14, "Bold"))
        let count = Text("\(banner.earned) / \(banner.total) BADGES").font(AppFont.display(14)).tracking(1.1)
        // Web `.banner` is a wrapping flex row: one line when it fits, else title / detail / count stacked.
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 12) { title.lineLimit(1); detail.lineLimit(1); count.lineLimit(1) }
            VStack(alignment: .leading, spacing: 4) { title; detail; count }
        }
        .foregroundStyle(Theme.ink)
        .padding(.horizontal, 12).padding(.vertical, 10).frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
        .background(banner.live ? Theme.paper : Theme.paper2, in: RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.ink, lineWidth: 1.5))
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("wsw-banner")
    }
}

/// One chip per World Space Week category a thing can earn (mirrors web WorldSpaceWeekChips).
struct WorldSpaceWeekChips: View {
    let chips: [WorldSpaceWeek.Chip]

    var body: some View {
        if !chips.isEmpty {
            ChipFlow(spacing: 8) {
                ForEach(chips) { chip in
                    HStack(spacing: 6) {
                        Text("WSW").font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.paper)
                            .padding(.horizontal, 6).padding(.vertical, 2).background(Theme.ink, in: Capsule())
                        Text(chip.label.uppercased()).font(AppFont.display(14)).tracking(0.8).foregroundStyle(Theme.ink)
                    }
                    .lineLimit(1).fixedSize()
                    .padding(.horizontal, 10).frame(minHeight: 32)
                    .background(isEarned(chip) ? Theme.paper2 : Theme.paper, in: Capsule())
                    .overlay(Capsule().stroke(Theme.ink, style: StrokeStyle(lineWidth: 1.5, dash: chip.state == .silverOpen || chip.state == .silverEarned ? [4, 3] : [])))
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier("wsw-chip-\(chip.eventId)")
                }
            }
        }
    }

    private func isEarned(_ chip: WorldSpaceWeek.Chip) -> Bool { chip.state == .goldEarned || chip.state == .silverEarned }
}

/// Wraps its children onto new lines at their natural width.
struct ChipFlow: Layout {
    var spacing: CGFloat
    var rowSpacing: CGFloat? = nil

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = place(subviews, width: proposal.width ?? .infinity)
        return CGSize(width: proposal.width ?? rows.map(\.maxX).max() ?? 0, height: rows.last.map { $0.y + $0.height } ?? 0)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        for row in place(subviews, width: bounds.width) {
            for item in row.items { subviews[item.index].place(at: CGPoint(x: bounds.minX + item.x, y: bounds.minY + row.y), proposal: .unspecified) }
        }
    }

    private struct Row { var y: CGFloat = 0, height: CGFloat = 0, maxX: CGFloat = 0; var items: [(index: Int, x: CGFloat)] = [] }

    private func place(_ subviews: Subviews, width: CGFloat) -> [Row] {
        var rows = [Row()], x: CGFloat = 0
        for (i, sub) in subviews.enumerated() {
            let size = sub.sizeThatFits(.unspecified)
            if x > 0, x + size.width > width {
                let prev = rows[rows.count - 1]
                rows.append(Row(y: prev.y + prev.height + (rowSpacing ?? spacing))); x = 0
            }
            rows[rows.count - 1].items.append((i, x))
            rows[rows.count - 1].height = max(rows[rows.count - 1].height, size.height)
            x += size.width; rows[rows.count - 1].maxX = x; x += spacing
        }
        return rows
    }
}

/// Share text and link, identical to web `lib/share.ts`.
enum BadgeShare {
    static let url = URL(string: "https://playlandnam.space/?utm_source=badge_share&utm_medium=share&utm_campaign=sky_event_badge")!
    static func text(_ eventName: String, tier: BadgeTier) -> String {
        "I earned the \(tier == .gold ? "Gold" : "Silver") \(eventName) badge in Landnam: Space Program."
    }
}

private func wswColor(_ tone: WswTone) -> Color {
    switch tone {
    case .blue: Theme.blue
    case .sky: Theme.blueBright
    case .green: Theme.teal
    case .crimson: Theme.crimson
    case .dim: Theme.textMuted
    case .ink: Theme.ink
    }
}
