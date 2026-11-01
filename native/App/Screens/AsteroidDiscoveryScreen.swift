import SwiftUI
import LandnamCore

/// Space Telescope classify screen (mirrors web AsteroidDiscoveryScreen, STS-622 / SSL-497):
/// one NEOCP candidate a day plotted by RA/Dec; flag it likely real, an artifact, or skip.
struct AsteroidDiscoveryScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(FeedModel.self) private var feed
    /// Snapshot tests pass a candidate so no network is touched.
    var candidate: AsteroidCandidate?
    var inspect: String?
    /// SSL-745: astrometry module (web ASTROMETRY · AS-03).
    @State private var field = 1.0
    @State private var showGrid = true
    @State private var showEcliptic = true

    private var today: AsteroidCandidate? {
        candidate ?? Asteroid.today(candidates: feed.asteroids, player: store.player, dateKey: Saturn.dateKey(store.now), inspect: inspect)
    }

    var body: some View {
        Group {
            if candidate == nil && !store.player.freeOperations {
                gate("Free Operations Required", "NEOCP candidate downlinks unlock after the starter contract arc.")
            } else if candidate == nil && !store.player.deepSpaceTelescopeBuilt {
                gate("Launch Space Telescope", "Deploy the Space Telescope from the Launchpad to start receiving NEOCP asteroid candidates.",
                     action: ("OPEN LAUNCHPAD", { store.go(.launchpad) }))
            } else if let c = today {
                classify(c)
            } else if feed.asteroidPhase == .failed {
                gate("Live Feed Unavailable", "The shared NEOCP candidate feed could not be reached.", action: ("RETRY DOWNLINK", { Task { await feed.loadAsteroids(force: true) } }))
            } else if feed.asteroidPhase == .ready {
                gate("No Reviewable Candidate", "Every live NEOCP candidate is currently classified or has resolved off the feed.")
            } else {
                gate("Acquiring Signal", "Pulling the day's unresolved NEOCP candidate from the shared feed.")
            }
        }
        .task { if candidate == nil { await feed.loadAsteroids() } }
    }

    private func gate(_ title: String, _ message: String, action: (String, () -> Void)? = nil) -> some View {
        InstrumentGate(screenTitle: "Space Telescope", title: title, message: message, action: action.map { (title: $0.0, run: $0.1) })
    }

    private func classify(_ c: AsteroidCandidate) -> some View {
        let saved = store.player.asteroidClassifications[c.id]
        let beta = SkyPlot.eclipticLatitude(ra: c.ra, dec: c.decl)
        let fieldDeg = 180 / field
        return InstrumentViewport(
            eyebrow: "Instrument data feed · Daily downlink", title: c.tempDesig,
            status: saved == nil ? "Review" : "Saved",
            caption: String(format: "RA %.4fh · DEC %.4f°", c.ra, c.decl),
            back: { store.go(.instrumentHub) },
            onCommand: { line, view in
                let words = line.uppercased().split(whereSeparator: \.isWhitespace).map(String.init)
                switch words.first ?? "" {
                case "FIELD":
                    if let n = words.dropFirst().first.flatMap(Double.init) { field = min(SkyPlot.fieldMax, max(1, n)) }
                    return Instrument.CommandResult(view: view, lines: [String(format: "> FIELD  ×%.1f · %.0f°", field, 180 / field)])
                case "GRID":
                    showGrid.toggle(); return Instrument.CommandResult(view: view, lines: ["> GRID  \(showGrid ? "ON" : "OFF")"])
                case "ECLIPTIC":
                    showEcliptic.toggle(); return Instrument.CommandResult(view: view, lines: [String(format: "> ECLIPTIC  %@ · LAT %+.1f°", showEcliptic ? "ON" : "OFF", beta)])
                default: return nil
                }
            },
            well: { SkyPlot(candidate: c, field: field, showGrid: showGrid, showEcliptic: showEcliptic) },
            overlay: { EmptyView() },
            answers: {
                if saved != nil {
                    Panel(accent: Theme.teal) { Text("Classification submitted").font(AppFont.display(16)) }
                } else {
                    HStack(spacing: 10) {
                        InstrumentAnswerButton(title: "Flag likely real", primary: true) { store.classifyAsteroid(c.id, verdict: .likelyReal) }
                        InstrumentAnswerButton(title: "Mark artifact") { store.classifyAsteroid(c.id, verdict: .likelyArtifact) }
                        InstrumentAnswerButton(title: "Skip") { store.classifyAsteroid(c.id, verdict: .unsure) }
                    }
                }
            },
            tool: { EmptyView() },
            // iOS has no deep-space telescope level yet; web reads deepSpaceTelescopeLevel.
            instrumentId: "deep-space-telescope", level: 1,
            module: InstrumentModule(name: "ASTROMETRY · AS-03", lights: [("NEAR ECL", abs(beta) < 10, true)], content: AnyView(
                HStack(alignment: .top, spacing: 8) {
                    Knob(label: "FIELD", readout: fieldDeg < 20 ? String(format: "%.1f°", fieldDeg) : String(format: "%.0f°", fieldDeg),
                         value: field, range: 1...SkyPlot.fieldMax) { field = $0 }
                    ModuleKey(label: "ECL LAT", readout: String(format: "%+.1f°", beta), pressed: field > 1) { field = field > 1 ? 1 : 6 }
                    VStack(spacing: 4) {
                        LeverSwitch(label: "GRID", on: showGrid) { showGrid.toggle() }
                        LeverSwitch(label: "ECLIPTIC", on: showEcliptic) { showEcliptic.toggle() }
                    }
                })))
        .id(c.id)
        .onChange(of: c.id) { field = 1 }
    }
}

/// RA/Dec chart: every mark plots a field on the candidate or real sky geometry (the ecliptic).
/// There is no invented orbit. FIELD narrows the chart around the object (web AsteroidSkyPlot, SSL-745).
private struct SkyPlot: View {
    let candidate: AsteroidCandidate
    var field = 1.0
    var showGrid = true
    var showEcliptic = true

    static let fieldMax = 12.0
    private static let obliquity = 23.44 * Double.pi / 180

    /// Ecliptic latitude in degrees: how far off the planets' plane the object sits.
    static func eclipticLatitude(ra: Double, dec: Double) -> Double {
        let a = ra / 24 * 2 * .pi, d = dec * .pi / 180
        let s = sin(d) * cos(obliquity) - cos(d) * sin(obliquity) * sin(a)
        return asin(min(1, max(-1, s))) * 180 / .pi
    }

    var body: some View {
        Canvas { ctx, size in
            let f = min(Self.fieldMax, max(1, field))
            let p = Asteroid.plot(candidate)
            // View window in plot units (0...1), centred on the object and kept inside the chart.
            let vw = 1 / f
            let vx = f == 1 ? 0 : min(1 - vw, max(0, p.x - vw / 2))
            let vy = f == 1 ? 0 : min(1 - vw, max(0, p.y - vw / 2))
            func pt(_ u: Double, _ v: Double) -> CGPoint { CGPoint(x: (u - vx) / vw * size.width, y: (v - vy) / vw * size.height) }
            let raStep = f >= 6 ? 0.5 : f >= 3 ? 1 : f >= 1.5 ? 3 : 6
            let decStep = f >= 6 ? 5.0 : f >= 3 ? 10 : f >= 1.5 ? 15 : 45
            let labelY = size.height - 84
            if showGrid {
                for h in stride(from: 0.0, through: 24, by: raStep) {
                    let a = pt(h / 24, 0), b = pt(h / 24, 1)
                    var l = Path(); l.move(to: a); l.addLine(to: b)
                    ctx.stroke(l, with: .color(Theme.paper.opacity(h.truncatingRemainder(dividingBy: 6) == 0 ? 0.32 : 0.18)), lineWidth: 1)
                    if a.x > 30 && a.x < size.width - 20 {
                        let text = h == h.rounded() ? "\(Int(h))h" : "\(Int(h))h30"
                        ctx.draw(Text(text).font(AppFont.mono(14)).foregroundColor(Theme.paper.opacity(0.75)), at: CGPoint(x: a.x, y: labelY))
                    }
                }
                for d in stride(from: 90.0, through: -90, by: -decStep) {
                    let v = (90 - d) / 180
                    let a = pt(0, v), b = pt(1, v)
                    var l = Path(); l.move(to: a); l.addLine(to: b)
                    ctx.stroke(l, with: .color(Theme.paper.opacity(d == 0 ? 0.4 : 0.2)), lineWidth: 1)
                    if a.y > 24 && abs(a.y - labelY) > 20 && a.y < size.height - 20 {
                        ctx.draw(Text(d > 0 ? "+\(Int(d))°" : "\(Int(d))°").font(AppFont.mono(14)).foregroundColor(Theme.paper.opacity(0.75)), at: CGPoint(x: 28, y: a.y))
                    }
                }
            }
            if showEcliptic {
                var e = Path()
                for i in 0...192 {
                    let ra = Double(i) / 192 * 24
                    let dec = asin(sin(Self.obliquity) * sin(ra / 24 * 2 * .pi)) * 180 / .pi
                    let q = pt(ra / 24, (90 - dec) / 180)
                    if i == 0 { e.move(to: q) } else { e.addLine(to: q) }
                }
                ctx.stroke(e, with: .color(ConsoleHW.amber.opacity(0.8)), style: StrokeStyle(lineWidth: 2, dash: [8, 6]))
            }
            let c = pt(p.x, p.y)
            let dot = Path(ellipseIn: CGRect(x: c.x - 9, y: c.y - 9, width: 18, height: 18))
            ctx.fill(dot, with: .color(Theme.paper))
            ctx.stroke(dot, with: .color(Theme.blueBright), lineWidth: 3)
            ctx.stroke(Path(ellipseIn: CGRect(x: c.x - 22, y: c.y - 22, width: 44, height: 44)), with: .color(Theme.blueBright.opacity(0.8)), style: StrokeStyle(lineWidth: 1.5, dash: [4, 4]))
        }
        .accessibilityElement()
        .accessibilityLabel(String(format: "Sky position for %@: right ascension %.2f hours, declination %.2f degrees, V magnitude %.1f, arc %.2f days, last seen %.1f days ago",
                                   candidate.tempDesig, candidate.ra, candidate.decl, candidate.vMag, candidate.arcDays, candidate.lastSeenDays))
    }
}
