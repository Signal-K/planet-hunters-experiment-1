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
    @Environment(SurveyCenter.self) private var surveys: SurveyCenter?
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
                        if let event = SkyEvents.event(b.eventId) {
                            ShareLink(item: BadgeShare.url, message: Text(BadgeShare.text(event.name, tier: b.tier))) {
                                Text("SHARE").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.bluePress)
                                    .frame(minWidth: 44, minHeight: 44)
                            }.simultaneousGesture(TapGesture().onEnded { surveys?.enqueue(Surveys.badgeShared) })
                        }
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

/// Share text and link, identical to web `lib/share.ts`.
enum BadgeShare {
    static let url = URL(string: "https://playlandnam.space/?utm_source=badge_share&utm_medium=share&utm_campaign=sky_event_badge")!
    static func text(_ eventName: String, tier: BadgeTier) -> String {
        "I earned the \(tier == .gold ? "Gold" : "Silver") \(eventName) badge in Landnam: Space Program."
    }
}
