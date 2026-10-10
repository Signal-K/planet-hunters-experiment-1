import SwiftUI
import LandnamCore

/// Transit Telescope classify screen (mirrors web TessDiscoveryScreen, SSL-497): drag across each
/// dip on the light curve, then Confirm Transit, Mark Noise or Skip. Sector chips and the SECTOR
/// command window the curve the same way the web does.
struct TessDiscoveryScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(FeedModel.self) private var feed
    /// Snapshot tests pass a candidate (and marks) so no network is touched.
    var candidate: TessCandidate?
    var inspect: String?
    @State private var ranges: [TransitRange] = []
    @State private var sector = 0
    @State private var dragArmed = true

    init(candidate: TessCandidate? = nil, inspect: String? = nil, marks: [TransitRange] = []) {
        self.candidate = candidate; self.inspect = inspect; _ranges = State(initialValue: marks)
    }

    private var today: TessCandidate? {
        candidate ?? Tess.today(candidates: feed.tess, player: store.player, dateKey: Saturn.dateKey(store.now), inspect: inspect)
    }

    var body: some View {
        Group {
            if candidate == nil && !store.player.freeOperations {
                gate("Free Operations Required", "TESS candidate downlinks unlock after the starter contract arc.")
            } else if candidate == nil && store.player.transitSatelliteLaunchedAt == nil {
                gate("Launch Transit Telescope", "Deploy your own telescope from the Launchpad. Its daily data will downlink here after the flight.",
                     action: ("OPEN LAUNCHPAD", { store.go(.launchpad) }))
            } else if let c = today {
                classify(c)
            } else if feed.tessPhase == .failed {
                gate("Live Feed Unavailable", "The shared TESS subject feed could not be reached.", action: ("RETRY DOWNLINK", { Task { await feed.loadTess(force: true) } }))
            } else if feed.tessPhase == .ready {
                gate("No Reviewable Anomaly", "Every live TESS transit subject is currently confirmed, rejected, or already resolved by consensus.")
            } else {
                gate("Acquiring Signal", "Pulling the day's unresolved TESS transit anomaly from the shared feed.")
            }
        }
        .task { if candidate == nil { await feed.loadTess() } }
    }

    private func gate(_ title: String, _ message: String, action: (String, () -> Void)? = nil) -> some View {
        InstrumentGate(screenTitle: "Transit Telescope", title: title, message: message, action: action.map { (title: $0.0, run: $0.1) })
    }

    private func classify(_ c: TessCandidate) -> some View {
        let saved = store.player.tessClassifications[c.id]
        let points = Tess.lightcurve(c)
        let sectors = Tess.sectorWindows(points, sectorText: c.sector)
        let window = sectors[min(sector, sectors.count - 1)]
        let marks = saved?.ranges ?? ranges
        let period = Tess.periodFromRanges(marks)
        let caption = ([window.label, "\(marks.count) MARK\(marks.count == 1 ? "" : "S")"] + (period.map { [String(format: "PERIOD %.2fd", $0)] } ?? [])).joined(separator: " · ")
        return InstrumentViewport(
            eyebrow: "Instrument data feed · Daily downlink", title: c.toi,
            status: saved == nil ? "Review" : "Saved", caption: caption,
            back: { store.go(.instrumentHub) },
            onCommand: { line, view in
                let parts = line.split(whereSeparator: \.isWhitespace).map(String.init)
                guard parts.first?.uppercased() == "SECTOR" else { return nil }
                guard parts.count > 1, let n = Int(parts[1]), n >= 1, n <= sectors.count else {
                    return Instrument.CommandResult(view: view, lines: ["> SECTOR  USE 1-\(max(1, sectors.count))"])
                }
                sector = n - 1
                return Instrument.CommandResult(view: view, lines: ["> SECTOR \(n)  OK"])
            },
            well: {
                LightCurveChart(points: window.points, domain: Self.domain(points), marks: marks, locked: saved != nil || !dragArmed) { r in
                    ranges.append(r)
                }
            },
            overlay: { EmptyView() },
            answers: {
                if saved != nil {
                    Panel(accent: Theme.teal) { Text("Annotation saved").font(AppFont.display(16)) }
                } else {
                    HStack(spacing: 10) {
                        InstrumentAnswerButton(title: "Confirm transit", enabled: !ranges.isEmpty, primary: true) { store.classifyTess(c.id, verdict: .planet, ranges: ranges, candidate: c) }
                        InstrumentAnswerButton(title: "Mark noise", enabled: !ranges.isEmpty) { store.classifyTess(c.id, verdict: .notPlanet, ranges: ranges, candidate: c) }
                        InstrumentAnswerButton(title: "Skip") { store.classifyTess(c.id, verdict: .unsure, ranges: ranges, candidate: c) }
                    }
                }
            },
            tool: { tools(sectors: sectors, saved: saved != nil) })
        .id(c.id)
    }

    @ViewBuilder private func tools(sectors: [SectorWindow], saved: Bool) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if !saved && sectors.count > 1 {
                chipRow {
                    HStack(spacing: 8) {
                        ForEach(Array(sectors.enumerated()), id: \.offset) { i, s in
                            chip(s.label, on: i == sector) { sector = i }
                        }
                    }
                }
            }
            if saved || store.player.pendingRepick { pointing }
            if !saved {
                InstrumentAnswerButton(title: ranges.isEmpty ? "Drag dip" : "Drag dip · \(ranges.count)", primary: dragArmed) { dragArmed.toggle() }
                if !ranges.isEmpty {
                    chipRow {
                        HStack(spacing: 8) {
                            ForEach(Array(ranges.enumerated()), id: \.offset) { i, r in
                                removeChip(i, r)
                            }
                        }
                    }
                }
            }
        }
    }

    /// Satellite pointing (web TARGET SELECT): the daily pick comes from the star you point at.
    private var pointing: some View {
        let pool = feed.tess.filter { store.player.tessClassifications[$0.id] == nil }
        let chosen = store.player.satelliteTargetId
        return Panel(accent: Theme.teal) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Eyebrow(text: "Point the satellite")
                    Spacer()
                    if store.player.pendingRepick { Text("RE-POINT NOW").font(AppFont.display(14)).tracking(1).foregroundStyle(Theme.crimson) }
                }
                Text(pool.isEmpty ? "No open candidates to point at yet." : "Tomorrow's downlink follows the star you pick. Candidates sit at stable positions, not real astrometry.")
                    .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                if !pool.isEmpty { StarMap(pool: pool, chosen: chosen) { store.chooseSatelliteTarget($0) } }
            }
        }
    }

    @Environment(\.flatLayout) private var flat
    @ViewBuilder private func chipRow<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        if flat { c() } else { ScrollView(.horizontal, showsIndicators: false) { c() } }
    }

    private func removeChip(_ i: Int, _ r: TransitRange) -> some View {
        chip("✕ " + String(format: "%.2f–%.2fd", r.x1, r.x2), on: false) { ranges.remove(at: i) }
            .accessibilityLabel("Remove mark \(i + 1)")
    }

    private func chip(_ title: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(AppFont.display(14)).tracking(1).padding(.horizontal, 14).frame(minHeight: 44)
                .foregroundStyle(on ? Color.white : Theme.ink)
                .background(on ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
        }.buttonStyle(.plain)
    }

    /// Flux range of the whole curve so switching sectors never rescales the chart.
    static func domain(_ points: [LightcurvePoint]) -> ClosedRange<Double> {
        let ys = points.map(\.y)
        guard let lo = ys.min(), let hi = ys.max(), hi > lo else { return 0.99...1.01 }
        let pad = (hi - lo) * 0.08
        return (lo - pad)...(hi + pad)
    }
}

/// Light curve with draggable transit marks. Marks live in light curve time, so zoom and pan from
/// the shared viewport never move them off their dip.
private struct LightCurveChart: View {
    let points: [LightcurvePoint]
    let domain: ClosedRange<Double>
    let marks: [TransitRange]
    let locked: Bool
    let onMark: (TransitRange) -> Void
    @State private var dragStart: CGFloat?
    @State private var dragNow: CGFloat?

    private var xs: ClosedRange<Double> {
        (points.first?.x ?? 0)...max((points.last?.x ?? 1), (points.first?.x ?? 0) + 0.001)
    }

    private func px(_ x: Double, _ w: CGFloat) -> CGFloat { CGFloat((x - xs.lowerBound) / (xs.upperBound - xs.lowerBound)) * w }
    private func tx(_ p: CGFloat, _ w: CGFloat) -> Double { xs.lowerBound + Double(min(max(p, 0), w) / w) * (xs.upperBound - xs.lowerBound) }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            Canvas { ctx, size in
                for m in marks {
                    let a = px(min(m.x1, m.x2), w), b = px(max(m.x1, m.x2), w)
                    let r = CGRect(x: a, y: 0, width: max(b - a, 2), height: size.height)
                    ctx.fill(Path(r), with: .color(Theme.blueBright.opacity(0.3)))
                    ctx.stroke(Path(r), with: .color(Theme.blueBright), lineWidth: 2)
                }
                if let s = dragStart, let n = dragNow {
                    let r = CGRect(x: min(s, n), y: 0, width: abs(n - s), height: size.height)
                    ctx.fill(Path(r), with: .color(Theme.paper.opacity(0.25)))
                }
                for p in points {
                    let y = size.height * CGFloat(1 - (p.y - domain.lowerBound) / (domain.upperBound - domain.lowerBound))
                    ctx.fill(Path(ellipseIn: CGRect(x: px(p.x, w) - 1.6, y: y - 1.6, width: 3.2, height: 3.2)), with: .color(Theme.paper.opacity(0.9)))
                }
            }
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 6)
                .onChanged { g in if !locked { dragStart = dragStart ?? g.startLocation.x; dragNow = g.location.x } }
                .onEnded { g in
                    defer { dragStart = nil; dragNow = nil }
                    guard !locked else { return }
                    let a = tx(g.startLocation.x, w), b = tx(g.location.x, w)
                    if abs(b - a) > (xs.upperBound - xs.lowerBound) * 0.004 { onMark(TransitRange(x1: min(a, b), x2: max(a, b))) }
                })
        }
        .accessibilityElement()
        .accessibilityLabel("Light curve, \(marks.count) dips marked. Drag across a dip to mark it.")
    }
}


/// Sky map of the open TESS candidates. Each star is a 44pt tap target over its deterministic sky position.
private struct StarMap: View {
    let pool: [TessCandidate]
    let chosen: String?
    let pick: (String) -> Void

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Theme.paper2
                ForEach(pool.prefix(24)) { c in
                    let p = Instruments.skyPosition(c.id), on = c.id == chosen
                    Button { pick(c.id) } label: {
                        ZStack {
                            Circle().fill(on ? Theme.teal : Theme.paper).frame(width: on ? 20 : 12, height: on ? 20 : 12)
                                .overlay(Circle().stroke(Theme.ink, lineWidth: 2))
                        }.frame(width: 44, height: 44).contentShape(Rectangle())
                    }.buttonStyle(.plain)
                    .position(x: 22 + (p.x + 1) / 2 * (geo.size.width - 44), y: 22 + (p.y + 1) / 2 * (geo.size.height - 44))
                    .accessibilityLabel("Point at \(c.toi)\(on ? ", pointed" : "")")
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .frame(height: 220)
        .clipShape(RoundedRectangle(cornerRadius: 10)).overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2.5))
    }
}
