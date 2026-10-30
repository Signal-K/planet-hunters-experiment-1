import SwiftUI
import LandnamCore

/// Control room palette (web `--ln-world-*`): hull-white panels, a navy outline, and a night-sky window.
private enum Room {
    static let outline = Theme.hex(0x16293B)
    static let hullLit = Theme.hex(0xFAF7F0)
    static let hull = Theme.hex(0xECE8DF)
    static let hullShade = Theme.hex(0xC9C4B8)
    static let blue = Theme.hex(0x2F6FA8)
    static let teal = Theme.hex(0x2A9AA3)
    static let glass = Theme.hex(0x9FD6E4)
    static let nightTop = Theme.hex(0x0E1528)
    static let nightMid = Theme.hex(0x1A2744)
    static let asphalt = Theme.hex(0x3A404C)
}

/// Control Station: a control room with a window onto the sky above a desk of monitors, one per owned instrument
/// (mirrors web ControlStationBoard, SSL-496 and SSL-611). The window is a SwiftUI Canvas drawn from the same
/// 640x320 diagram data, so markers can't drift from the planets.
struct ControlStationScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(Services.self) private var services: Services?
    @State private var bodyId = "all"
    @State private var community: CommunityResearch?
    var signals: [InstrumentSignal] = []

    private var model: ControlStation.Model {
        ControlStation.build(player: store.player, signals: signals, bodyId: bodyId, now: store.now)
    }

    var body: some View {
        ScreenFrame(title: "Control Station", back: { store.go(.hub) }, night: true) {
            let m = model
            // SSL-673: the Daily research plate leads the screen.
            ResearchCalendarPanel(stamps: store.player.researchStamps, now: store.now, community: community, hasDiscovery: !store.player.discoveredExoplanetTargets.isEmpty)
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    WorldSpaceWeekBanner(banner: WorldSpaceWeek.banner(badges: store.player.badges, now: store.now))
                    ScrollView(.horizontal, showsIndicators: false) { WorldSpaceWeekChips(chips: m.skyBadges) }
                }
                StationMap(model: m).coachTarget("station-map")
                filters(m).coachTarget("station-filters")
                desk(m)
            }
            .padding(12)
            .background(LinearGradient(colors: [Room.hullLit, Room.hull], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Room.outline, lineWidth: 2))
            SkyBadgeRow(badges: store.player.badges)
        }
        .helpable(.instrumentHub, firstVisit: true)
        .task {
            guard let api = services?.communityResearchAPI(), let res = await api.fetch() else { return }
            community = res
        }
    }

    private func filters(_ m: ControlStation.Model) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(m.filters, id: \.id) { f in
                    let on = f.id == m.activeBodyId
                    Button { bodyId = f.id } label: {
                        Text(f.label.uppercased()).font(AppFont.display(14)).tracking(1.4)
                            .padding(.horizontal, 18).frame(minHeight: 48)
                            .foregroundStyle(on ? Room.hullLit : Room.outline)
                            .background(on ? Room.blue : Room.hullLit, in: RoundedRectangle(cornerRadius: 10))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Room.outline, lineWidth: 2))
                    }.buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
                }
            }.padding(2)
        }
    }

    /// The desk: a blue edge band over hull panels, holding one console per instrument.
    private func desk(_ m: ControlStation.Model) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            if let empty = m.emptyLabel { Text(empty).font(AppFont.body(14, "Bold")).foregroundStyle(Room.outline) }
            ForEach(m.groups) { group in
                VStack(alignment: .leading, spacing: 10) {
                    Text(group.label.uppercased()).font(AppFont.display(14)).tracking(1.9).foregroundStyle(Room.outline)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 260), spacing: 12)], spacing: 12) {
                        ForEach(group.rows) { row in console(row) }
                    }
                }
            }
        }
        .padding(.horizontal, 12).padding(.top, 18).padding(.bottom, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LinearGradient(colors: [Room.hull, Room.hullShade], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 12))
        .overlay(alignment: .top) { UnevenRoundedRectangle(topLeadingRadius: 12, topTrailingRadius: 12).fill(Room.blue).frame(height: 8) }
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Room.outline, lineWidth: 2))
    }

    /// One console: a monitor beside a nameplate, a status lamp and a key.
    private func console(_ row: ControlStation.Row) -> some View {
        HStack(alignment: .top, spacing: 12) {
            monitor(row)
            VStack(alignment: .leading, spacing: 6) {
                Text(row.name.uppercased()).font(AppFont.display(16)).tracking(0.6).foregroundStyle(Room.outline).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 8) {
                    Circle().fill(row.live ? Room.teal : Color.clear).frame(width: 12, height: 12)
                        .overlay(Circle().stroke(row.live ? Room.teal : Room.blue, lineWidth: 2))
                        .shadow(color: row.live ? Room.teal : .clear, radius: 3)
                    Text(row.status.uppercased()).font(AppFont.body(14, "Bold")).tracking(0.8).foregroundStyle(Room.outline)
                }
                WorldSpaceWeekChips(chips: row.wsw)
                if !row.projects.isEmpty {
                    ChipFlow(spacing: 6) {
                        ForEach(row.projects, id: \.self) { project in
                            Text(project.uppercased()).font(AppFont.display(14, "Bold")).tracking(0.6).foregroundStyle(Room.outline)
                                .padding(.horizontal, 8).padding(.vertical, 4)
                                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Room.outline, lineWidth: 1))
                        }
                    }
                }
                if row.buildPrompt { key("BUILD", label: "Build \(row.name)", id: "control-station-build") { store.go(.build) } }
                if let signal = row.open { key("OPEN", label: "Open \(row.name)", id: "control-station-open") { open(signal) } }
            }
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Room.hullLit, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Room.outline, lineWidth: 2))
    }

    @ViewBuilder private func monitor(_ row: ControlStation.Row) -> some View {
        ZStack(alignment: .topTrailing) {
            if let signal = row.open {
                EquipmentThumb(kind: signal.kind, count: row.readyCount)
                    .frame(width: 96, height: 96)
            } else {
                Text((row.buildPrompt ? "No signal" : row.live ? "Listening" : "Standby").uppercased())
                    .font(AppFont.display(14)).tracking(0.8).foregroundStyle(Room.glass).multilineTextAlignment(.center)
                    .frame(width: 96, height: 96).background(Room.asphalt)
            }
        }
        .frame(width: 96, height: 96)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Room.outline, lineWidth: 3))
        .padding(3).overlay(RoundedRectangle(cornerRadius: 10).stroke(Room.hullShade, lineWidth: 3))
        .accessibilityHidden(true)
    }

    private func key(_ title: String, label: String, id: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(AppFont.display(14)).tracking(1.7).foregroundStyle(Room.hullLit)
                .padding(.horizontal, 20).frame(minWidth: 96, minHeight: 48)
                .background(Room.blue, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Room.outline, lineWidth: 2))
        }.buttonStyle(.plain).accessibilityLabel(label).accessibilityIdentifier(id)
    }

    private func open(_ s: InstrumentSignal) {
        switch s.kind {
        case .transit: store.go(.galaxy)
        case .deepSpace: store.go(.asteroidDiscovery)
        case .saturn: store.go(.saturnStormSearch)
        }
    }
}

struct StationMap: View {
    let model: ControlStation.Model

    var body: some View {
        Canvas { ctx, size in
            let k = min(size.width / ControlStation.mapWidth, size.height / ControlStation.mapHeight)
            let ox = (size.width - ControlStation.mapWidth * k) / 2, oy = (size.height - ControlStation.mapHeight * k) / 2
            func pt(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: ox + x * k, y: oy + y * k) }
            for (x, y) in [(36, 42), (84, 96), (300, 48), (360, 210), (420, 64), (590, 46), (560, 250), (70, 250)] {
                ctx.fill(Path(ellipseIn: CGRect(x: pt(Double(x), Double(y)).x - 1.5, y: pt(Double(x), Double(y)).y - 1.5, width: 3, height: 3)), with: .color(Room.hullLit.opacity(0.8)))
            }
            for b in model.bodies {
                let c = pt(b.x, b.y), r = b.r * k
                if !b.ringed {
                    ctx.stroke(Path(ellipseIn: CGRect(x: c.x - (r + 40 * k), y: c.y - (r + 40 * k), width: 2 * (r + 40 * k), height: 2 * (r + 40 * k))),
                               with: .color(Room.glass.opacity(0.55)), style: StrokeStyle(lineWidth: 1.5, dash: [5, 7]))
                }
                let disc = Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r))
                ctx.fill(disc, with: .color(b.ringed ? Room.hullShade : Room.blue))
                if b.ringed {
                    ctx.stroke(disc, with: .color(Room.hullLit), lineWidth: 2)
                    var ring = ctx
                    ring.translateBy(x: c.x, y: c.y); ring.rotate(by: .degrees(-18))
                    ring.stroke(Path(ellipseIn: CGRect(x: -r * 1.75, y: -r * 0.42, width: r * 3.5, height: r * 0.84)), with: .color(Room.glass), lineWidth: 3)
                } else {
                    var land = ctx; land.clip(to: disc)
                    land.fill(Path(ellipseIn: CGRect(x: c.x - r * 0.68, y: c.y - r * 0.4, width: r * 0.92, height: r * 0.56)), with: .color(Room.glass))
                    land.fill(Path(ellipseIn: CGRect(x: c.x + r * 0.08, y: c.y - r * 0.14, width: r * 0.4, height: r * 0.68)), with: .color(Room.glass))
                }
                ctx.draw(Text(b.name.uppercased()).font(AppFont.display(14)).foregroundStyle(Room.glass), at: CGPoint(x: c.x, y: c.y + r + 18), anchor: .top)
            }
            for m in model.markers {
                let c = pt(m.x, m.y)
                if m.readyCount > 0 {
                    let badge = Path(ellipseIn: CGRect(x: c.x - 14, y: c.y - 14, width: 28, height: 28))
                    ctx.fill(badge, with: .color(Room.hullLit))
                    ctx.stroke(badge, with: .color(Room.blue), lineWidth: 2)
                    ctx.draw(Text("\(m.readyCount)").font(AppFont.display(14)).foregroundStyle(Room.outline), at: c)
                } else {
                    let dot = Path(ellipseIn: CGRect(x: c.x - 6, y: c.y - 6, width: 12, height: 12))
                    ctx.fill(dot, with: .color(Room.teal))
                    ctx.stroke(dot, with: .color(Room.hullLit), lineWidth: 2)
                }
            }
        }
        .frame(height: 256).frame(maxWidth: .infinity)
        .background(LinearGradient(colors: [Room.nightTop, Room.nightMid], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 12))
        .overlay { HStack { Spacer(); Rectangle().fill(Room.hull.opacity(0.55)).frame(width: 3); Spacer(); Rectangle().fill(Room.hull.opacity(0.55)).frame(width: 3); Spacer() } }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Room.outline, lineWidth: 3))
        .accessibilityHidden(true)
    }
}

/// Instrument thumbnail with its ready count (web `EquipmentPreview` + count badge).
struct EquipmentThumb: View {
    let kind: SignalKind
    let count: Int

    var body: some View {
        Canvas { ctx, size in
            let k = size.width / 48
            func p(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: x * k, y: y * k) }
            func dot(_ x: Double, _ y: Double, _ r: Double) { ctx.fill(Path(ellipseIn: CGRect(x: (x - r) * k, y: (y - r) * k, width: 2 * r * k, height: 2 * r * k)), with: .color(Room.hullLit)) }
            ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Room.nightTop))
            switch kind {
            case .transit:
                var path = Path(); path.move(to: p(4, 24))
                path.addCurve(to: p(18, 24), control1: p(10, 22), control2: p(14, 23))
                path.addCurve(to: p(30, 24), control1: p(22, 18), control2: p(26, 30))
                path.addCurve(to: p(44, 23), control1: p(34, 20), control2: p(38, 22))
                ctx.stroke(path, with: .color(Room.glass), lineWidth: 1.6 * k)
                dot(12, 14, 1.2); dot(34, 12, 1)
            case .saturn:
                let c = p(24, 24)
                var ring = ctx; ring.translateBy(x: c.x, y: c.y); ring.rotate(by: .degrees(-18))
                ring.stroke(Path(ellipseIn: CGRect(x: -16 * k, y: -6 * k, width: 32 * k, height: 12 * k)), with: .color(Room.glass), lineWidth: 2 * k)
                ctx.fill(Path(ellipseIn: CGRect(x: c.x - 8 * k, y: c.y - 8 * k, width: 16 * k, height: 16 * k)), with: .color(Room.hullShade))
            case .deepSpace:
                dot(12, 16, 1.4); dot(28, 12, 1); dot(36, 22, 1.6); dot(18, 30, 1.2); dot(32, 34, 1)
            }
        }
        .frame(width: 96, height: 96)
        .overlay(alignment: .topTrailing) {
            Text("\(count)").font(AppFont.display(14)).foregroundStyle(Room.outline)
                .frame(minWidth: 26, minHeight: 26).padding(.horizontal, 3)
                .background(Room.hullLit, in: Capsule()).overlay(Capsule().stroke(Room.blue, lineWidth: 2))
                .offset(x: -4, y: 4)
        }
        .accessibilityHidden(true)
    }
}

/// Weekly path board, kept on the same native save model as the web CommunityResearchScreen.
struct CommunityResearchScreen: View {
    @Environment(GameStore.self) private var store
    @State private var selectedPath: ResearchPathID = .explorer
    @State private var selectedStep = 0
    @State private var showingRewards = false

    private var lockedPath: ResearchPathID? { ResearchPathRules.pathThisWeek(store.player.researchPath, now: store.now) }
    private var activePath: ResearchPathID { lockedPath ?? selectedPath }
    private var steps: [ResearchPathStep] { ResearchPathRules.steps(activePath) }
    private var week: String { ResearchPathRules.weekKey(store.now) }
    private var progress: [(have: Int, need: Int)] { steps.map { ResearchPathRules.progress($0, stamps: store.player.researchStamps, week: week, now: store.now) } }
    private var currentStep: Int { min(selectedStep, max(0, steps.count - 1)) }
    private var historicalContributions: [String: Int] {
        let submittedAt = Array(store.player.tessClassifications.values.map(\.submittedAt))
            + Array(store.player.asteroidClassifications.values.map(\.submittedAt))
            + Array(store.player.saturnClassifications.values.map(\.submittedAt))
        return ResearchStampRules.historicalContributionMonths(store.player.researchStamps, submittedAt: submittedAt, now: store.now)
    }

    var body: some View {
        ScreenFrame(title: "Community research", back: { store.go(.hub) }, night: true) {
            if lockedPath == nil { picker } else { board }
        }
        .task { store.claimResearchRewards() }
    }

    private var picker: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("THIS WEEK'S PATH").font(AppFont.display(14)).tracking(1.7).foregroundStyle(Theme.hex(0x9FD6E4))
            Text("Choose one route. It locks until Monday UTC.").font(AppFont.body(16)).foregroundStyle(Theme.hex(0xFAF7F0))
            HStack(spacing: 10) {
                pathButton(.explorer, title: "EXPLORER", detail: "Signals and scans", icon: "viewfinder")
                pathButton(.trader, title: "TRADER", detail: "Exchange and contracts", icon: "chart.line.uptrend.xyaxis")
            }
            lockedTile
            console(title: "HOW IT WORKS") {
                Text("1  Pick a path. It is locked for the week.")
                Text("2  Finish its five steps in any order.")
                Text("3  Every stamp fills the shared community bar.")
            }
            PrimaryButton(title: "START \(selectedPath.rawValue.uppercased())") { store.chooseResearchPath(selectedPath) }
                .accessibilityIdentifier("community-research-choose")
        }
    }

    private func pathButton(_ path: ResearchPathID, title: String, detail: String, icon: String) -> some View {
        Button {
            selectedPath = path
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: icon).font(.system(size: 28, weight: .light))
                Text(title).font(AppFont.display(14, "ExtraBold")).tracking(1.2)
                Text(detail).font(AppFont.body(14))
            }
            .foregroundStyle(selectedPath == path ? Theme.paper : Theme.ink)
            .frame(maxWidth: .infinity, minHeight: 108, alignment: .leading)
            .padding(12)
            .background(selectedPath == path ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.ink, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("research-path-\(path.rawValue)")
    }

    private var lockedTile: some View {
        HStack(spacing: 12) {
            Image(systemName: "star").font(.system(size: 24, weight: .light))
            VStack(alignment: .leading, spacing: 3) {
                Text("AGENCY").font(AppFont.display(14, "ExtraBold")).tracking(1.2)
                Text("Locked · finish more weekly paths").font(AppFont.body(14))
            }
            Spacer()
        }
        .foregroundStyle(Theme.ink.opacity(0.62))
        .padding(12).frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.paper.opacity(0.72), in: RoundedRectangle(cornerRadius: 18)).overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.ink.opacity(0.55), lineWidth: 2))
    }

    private var board: some View {
        let step = steps[currentStep]
        let p = progress[currentStep]
        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Text(activePath.rawValue.uppercased()).font(AppFont.display(14, "ExtraBold")).tracking(1.3)
                Text("WEEK OF \(week)").font(AppFont.body(14))
            }.foregroundStyle(Theme.hex(0x9FD6E4))
            HStack(spacing: 0) {
                readoutTab("MISSION", selected: !showingRewards) { showingRewards = false }
                readoutTab("REWARDS", selected: showingRewards) { showingRewards = true }
            }
            .overlay(Rectangle().stroke(Theme.hex(0x9FD6E4).opacity(0.7), lineWidth: 1))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(steps.enumerated()), id: \.element.id) { index, item in
                        let done = progress[index].have >= progress[index].need
                        Button { selectedStep = index; showingRewards = false } label: {
                            VStack(spacing: 5) {
                                Image(systemName: item.icon).font(.system(size: 20, weight: .medium))
                                    .frame(width: 32, height: 32)
                                    .background((index == currentStep ? Theme.paper : Theme.blue).opacity(0.18), in: Circle())
                                Text(done ? "✓" : "\(progress[index].have)/\(progress[index].need)").font(AppFont.display(14, "ExtraBold"))
                            }
                            .foregroundStyle(index == currentStep ? Theme.paper : Theme.ink)
                            .frame(width: 70, height: 72)
                            .background(index == currentStep ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink, lineWidth: 2))
                        }.buttonStyle(.plain)
                    }
                }
            }
            if !showingRewards {
            console(title: "STEP \(currentStep + 1) OF \(steps.count) · \(p.have)/\(p.need)") {
                Image(systemName: step.icon).font(.system(size: 42, weight: .light)).foregroundStyle(Theme.ink)
                Text(step.title).font(AppFont.display(20, "ExtraBold")).foregroundStyle(Theme.ink)
                Text(step.brief).font(AppFont.body(16)).foregroundStyle(Theme.ink)
                Text(step.why).font(AppFont.body(14)).foregroundStyle(Theme.ink.opacity(0.78))
            }
            console(title: activePath == .trader ? "TRADER WEEK" : "EXPLORER WEEK") {
                Text("Research days stamped: \(stampedDays) of 7").font(AppFont.body(16))
                HStack(spacing: 6) {
                    ForEach(0..<7, id: \.self) { index in
                        Circle().fill(dayStamped(index) ? Theme.blue : Theme.paper2).frame(width: 24, height: 24)
                            .overlay(Circle().stroke(Theme.ink, lineWidth: 1))
                    }
                }
                Text("Steps finished: \(progress.filter { $0.have >= $0.need }.count) of \(steps.count)").font(AppFont.body(16))
            }
            if step.id == "breakthrough" && p.have >= p.need {
                Text("A permanent weekly badge and 25 regular fragments. The badge stays in your collection.")
                    .font(AppFont.body(14)).foregroundStyle(Theme.hex(0xF2C24C))
            }
            PrimaryButton(title: step.kind == .event ? "JOIN" : "GO") { go(step.kind) }
                .accessibilityIdentifier("community-research-go")
            } else {
                rewardsReadout
            }
        }
    }

    private var rewardsReadout: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                rewardMilestone(step: 2, amount: 5, symbol: "waveform.path", earned: progress[1].have >= progress[1].need)
                rewardMilestone(step: 4, amount: 10, symbol: "viewfinder", earned: progress[3].have >= progress[3].need)
                rewardMilestone(step: 5, amount: nil, symbol: "star.fill", earned: progress[4].have >= progress[4].need)
            }
            HStack(spacing: 12) {
                Image(systemName: "sparkles").font(.system(size: 22, weight: .medium)).foregroundStyle(Theme.hex(0xF2C24C))
                    .frame(width: 42, height: 42).background(Theme.hex(0xF2C24C).opacity(0.16), in: Circle())
                Text("FRAGMENTS").font(AppFont.display(14, "ExtraBold")).tracking(1.1)
                Spacer()
                Text("\(store.player.researchFragments)").font(AppFont.display(24, "ExtraBold")).foregroundStyle(Theme.hex(0xF2C24C))
            }
            .padding(12).background(Theme.hex(0x1A2744), in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.hex(0x9FD6E4).opacity(0.65), lineWidth: 2))
            let bar = ResearchStampRules.communityBar(own: ResearchStampRules.stampsIn(store.player.researchStamps, year: year, month: month))
            console(title: "SHARED TOTAL \(bar.total) / \(bar.goal)") { Bar(value: bar.fill) }
            console(title: "CONTRIBUTION HISTORY") {
                ForEach(ResearchStampRules.monthHistory(store.player.researchStamps, now: store.now, historicalContributions: historicalContributions)) { month in
                    HStack { Text(month.label); Spacer(); Text("\(month.stamps) contribution\(month.stamps == 1 ? "" : "s")").font(AppFont.body(14, "Bold")) }
                }
            }
        }
    }

    private func rewardMilestone(step: Int, amount: Int?, symbol: String, earned: Bool) -> some View {
        VStack(spacing: 6) {
            Image(systemName: symbol).font(.system(size: 22, weight: .medium))
                .frame(width: 42, height: 42).background(Theme.hex(0xF2C24C).opacity(0.16), in: Circle())
            Text("STEP \(step)").font(AppFont.display(12, "ExtraBold")).tracking(0.8)
            Text(amount.map { "\($0)" } ?? "BADGE").font(AppFont.display(17, "ExtraBold")).foregroundStyle(Theme.hex(0xF2C24C))
            Text(amount == nil ? "BREAKTHROUGH" : "FRAGMENTS").font(AppFont.body(11, "Bold")).foregroundStyle(Theme.hex(0x9FD6E4))
        }
        .frame(maxWidth: .infinity, minHeight: 126)
        .foregroundStyle(earned ? Theme.paper : Theme.hex(0x9FD6E4))
        .background(earned ? Theme.hex(0x274E61) : Theme.hex(0x1A2744), in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(earned ? Theme.hex(0xF2C24C) : Theme.hex(0x9FD6E4).opacity(0.5), lineWidth: 2))
    }

    private var researchLedger: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("RESEARCH INK").font(AppFont.display(14, "ExtraBold")).tracking(1.1)
                Spacer()
                Text("\(store.player.researchUniversalFragments)").font(AppFont.display(18, "ExtraBold"))
            }
            .foregroundStyle(Theme.hex(0xFAF7F0))
            Text("A general currency for future fragment store cosmetics. Nothing spends it yet.")
                .font(AppFont.body(14)).foregroundStyle(Theme.hex(0x9FD6E4))
            HStack {
                Text("REGULAR FRAGMENTS").font(AppFont.display(14, "ExtraBold")).tracking(1.1)
                Spacer()
                Text("\(store.player.researchFragments)").font(AppFont.display(18, "ExtraBold"))
            }
            .foregroundStyle(Theme.hex(0xFAF7F0))
            Button("CONVERT \(ResearchFragments.conversionRate) TO 1 INK") { store.convertResearchFragments() }
                .font(AppFont.display(14, "ExtraBold")).tracking(1.1)
                .foregroundStyle(store.player.researchFragments >= ResearchFragments.conversionRate ? Theme.ink : Theme.paper.opacity(0.6))
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(store.player.researchFragments >= ResearchFragments.conversionRate ? Theme.hex(0xF2C24C) : Theme.ink.opacity(0.55))
                .overlay(Rectangle().stroke(Theme.paper, lineWidth: 2))
                .buttonStyle(.plain)
                .disabled(store.player.researchFragments < ResearchFragments.conversionRate)
                .accessibilityIdentifier("research-ink-convert")
            Divider().overlay(Theme.hex(0x9FD6E4).opacity(0.5))
            Text("RESEARCH HISTORY").font(AppFont.display(14, "ExtraBold")).tracking(1.1).foregroundStyle(Theme.hex(0x9FD6E4))
            if store.player.researchFragmentHistory.isEmpty && store.player.orionidsFragments.caught == 0 {
                Text("Complete a research week or sky event to add a permanent record here.")
                    .font(AppFont.body(14)).foregroundStyle(Theme.hex(0x9FD6E4))
            }
            ForEach(store.player.researchFragmentHistory) { entry in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry.title.uppercased()).font(AppFont.body(14, "Bold"))
                        Text("\(entry.fragmentsEarned) regular fragments recorded\(entry.badgeId == nil ? "" : " · badge kept")")
                            .font(AppFont.body(14)).foregroundStyle(Theme.hex(0x9FD6E4))
                    }
                    Spacer()
                }
                .foregroundStyle(Theme.hex(0xFAF7F0))
            }
            if store.player.orionidsFragments.caught > 0 {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("ORIONIDS SHOWER").font(AppFont.body(14, "Bold"))
                        Text("\(store.player.orionidsFragments.caught) fragments caught · \(store.player.orionidsFragments.redeemed) redeemed")
                            .font(AppFont.body(14)).foregroundStyle(Theme.hex(0x9FD6E4))
                    }
                    Spacer()
                }
                .foregroundStyle(Theme.hex(0xFAF7F0))
            }
        }
        .padding(12)
        .background(Theme.hex(0x1A2744), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.hex(0x9FD6E4).opacity(0.65), lineWidth: 2))
        .accessibilityIdentifier("research-ink-ledger")
    }
    private func readoutTab(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) { Text(title).font(AppFont.display(14, "ExtraBold")).tracking(1.1).frame(maxWidth: .infinity, minHeight: 44) }
            .foregroundStyle(selected ? Theme.ink : Theme.paper)
            .background(selected ? Theme.paper : Theme.ink.opacity(0.45))
            .buttonStyle(.plain)
    }

    private var stampedDays: Int {
        (0..<7).filter(dayStamped).count
    }
    private var year: Int { Int(week.prefix(4)) ?? 1970 }
    private var month: Int { Int(week.dropFirst(5).prefix(2)) ?? 1 }
    private func dayStamped(_ index: Int) -> Bool {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let weekday = calendar.component(.weekday, from: Date(timeIntervalSince1970: store.now / 1000))
        let ms = store.now - Double((weekday + 5) % 7 - index) * ResearchPathRules.dayMs
        return !(store.player.researchStamps.days[ResearchStampRules.dayKey(ms)] ?? []).isEmpty
    }
    private func console<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(title).font(AppFont.display(14, "ExtraBold")).tracking(1.3).foregroundStyle(Theme.ink)
            content().font(AppFont.body(14)).foregroundStyle(Theme.ink)
        }.padding(14).frame(maxWidth: .infinity, alignment: .leading).background(Theme.paper, in: RoundedRectangle(cornerRadius: 18)).overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.ink, lineWidth: 2))
    }
    private func go(_ kind: StampKind) {
        switch kind {
        case .exchangeSale, .priceAlert: store.go(.market)
        case .contractRun: store.openMissionBoard(tab: 0)
        default: store.go(.instrumentHub)
        }
    }
}
