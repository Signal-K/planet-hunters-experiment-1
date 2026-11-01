import SwiftUI
import LandnamCore

/// Space Telescope classify screen (mirrors web TessDiscoveryScreen, SSL-497): drag across each
/// dip on the light curve, then submit the classification: Transit, Noise or Skip. Sector chips and the SECTOR
/// command window the curve the same way the web does.
struct TessDiscoveryScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(FeedModel.self) private var feed
    /// Snapshot tests pass a candidate (and marks) so no network is touched.
    var candidate: TessCandidate?
    var inspect: String?
    @State private var ranges: [TransitRange] = []
    @State private var needsMark = false
    @State private var sector = 0
    @State private var dragArmed = true
    /// SSL-745: photometry module (web lib/instrument-viewport/lightcurve-controls.ts).
    @State private var lc = LightcurveControls()

    init(candidate: TessCandidate? = nil, inspect: String? = nil, marks: [TransitRange] = []) {
        self.candidate = candidate; self.inspect = inspect; _ranges = State(initialValue: marks)
    }

    /// Scan training try: the first classification is a local training subject, no telescope or Free Ops needed.
    private var training: Bool {
        candidate == nil && !store.player.freeOperations
            && (store.player.flightPlan.currentTry == "scan" || store.player.tessClassifications[Tess.trainingCandidate.id] != nil)
    }

    private var today: TessCandidate? {
        if training { return store.player.tessClassifications[Tess.trainingCandidate.id] == nil ? Tess.trainingCandidate : nil }
        return candidate ?? Tess.today(candidates: feed.tess, player: store.player, dateKey: Saturn.dateKey(store.now), inspect: inspect)
    }

    var body: some View {
        Group {
            if candidate == nil && !training && !store.player.freeOperations {
                gate("Free Operations Required", "TESS candidate downlinks unlock after the starter contract arc.")
            } else if candidate == nil && !training && store.player.transitSatelliteLaunchedAt == nil {
                gate("Launch Space Telescope", "Deploy your own telescope from the Launchpad. Its daily data will downlink here after the flight.",
                     action: ("OPEN LAUNCHPAD", { store.go(.launchpad) }))
            } else if let c = today {
                classify(c)
            } else if training {
                gate("Transit Logged", "Your classification is recorded. The scan try is complete.", action: ("BACK TO BASE", { store.go(.hub) }))
            } else if feed.tessPhase == .failed {
                gate("Live Feed Unavailable", "The shared TESS subject feed could not be reached.", action: ("RETRY DOWNLINK", { Task { await feed.loadTess(force: true) } }))
            } else if feed.tessPhase == .ready {
                gate("No Reviewable Anomaly", "Every live TESS transit subject is currently confirmed, rejected, or already resolved by consensus.")
            } else {
                gate("Acquiring Signal", "Pulling the day's unresolved TESS transit anomaly from the shared feed.")
            }
        }
        .task { if candidate == nil && !training { await feed.loadTess() } }
        .onChange(of: today?.id) { lc = LightcurveControls() }
    }

    private func gate(_ title: String, _ message: String, action: (String, () -> Void)? = nil) -> some View {
        InstrumentGate(screenTitle: "Space Telescope", title: title, message: message, action: action.map { (title: $0.0, run: $0.1) })
    }

    private func classify(_ c: TessCandidate) -> some View {
        let saved = store.player.tessClassifications[c.id]
        let points = Tess.lightcurve(c)
        let sectors = Tess.sectorWindows(points, sectorText: c.sector)
        let window = sectors[min(sector, sectors.count - 1)]
        let marks = saved?.ranges ?? ranges
        let period = Tess.periodFromRanges(marks)
        let prompt = saved == nil && marks.isEmpty ? (needsMark ? "DRAG ACROSS THE DIP FIRST" : "DRAG ACROSS THE DIP") : nil
        let epoch = marks.first.map { ($0.x1 + $0.x2) / 2 } ?? (points.first?.x ?? 0)
        let display = LightcurveControls.display(sector: window.points, all: points, lc, epoch: epoch)
        let caption = display.folded ? String(format: "FOLDED · P %.2fD · FOLD OFF TO MARK", lc.period) : prompt ?? ([window.label, "\(marks.count) MARK\(marks.count == 1 ? "" : "S")"] + (period.map { [String(format: "PERIOD %.2fd", $0)] } ?? [])).joined(separator: " · ")
        return InstrumentViewport(
            eyebrow: "Instrument data feed · Daily downlink", title: c.toi,
            status: saved == nil ? "Review" : "Saved", caption: caption,
            back: { store.go(.instrumentHub) },
            onCommand: { line, view in
                if let r = LightcurveControls.apply(lc, line, measured: period) { lc = r.controls; return Instrument.CommandResult(view: view, lines: r.lines) }
                let parts = line.split(whereSeparator: \.isWhitespace).map(String.init)
                guard parts.first?.uppercased() == "SECTOR" else { return nil }
                guard parts.count > 1, let n = Int(parts[1]), n >= 1, n <= sectors.count else {
                    return Instrument.CommandResult(view: view, lines: ["> SECTOR  USE 1-\(max(1, sectors.count))"])
                }
                sector = n - 1
                return Instrument.CommandResult(view: view, lines: ["> SECTOR \(n)  OK"])
            },
            well: {
                LightCurveChart(points: display.points, domain: Self.domain(points), xs: display.xDomain, folded: display.folded,
                                marks: display.folded ? [] : marks, locked: saved != nil || !dragArmed || display.folded) { r in
                    ranges.append(r); needsMark = false
                }
            },
            overlay: { EmptyView() },
            answers: {
                if saved != nil {
                    Panel(accent: Theme.teal) { Text("Classification submitted").font(AppFont.display(16)) }
                } else {
                    HStack(spacing: 10) {
                        InstrumentAnswerButton(title: "Submit · Transit", primary: true, dim: ranges.isEmpty) { verdict(.planet, c) }
                        InstrumentAnswerButton(title: "Submit · Noise", dim: ranges.isEmpty) { verdict(.notPlanet, c) }
                        InstrumentAnswerButton(title: "Skip") { store.classifyTess(c.id, verdict: .unsure, ranges: ranges, candidate: c) }
                    }
                }
            },
            tool: { tools(sectors: sectors, saved: saved != nil) },
            instrumentId: "transit-telescope", level: store.player.transitSatelliteLevel ?? 1,
            module: photometry(display: display, measured: period))
        .id(c.id)
    }

    /// TIME / SCAN / PERIOD knobs, BIN and SNAP keys, FOLD lever (web PHOTOMETRY · TP-02).
    private func photometry(display: LightcurveDisplay, measured: Double?) -> InstrumentModule {
        let L = LightcurveControls.self
        return InstrumentModule(name: "PHOTOMETRY · TP-02", lights: [("FOLD", lc.fold, false), ("BIN", lc.bin > 1, true)], content: AnyView(
            VStack(spacing: 10) {
                HStack(spacing: 8) {
                    Knob(label: "TIME", readout: display.folded ? "—" : String(format: "%.1fd", display.xDomain.upperBound - display.xDomain.lowerBound),
                         value: lc.span, range: L.spanMin...L.spanMax) { lc.span = $0; lc.fold = false }
                    Knob(label: "SCAN", readout: display.folded ? "—" : String(format: "D%.1f", display.xDomain.lowerBound),
                         value: lc.scan, range: 0...1) { lc.scan = $0; lc.fold = false }
                    Knob(label: "PERIOD", readout: String(format: "%.2fd", lc.period), value: lc.period, range: L.periodMin...L.periodMax) { lc.period = $0; lc.fold = true }
                }
                HStack(spacing: 10) {
                    ModuleKey(label: "BIN", readout: "×\(lc.bin)", pressed: lc.bin > 1) { lc.bin = L.nextBin(lc.bin) }
                    ModuleKey(label: "SNAP", readout: measured.map { String(format: "P %.2fd", $0) } ?? "2 MARKS", enabled: measured != nil) {
                        if let m = measured { lc.fold = true; lc.period = min(L.periodMax, max(L.periodMin, m)) }
                    }
                    LeverSwitch(label: "FOLD", on: lc.fold) { lc.fold.toggle() }
                }
            }))
    }

    /// A verdict that needs a marked dip explains itself instead of sitting dead.
    private func verdict(_ v: TessVerdict, _ c: TessCandidate) {
        if v != .unsure && ranges.isEmpty { needsMark = true; return }
        store.classifyTess(c.id, verdict: v, ranges: ranges, candidate: c)
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
    /// Plotted window (TIME / SCAN), or days from T0 when folded.
    let xs: ClosedRange<Double>
    var folded = false
    let marks: [TransitRange]
    let locked: Bool
    let onMark: (TransitRange) -> Void
    @State private var dragStart: CGFloat?
    @State private var dragNow: CGFloat?

    private func px(_ x: Double, _ w: CGFloat) -> CGFloat { CGFloat((x - xs.lowerBound) / (xs.upperBound - xs.lowerBound)) * w }
    private func tx(_ p: CGFloat, _ w: CGFloat) -> Double { xs.lowerBound + Double(min(max(p, 0), w) / w) * (xs.upperBound - xs.lowerBound) }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            Canvas { ctx, size in
                if folded {
                    var t0 = Path(); t0.move(to: CGPoint(x: px(0, w), y: 0)); t0.addLine(to: CGPoint(x: px(0, w), y: size.height))
                    ctx.stroke(t0, with: .color(Theme.blueBright.opacity(0.7)), style: StrokeStyle(lineWidth: 1.5, dash: [4, 4]))
                }
                for m in marks {
                    // Clipped to the window: with TIME zoomed in a mark can sit partly off it.
                    let a = max(0, px(min(m.x1, m.x2), w)), b = min(w, px(max(m.x1, m.x2), w))
                    guard b > a else { continue }
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


/// Photometry controls (web lib/instrument-viewport/lightcurve-controls.ts): TIME narrows the
/// plotted window, SCAN slides it, BIN averages neighbours, FOLD stacks the curve on a trial PERIOD.
struct LightcurveControls: Equatable {
    var span = 1.0
    var scan = 0.5
    var bin = 1
    var fold = false
    var period = 3.0

    static let spanMin = 1.0, spanMax = 8.0, periodMin = 0.3, periodMax = 14.0
    static let bins = [1, 2, 4, 8]

    static func nextBin(_ b: Int) -> Int { bins[((bins.firstIndex(of: b) ?? 0) + 1) % bins.count] }

    static func binned(_ pts: [LightcurvePoint], _ n: Int) -> [LightcurvePoint] {
        guard n > 1 else { return pts }
        return stride(from: 0, to: pts.count, by: n).map { i in
            let g = pts[i..<min(i + n, pts.count)]
            return LightcurvePoint(x: g.map(\.x).reduce(0, +) / Double(g.count), y: g.map(\.y).reduce(0, +) / Double(g.count))
        }
    }

    static func window(_ pts: [LightcurvePoint], span: Double, scan: Double) -> ClosedRange<Double> {
        guard let lo = pts.first?.x, let hi = pts.last?.x, hi > lo else { return 0...1 }
        let width = (hi - lo) / min(spanMax, max(spanMin, span))
        let start = lo + min(1, max(0, scan)) * ((hi - lo) - width)
        return start...(start + width)
    }

    static func folded(_ pts: [LightcurvePoint], period: Double, epoch: Double) -> [LightcurvePoint] {
        guard period > 0 else { return pts }
        return pts.map { p in
            var phase = ((p.x - epoch) / period).truncatingRemainder(dividingBy: 1)
            phase = (phase + 1.5).truncatingRemainder(dividingBy: 1) - 0.5
            return LightcurvePoint(x: phase * period, y: p.y)
        }.sorted { $0.x < $1.x }
    }

    static func display(sector: [LightcurvePoint], all: [LightcurvePoint], _ c: LightcurveControls, epoch: Double) -> LightcurveDisplay {
        if c.fold {
            return LightcurveDisplay(points: binned(folded(all, period: c.period, epoch: epoch), c.bin), xDomain: (-c.period / 2)...(c.period / 2), folded: true)
        }
        let w = window(sector, span: c.span, scan: c.scan)
        return LightcurveDisplay(points: binned(sector.filter { w.contains($0.x) }, c.bin), xDomain: w, folded: false)
    }

    /// FOLD [days|OFF], PERIOD days, SNAP, TIME n, SCAN 0-100, BIN n. nil falls through to the shared optics verbs.
    static func apply(_ c: LightcurveControls, _ line: String, measured: Double?) -> (controls: LightcurveControls, lines: [String])? {
        let words = line.uppercased().split(whereSeparator: \.isWhitespace).map(String.init)
        guard let verb = words.first else { return nil }
        let arg = words.dropFirst().first
        let n = arg.flatMap(Double.init)
        var next = c
        func clampP(_ v: Double) -> Double { min(periodMax, max(periodMin, v)) }
        switch verb {
        case "FOLD":
            if arg == "OFF" { next.fold = false; return (next, ["> FOLD  OFF"]) }
            if let n { next.fold = true; next.period = clampP(n); return (next, [String(format: "> FOLD  P %.2fD", next.period)]) }
            next.fold.toggle(); return (next, [next.fold ? String(format: "> FOLD  P %.2fD", next.period) : "> FOLD  OFF"])
        case "PERIOD":
            if let n { next.period = clampP(n) }
            return (next, [String(format: "> PERIOD  %.2fD", next.period)])
        case "SNAP":
            guard let measured else { return (c, ["> SNAP  MARK TWO DIPS FIRST"]) }
            next.fold = true; next.period = clampP(measured)
            return (next, [String(format: "> SNAP  FOLD ON P %.2fD", measured)])
        case "TIME":
            if let n { next.span = min(spanMax, max(spanMin, n)) }
            return (next, [String(format: "> TIME  %.1f×", next.span)])
        case "SCAN":
            if let n { next.scan = min(1, max(0, n / 100)) }
            return (next, ["> SCAN  \(Int((next.scan * 100).rounded()))%"])
        case "BIN":
            if let n { next.bin = bins.min(by: { abs(Double($0) - n) < abs(Double($1) - n) }) ?? 1 }
            return (next, ["> BIN  ×\(next.bin)"])
        default:
            return nil
        }
    }
}

struct LightcurveDisplay {
    let points: [LightcurvePoint]
    let xDomain: ClosedRange<Double>
    let folded: Bool
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
