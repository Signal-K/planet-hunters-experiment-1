import SwiftUI
import LandnamCore

/// Two-tone mission palette (web ControlStationConsole.module.css).
private enum Tone {
    static let cream = Theme.hex(0xF4EFE4)
    static let mute = Theme.hex(0xC9D0C2)
    static let cyan = Theme.hex(0x58D0EA)
    static let cyanSoft = Theme.hex(0x9DE7EF)
    static let gold = Theme.hex(0xF2C24C)
    static let ink = Theme.hex(0x10182C)
    static let desk = Theme.hex(0x183A5C).opacity(0.85)
    static let sky = Theme.hex(0x16688F).opacity(0.6)
    static let night = Theme.hex(0x060B18)
    static let earth = Theme.hex(0x1D6F8F)
}

/// Control Station (SSL-730, Liam's drawing): the sky map you look at through your telescopes, Earth's horizon
/// with each telescope where it sits, then the telescope switches and a history tally. Upright it stacks; on a
/// sideways phone the telescopes sit left of the map. Mirrors web ControlStationConsole.
struct ControlStationScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(Services.self) private var services: Services?
    @Environment(\.verticalSizeClass) private var vertical
    @State private var community: CommunityResearch?
    @State private var view: StationSky.SkyView = .all
    @State private var telescopeId: String?
    @State private var pickedId: String?
    @State private var logbook = false
    var signals: [InstrumentSignal] = []

    private var model: ControlStation.Model { ControlStation.build(player: store.player, signals: signals, bodyId: "all", now: store.now) }

    var body: some View {
        let scopes = StationSky.telescopes(model) + StationSky.communityTelescopes(store.player)
        let active = scopes.first { $0.id == telescopeId && $0.built }
        let anomalies = StationSky.sky(player: store.player, signals: signals, view: view, telescope: active)
        ScreenFrame(title: "Control Station", back: { store.go(.hub) }, night: true) {
            if vertical == .compact {
                HStack(alignment: .top, spacing: 0) {
                    desk(scopes).frame(width: 280)
                    sky(scopes, anomalies, active)
                }
            } else {
                VStack(spacing: 0) {
                    sky(scopes, anomalies, active)
                    desk(scopes)
                }
            }
        }
        .helpable(.instrumentHub, firstVisit: !store.player.flightPlan.onboardingMissionDone)
        .sheet(isPresented: $logbook) { logbookSheet }
        .task {
            guard let api = services?.communityResearchAPI(), let res = await api.fetch() else { return }
            community = res
        }
    }

    // MARK: Sky (right tone)

    private func sky(_ scopes: [StationSky.Telescope], _ anomalies: [StationSky.Anomaly], _ active: StationSky.Telescope?) -> some View {
        VStack(spacing: 10) {
            viewSwitch
            scope(anomalies, active).frame(height: vertical == .compact ? 220 : 340).coachTarget("station-map")
            horizon(scopes).frame(height: 120)
        }
        .padding(.top, 12).padding(.horizontal, 12)
        .background(Tone.sky)
    }

    /// Three-way slide switch: a recessed track and a cream thumb.
    private var viewSwitch: some View {
        HStack(spacing: 0) {
            ForEach(StationSky.SkyView.allCases) { v in
                let on = v == view
                Button { pickedId = nil; withAnimation(.easeOut(duration: 0.2)) { view = v } } label: {
                    Text(v.label.uppercased()).font(AppFont.display(14)).tracking(0.8)
                        .foregroundStyle(on ? Theme.hex(0x142840) : Tone.mute)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background { if on { Capsule().fill(Tone.cream).shadow(color: .black.opacity(0.45), radius: 3, y: 2) } }
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
        .padding(4)
        .background(Tone.ink.opacity(0.7), in: Capsule())
        .accessibilityIdentifier("control-station-view")
        .coachTarget("station-filters")
    }

    private func scope(_ anomalies: [StationSky.Anomaly], _ active: StationSky.Telescope?) -> some View {
        let waiting = anomalies.filter { $0.state == .unexplored }.count
        let picked = anomalies.first { $0.id == pickedId }
        return VStack(spacing: 6) {
            HStack {
                Text("SKY MAP").font(AppFont.body(14, "Bold")).foregroundStyle(Tone.mute)
                Spacer()
                Text((active?.name ?? "All telescopes").uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Tone.cream).lineLimit(1)
                Spacer()
                Text("\(waiting) TO CLASSIFY").font(AppFont.body(14, "Bold")).foregroundStyle(Tone.gold)
            }
            .padding(.horizontal, 14).padding(.top, 10)
            GeometryReader { geo in
                ZStack(alignment: .topLeading) {
                    if anomalies.isEmpty {
                        Text(emptyText).font(AppFont.body(15)).foregroundStyle(Tone.mute).multilineTextAlignment(.center)
                            .frame(width: geo.size.width, height: geo.size.height)
                    }
                    ForEach(anomalies) { a in
                        Button {
                            if let s = a.signal { open(s) } else { pickedId = pickedId == a.id ? nil : a.id }
                        } label: { AnomalyMark(anomaly: a, picked: a.id == pickedId).frame(width: 44, height: 44).contentShape(Circle()) }
                        .buttonStyle(.plain)
                        .position(x: a.x * geo.size.width, y: a.y * geo.size.height)
                        .accessibilityLabel("\(a.label), \(a.detail)")
                        .accessibilityIdentifier("control-station-anomaly")
                    }
                }
            }
            .background(RoundedRectangle(cornerRadius: 14).fill(LinearGradient(colors: [Tone.night, Theme.hex(0x0C1630)], startPoint: .top, endPoint: .bottom)))
            .overlay(alignment: .bottom) {
                if let picked {
                    HStack {
                        Text(picked.label).font(AppFont.display(15)).foregroundStyle(Tone.cream)
                        Spacer()
                        Text(picked.detail).font(AppFont.body(14)).foregroundStyle(Tone.mute)
                    }
                    .padding(12).background(Tone.ink.opacity(0.9), in: RoundedRectangle(cornerRadius: 14))
                    .padding(10)
                }
            }
            .padding([.horizontal, .bottom], 10)
        }
        .background(Tone.night, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Tone.cream.opacity(0.28), lineWidth: 1))
    }

    private var emptyText: String {
        switch view {
        case .unexplored: "Nothing waiting. New candidates arrive each day."
        case .explored: "Nothing classified here yet."
        case .all: "Nothing in your catalogue here yet."
        }
    }

    /// Earth's limb with each telescope where it sits: ground on the surface, Space telescope in orbit, Saturn offworld.
    private func horizon(_ scopes: [StationSky.Telescope]) -> some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            ZStack(alignment: .topLeading) {
                Canvas { ctx, size in
                    func limb(_ rx: Double, _ ry: Double) -> Path {
                        Path(ellipseIn: CGRect(x: size.width / 2 - rx / 600 * size.width, y: 300 / 120 * size.height - ry / 120 * size.height, width: 2 * rx / 600 * size.width, height: 2 * ry / 120 * size.height))
                    }
                    ctx.stroke(limb(470, 270), with: .color(Tone.cream.opacity(0.35)), style: StrokeStyle(lineWidth: 1.5, dash: [6, 8]))
                    ctx.fill(limb(424, 234), with: .color(Tone.cyanSoft.opacity(0.28)))
                    ctx.fill(limb(420, 230), with: .color(Tone.earth))
                }
                Text("EARTH").font(AppFont.display(14)).tracking(2).foregroundStyle(Tone.cyanSoft)
                    .position(x: w - 40, y: h - 14)
                ForEach(scopes) { scope in
                    let spot = Self.horizonSpot[scope.place] ?? (0.5, 0.5)
                    let on = scope.id == telescopeId
                    Button { toggle(scope.id) } label: {
                        TelescopeGlyph(place: scope.place).frame(width: 30, height: 30).foregroundStyle(Tone.cream)
                            .frame(width: 48, height: 48)
                            .background(on ? Tone.cyan.opacity(0.3) : Tone.ink.opacity(0.72), in: RoundedRectangle(cornerRadius: scope.place == .surface ? 14 : 24))
                            .overlay(RoundedRectangle(cornerRadius: scope.place == .surface ? 14 : 24).stroke(on ? Tone.cyan : Tone.cream.opacity(0.7), style: StrokeStyle(lineWidth: 2, dash: scope.built ? [] : [4, 4])))
                            .overlay(alignment: .topTrailing) {
                                if scope.readyCount > 0 {
                                    Text("\(scope.readyCount)").font(AppFont.display(14)).foregroundStyle(Tone.ink)
                                        .frame(minWidth: 22, minHeight: 22).background(Tone.gold, in: Capsule()).offset(x: 8, y: -8)
                                }
                            }
                            .opacity(scope.built ? 1 : 0.6)
                    }
                    .buttonStyle(.plain).disabled(!scope.built)
                    .position(x: spot.0 * w, y: spot.1 * h - (scope.place == .surface ? 18 : 0))
                    .accessibilityLabel("\(scope.name), \(scope.status)")
                }
            }
        }
        .padding(.horizontal, -12)
    }

    static let horizonSpot: [StationSky.Place: (Double, Double)] = [.surface: (0.30, 0.70), .orbit: (0.58, 0.24), .offworld: (0.88, 0.18), .relay: (0.10, 0.30)]

    // MARK: Desk (left tone)

    private func desk(_ scopes: [StationSky.Telescope]) -> some View {
        let history = StationSky.history(store.player)
        return VStack(alignment: .leading, spacing: 12) {
            if vertical == .compact { Text("CONTROL STATION").font(AppFont.display(22)).tracking(1).foregroundStyle(Tone.cream) }
            ForEach(scopes) { scope in key(scope) }
            VStack(alignment: .leading, spacing: 8) {
                Divider().overlay(Tone.cream.opacity(0.22))
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("\(history.total)").font(AppFont.display(28)).foregroundStyle(Tone.cyanSoft)
                    Text("CLASSIFIED").font(AppFont.body(14, "Bold")).tracking(1.4).foregroundStyle(Tone.mute)
                }
                ForEach(history.recent.indices, id: \.self) { i in
                    let item = history.recent[i]
                    HStack {
                        Text(item.label).font(AppFont.body(14, "Bold")).foregroundStyle(Tone.cream).lineLimit(1)
                        Spacer()
                        Text(item.detail).font(AppFont.body(14)).foregroundStyle(Tone.mute).lineLimit(1)
                    }
                }
                Button { logbook = true } label: {
                    Text("LOGBOOK").font(AppFont.display(14)).tracking(1.4).foregroundStyle(Tone.cream)
                        .padding(.horizontal, 18).frame(minHeight: 44)
                        .background(Tone.ink.opacity(0.3), in: Capsule()).overlay(Capsule().stroke(Tone.cream.opacity(0.5), lineWidth: 1))
                }
                .buttonStyle(.plain).accessibilityIdentifier("control-station-logbook")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Tone.desk)
    }

    /// A telescope key: a toggle switch that filters the map, an LED, and a digit counter.
    private func key(_ scope: StationSky.Telescope) -> some View {
        let on = scope.id == telescopeId
        return VStack(spacing: 8) {
            Button { toggle(scope.id) } label: {
                HStack(spacing: 12) {
                    ZStack(alignment: on ? .trailing : .leading) {
                        Capsule().fill(on ? Tone.cyan.opacity(0.55) : Tone.ink.opacity(0.7)).frame(width: 48, height: 28)
                        Circle().fill(Tone.cream).frame(width: 22, height: 22).padding(3).shadow(color: .black.opacity(0.45), radius: 2, y: 2)
                    }
                    .opacity(scope.built ? 1 : 0.45)
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 8) {
                            Text(scope.name.uppercased()).font(AppFont.display(16)).tracking(0.6).foregroundStyle(Tone.cream)
                            if scope.community {
                                Text("COMMUNITY").font(AppFont.body(12, "Bold")).tracking(1).foregroundStyle(Tone.gold)
                                    .padding(.horizontal, 8).padding(.vertical, 2).background(Tone.gold.opacity(0.18), in: Capsule())
                            }
                        }
                        HStack(spacing: 6) {
                            Circle().fill(scope.readyCount > 0 ? Tone.gold : scope.live ? Tone.cyan : Theme.hex(0x3A4558)).frame(width: 9, height: 9)
                            Text(scope.status).font(AppFont.body(14, "Bold")).foregroundStyle(Tone.mute)
                        }
                        Text(scope.finds).font(AppFont.body(14, "Bold")).foregroundStyle(Tone.cyanSoft)
                    }
                    Spacer(minLength: 0)
                    if scope.built {
                        Text(String(format: "%02d", scope.readyCount)).font(.system(size: 20, weight: .semibold, design: .monospaced))
                            .foregroundStyle(scope.readyCount > 0 ? Tone.gold : Theme.hex(0x4D5D72))
                            .frame(minWidth: 44, minHeight: 34).background(Theme.hex(0x070C18), in: RoundedRectangle(cornerRadius: 8))
                    }
                }
                .padding(10).frame(minHeight: 60)
            }
            .buttonStyle(.plain).disabled(!scope.built)
            .accessibilityAddTraits(on ? .isSelected : [])
            .accessibilityIdentifier("control-station-telescope-\(scope.id)")
            if !scope.built {
                Button { store.go(.build) } label: {
                    Text("BUILD").font(AppFont.display(15)).tracking(1.2).foregroundStyle(Theme.hex(0x152033))
                        .frame(maxWidth: .infinity, minHeight: 44).background(Tone.cream, in: RoundedRectangle(cornerRadius: 4))
                }
                .buttonStyle(.plain).padding([.horizontal, .bottom], 8)
                .accessibilityLabel("Build \(scope.name)").accessibilityIdentifier("control-station-build")
            }
        }
        .background(LinearGradient(colors: [on ? Tone.cyan.opacity(0.2) : .white.opacity(0.08), Tone.ink.opacity(0.3)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(on ? Tone.cyan : Tone.cream.opacity(0.22), lineWidth: 1))
    }

    private var logbookSheet: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("LOGBOOK").font(AppFont.display(20)).tracking(1.6).foregroundStyle(Tone.cream)
                ResearchCalendarPanel(stamps: store.player.researchStamps, now: store.now, community: community, hasDiscovery: !store.player.discoveredExoplanetTargets.isEmpty)
                WorldSpaceWeekBanner(banner: WorldSpaceWeek.banner(badges: store.player.badges, now: store.now))
                ScrollView(.horizontal, showsIndicators: false) { WorldSpaceWeekChips(chips: model.skyBadges) }
                SkyBadgeRow(badges: store.player.badges)
            }
            .padding(16)
        }
        .background(Theme.hex(0x183A5C))
        .presentationDetents([.medium, .large])
    }

    private func toggle(_ id: String) { pickedId = nil; telescopeId = telescopeId == id ? nil : id }

    private func open(_ s: InstrumentSignal) {
        switch s.kind {
        case .transit: store.go(.galaxy)
        case .deepSpace: store.go(.asteroidDiscovery)
        case .saturn: store.go(.saturnStormSearch)
        }
    }
}

/// An anomaly on the sky map: gold and ringed with a ping when unexplored, cyan when explored, cream outline for catalogue.
private struct AnomalyMark: View {
    let anomaly: StationSky.Anomaly
    let picked: Bool
    @State private var ping = false

    var body: some View {
        let color = anomaly.state == .unexplored ? Tone.gold : anomaly.state == .explored ? Tone.cyan : Tone.cream
        ZStack {
            if anomaly.state == .unexplored {
                Circle().stroke(Tone.gold, lineWidth: 1.5).frame(width: 28, height: 28)
                    .scaleEffect(ping ? 1.5 : 0.6).opacity(ping ? 0 : 0.9)
                    .onAppear { withAnimation(.easeOut(duration: 2.2).repeatForever(autoreverses: false)) { ping = true } }
            }
            Canvas { ctx, size in
                let c = CGPoint(x: size.width / 2, y: size.height / 2)
                let fill = anomaly.state == .catalogue ? Color.clear : color.opacity(anomaly.state == .unexplored ? 0.85 : 0.35)
                switch anomaly.shape {
                case .asteroid:
                    var p = Path()
                    for (i, pt) in [(-4.0, -6.0), (3, -7), (7, -2), (5, 5), (-2, 7), (-7, 1)].enumerated() {
                        let q = CGPoint(x: c.x + pt.0, y: c.y + pt.1); if i == 0 { p.move(to: q) } else { p.addLine(to: q) }
                    }
                    p.closeSubpath(); ctx.fill(p, with: .color(fill)); ctx.stroke(p, with: .color(color), lineWidth: 1.6)
                case .ringed:
                    let disc = Path(ellipseIn: CGRect(x: c.x - 5, y: c.y - 5, width: 10, height: 10))
                    ctx.fill(disc, with: .color(fill)); ctx.stroke(disc, with: .color(color), lineWidth: 1.6)
                    var ring = ctx; ring.translateBy(x: c.x, y: c.y); ring.rotate(by: .degrees(-18))
                    ring.stroke(Path(ellipseIn: CGRect(x: -9, y: -3, width: 18, height: 6)), with: .color(color), lineWidth: 1.6)
                case .planet, .body:
                    let disc = Path(ellipseIn: CGRect(x: c.x - 6, y: c.y - 6, width: 12, height: 12))
                    ctx.fill(disc, with: .color(fill)); ctx.stroke(disc, with: .color(color), lineWidth: 1.6)
                }
            }
            .frame(width: 22, height: 22)
            .shadow(color: anomaly.state == .unexplored ? Tone.gold.opacity(0.8) : .clear, radius: 4)
            if picked { Circle().stroke(Tone.cream, lineWidth: 2).frame(width: 32, height: 32) }
        }
    }
}

/// Telescope glyphs for the horizon: dome on a pier, a tube with solar wings, a ringed body.
private struct TelescopeGlyph: View {
    let place: StationSky.Place
    var body: some View {
        Canvas { ctx, size in
            let k = size.width / 32
            func p(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: x * k, y: y * k) }
            let style = StrokeStyle(lineWidth: 1.8, lineCap: .round, lineJoin: .round)
            var path = Path()
            switch place {
            case .surface:
                path.move(to: p(6, 24)); path.addArc(center: p(16, 24), radius: 10 * k, startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false); path.closeSubpath()
                path.move(to: p(16, 14)); path.addLine(to: p(16, 10)); path.move(to: p(19, 11)); path.addLine(to: p(22, 7))
                path.move(to: p(4, 24)); path.addLine(to: p(28, 24)); path.move(to: p(12, 24)); path.addLines([p(12, 28), p(20, 28), p(20, 24)])
            case .orbit:
                path.addRoundedRect(in: CGRect(origin: p(12, 9), size: CGSize(width: 8 * k, height: 14 * k)), cornerSize: CGSize(width: 2 * k, height: 2 * k))
                path.move(to: p(12, 14)); path.addLines([p(4, 14), p(4, 19), p(12, 19)])
                path.move(to: p(20, 14)); path.addLines([p(28, 14), p(28, 19), p(20, 19)])
                path.move(to: p(16, 9)); path.addLine(to: p(16, 5))
            case .relay:
                path.move(to: p(16, 14)); path.addLine(to: p(16, 28)); path.move(to: p(11, 28)); path.addLine(to: p(21, 28))
                path.move(to: p(16, 14)); path.addLine(to: p(11, 22)); path.move(to: p(16, 14)); path.addLine(to: p(21, 22))
                path.addEllipse(in: CGRect(origin: p(14, 10), size: CGSize(width: 4 * k, height: 4 * k)))
                path.move(to: p(10, 7)); path.addQuadCurve(to: p(22, 7), control: p(16, 2))
                path.move(to: p(7, 4)); path.addQuadCurve(to: p(25, 4), control: p(16, -3))
            case .offworld:
                path.addEllipse(in: CGRect(origin: p(10, 10), size: CGSize(width: 12 * k, height: 12 * k)))
            }
            ctx.stroke(path, with: .foreground, style: style)
            if place == .offworld {
                var ring = ctx; ring.translateBy(x: 16 * k, y: 16 * k); ring.rotate(by: .degrees(-18))
                ring.stroke(Path(ellipseIn: CGRect(x: -13 * k, y: -4 * k, width: 26 * k, height: 8 * k)), with: .foreground, style: style)
            }
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
