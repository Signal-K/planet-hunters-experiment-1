import SwiftUI
import LandnamCore

/// Daily research plate on the Control Station: today's tasks, a month of stamps, the community bar
/// (mirrors web ResearchCalendar, SSL-663 and SSL-664).
struct ResearchCalendarPanel: View {
    let stamps: ResearchStamps
    let now: Double
    /// SSL-673: the shared monthly total, nil until it loads or when offline.
    var community: CommunityResearch? = nil
    /// SSL-674: a discovery has opened a survey flight, so the discovery task row shows.
    var hasDiscovery = false

    private static let outline = Theme.hex(0x16293B)
    private static let hullLit = Theme.hex(0xFAF7F0)
    private static let hull = Theme.hex(0xECE8DF)
    private static let hullShade = Theme.hex(0xC9C4B8)
    private static let blue = Theme.hex(0x2F6FA8)
    private static let teal = Theme.hex(0x2A9AA3)
    private static let glass = Theme.hex(0x9FD6E4)
    private static let nightMid = Theme.hex(0x1A2744)
    private static let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    private var utc: DateComponents {
        var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!
        return c.dateComponents([.year, .month], from: Date(timeIntervalSince1970: now / 1000))
    }

    var body: some View {
        let year = utc.year!, month = utc.month!
        let streak = ResearchStampRules.streak(stamps, now: now)
        let bar = ResearchStampRules.communityBar(own: ResearchStampRules.stampsIn(stamps, year: year, month: month), server: community)
        let today = stamps.days[ResearchStampRules.dayKey(now)] ?? []
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(ResearchStampRules.title.uppercased()).font(AppFont.display(14)).tracking(1.7).foregroundStyle(Self.outline)
                Spacer(minLength: 12)
                Text(streak > 0 ? "\(streak) day\(streak == 1 ? "" : "s") running" : "No streak yet")
                    .font(AppFont.body(14, "Bold")).foregroundStyle(Self.outline).accessibilityIdentifier("research-streak")
            }
            Text(ResearchStampRules.blurb).font(AppFont.body(14)).foregroundStyle(Self.outline.opacity(0.85)).fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("research-blurb")
            VStack(spacing: 6) {
                ForEach(ResearchStampRules.tasks(hasDiscovery: hasDiscovery), id: \.kind) { task in
                    let done = today.contains(task.kind)
                    HStack(spacing: 10) {
                        Circle().fill(done ? Self.blue : Color.clear).frame(width: 16, height: 16).overlay(Circle().stroke(Self.outline, lineWidth: 2))
                        Text(task.label).font(AppFont.body(14, "SemiBold")).foregroundStyle(Self.outline).frame(maxWidth: .infinity, alignment: .leading)
                        Text(done ? "STAMPED" : "OPEN").font(AppFont.display(14, "Bold")).tracking(1.4).foregroundStyle(Self.outline)
                    }
                    .padding(.horizontal, 10).frame(minHeight: 44)
                    .background(Self.hullLit, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Self.outline.opacity(0.3), lineWidth: 1))
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier("research-task-\(task.kind.rawValue)")
                    .accessibilityValue(done ? "done" : "open")
                }
            }
            Text("\(Self.months[month - 1]) \(String(year))".uppercased()).font(AppFont.display(14)).tracking(1.7).foregroundStyle(Self.outline)
            grid(year: year, month: month)
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Community stamps this month").font(AppFont.body(14, "Bold"))
                    Spacer(minLength: 12)
                    Text(verbatim: "\(bar.total) / \(bar.goal)").font(AppFont.body(14, "Bold"))
                }.foregroundStyle(Self.outline)
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 8).fill(Self.nightMid)
                        RoundedRectangle(cornerRadius: 8).fill(Self.blue).frame(width: max(0, g.size.width * bar.fill))
                    }
                }
                .frame(height: 16).clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Self.outline, lineWidth: 2))
                .accessibilityElement().accessibilityLabel("Community stamps").accessibilityValue("\(bar.total) of \(bar.goal)")
                Text(stateLine(bar))
                    .font(AppFont.body(14)).foregroundStyle(Self.outline.opacity(0.85)).fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("research-community-state")
            }.accessibilityIdentifier("research-community-bar")
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LinearGradient(colors: [Self.hullLit, Self.hull], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Self.outline, lineWidth: 2))
        .accessibilityIdentifier("research-calendar")
    }

    private func grid(year: Int, month: Int) -> some View {
        let weeks = ResearchStampRules.monthGrid(year: year, month: month, stamps: stamps, now: now)
        return VStack(spacing: 4) {
            HStack(spacing: 4) {
                ForEach(Array(["M", "T", "W", "T", "F", "S", "S"].enumerated()), id: \.offset) { _, d in
                    Text(d).font(AppFont.display(14)).foregroundStyle(Self.outline.opacity(0.75)).frame(maxWidth: .infinity)
                }
            }
            ForEach(Array(weeks.enumerated()), id: \.offset) { _, week in
                HStack(spacing: 4) {
                    ForEach(Array(week.enumerated()), id: \.offset) { _, cell in
                        if let cell { dayCell(cell) } else { Color.clear.frame(maxWidth: .infinity).frame(height: 44) }
                    }
                }
            }
        }
    }

    private func dayCell(_ c: CalendarCell) -> some View {
        let stamped = !c.kinds.isEmpty
        return Text("\(c.day)").font(AppFont.body(14, "Bold"))
            .foregroundStyle(stamped ? Self.glass : Self.outline)
            .frame(maxWidth: .infinity).frame(height: 44)
            .background(stamped ? Self.blue : Self.hullShade.opacity(0.35), in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(c.today || stamped ? Self.outline : Self.outline.opacity(0.3), lineWidth: c.today ? 2 : 1))
            .overlay(alignment: .bottomTrailing) {
                if c.kinds.count > 1 { Circle().fill(Self.teal).frame(width: 10, height: 10).overlay(Circle().stroke(Self.glass, lineWidth: 2)).padding(4) }
            }
            .opacity(c.future ? 0.5 : 1)
            .accessibilityLabel("\(c.day)\(stamped ? ", \(c.kinds.count) research task\(c.kinds.count == 1 ? "" : "s") stamped" : "")")
    }
}

extension ResearchCalendarPanel {
    /// Same three states and copy as web `research-community-state`.
    func stateLine(_ bar: ResearchStampRules.CommunityBar) -> String {
        if let until = bar.bonusUntil, now < until {
            var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!
            let d = c.dateComponents([.day, .month], from: Date(timeIntervalSince1970: until / 1000))
            return "Goal reached. Exchange sales pay +\(bar.bonusPct)% until \(d.day!) \(Self.months[d.month! - 1])."
        }
        if bar.reached { return "Goal reached this month. The +\(bar.bonusPct)% week has ended." }
        return "Fill the bar together and everyone's Exchange sales pay +\(bar.bonusPct)% for a week."
    }
}
