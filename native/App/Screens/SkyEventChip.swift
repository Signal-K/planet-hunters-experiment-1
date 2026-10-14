import SwiftUI
import LandnamCore

/// "Orionids active" chip (mirrors web SkyEventChip): a 44pt tap target that opens a one-line
/// explainer. Renders nothing outside the shower window and the player's local night.
struct SkyEventChip: View {
    @Environment(GameStore.self) private var store
    @State private var open = false

    var body: some View {
        TimelineView(.periodic(from: .now, by: 60)) { _ in
            if let preset = SkyEvents.activePreset(at: store.now) {
                VStack(alignment: .leading, spacing: 8) {
                    Button { open.toggle() } label: {
                        Text(preset.chipLabel.uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.ink)
                            .padding(.horizontal, 16).frame(minHeight: 44, alignment: .center)
                            .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.border, lineWidth: 2))
                    }.buttonStyle(.plain).accessibilityAddTraits(open ? .isSelected : [])
                    if open {
                        Text("\(preset.label) falls while you mine tonight. Laser it, then sell it at the Market spot price.")
                            .font(AppFont.body(14)).foregroundStyle(Theme.textDim).frame(maxWidth: 260, alignment: .leading)
                            .padding(10).background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1.5))
                    }
                }
            }
        }
    }
}

/// Earned sky-event badges (mirrors web SkyBadgeRow). Renders nothing until one is earned.
struct SkyBadgeRow: View {
    let badges: [String: PlayerBadge]

    var body: some View {
        let earned = badges.values.filter { SkyEvents.event($0.eventId) != nil }.sorted { $0.earnedAt < $1.earnedAt }
        if !earned.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "Sky event badges")
                ForEach(earned, id: \.eventId) { b in
                    HStack(spacing: 10) {
                        Image(systemName: "rosette").font(.system(size: 18, weight: .bold))
                        Text(b.tier == .gold ? "GOLD" : "SILVER").font(AppFont.display(14)).tracking(1.2)
                        Text(SkyEvents.event(b.eventId)?.name ?? "").font(AppFont.body(14))
                        Spacer(minLength: 0)
                    }
                    .foregroundStyle(Theme.ink).padding(.horizontal, 12).frame(minHeight: 44)
                    .background(b.tier == .gold ? Theme.blueBright.opacity(0.35) : Theme.paper2, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
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
        VStack(alignment: .leading, spacing: 4) {
            Text(banner.title.uppercased()).font(AppFont.display(14)).tracking(1.4)
            Text(banner.detail).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
            Text("\(banner.earned) / \(banner.total) BADGES").font(AppFont.display(14)).tracking(1.0)
        }
        .foregroundStyle(Theme.ink)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, 12).padding(.vertical, 8).frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
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
private struct ChipFlow: Layout {
    var spacing: CGFloat

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
                rows.append(Row(y: prev.y + prev.height + spacing)); x = 0
            }
            rows[rows.count - 1].items.append((i, x))
            rows[rows.count - 1].height = max(rows[rows.count - 1].height, size.height)
            x += size.width; rows[rows.count - 1].maxX = x; x += spacing
        }
        return rows
    }
}
