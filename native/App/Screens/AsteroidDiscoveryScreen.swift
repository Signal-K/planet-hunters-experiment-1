import SwiftUI
import LandnamCore

/// Deep Space Telescope classify screen (mirrors web AsteroidDiscoveryScreen, STS-622 / SSL-497):
/// one NEOCP candidate a day plotted by RA/Dec; flag it likely real, an artifact, or skip.
struct AsteroidDiscoveryScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(FeedModel.self) private var feed
    /// Snapshot tests pass a candidate so no network is touched.
    var candidate: AsteroidCandidate?
    var inspect: String?

    private var today: AsteroidCandidate? {
        candidate ?? Asteroid.today(candidates: feed.asteroids, player: store.player, dateKey: Saturn.dateKey(store.now), inspect: inspect)
    }

    var body: some View {
        Group {
            if candidate == nil && !store.player.freeOperations {
                gate("Free Operations Required", "NEOCP candidate downlinks unlock after the starter contract arc.")
            } else if candidate == nil && !store.player.deepSpaceTelescopeBuilt {
                gate("Launch Deep Space Telescope", "Deploy the Deep Space Telescope from the Launchpad to start receiving NEOCP asteroid candidates.",
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
        InstrumentGate(screenTitle: "Deep Space Telescope", title: title, message: message, action: action.map { (title: $0.0, run: $0.1) })
    }

    private func classify(_ c: AsteroidCandidate) -> some View {
        let saved = store.player.asteroidClassifications[c.id]
        return InstrumentViewport(
            eyebrow: "Instrument data feed · Daily downlink", title: c.tempDesig,
            status: saved == nil ? "Review" : "Saved",
            caption: String(format: "RA %.4fh · DEC %.4f°", c.ra, c.decl),
            back: { store.go(.instrumentHub) },
            well: { SkyPlot(candidate: c) },
            overlay: { EmptyView() },
            answers: {
                if saved != nil {
                    Panel(accent: Theme.teal) { Text("Annotation saved").font(AppFont.display(16)) }
                } else {
                    HStack(spacing: 10) {
                        InstrumentAnswerButton(title: "Flag likely real", primary: true) { store.classifyAsteroid(c.id, verdict: .likelyReal) }
                        InstrumentAnswerButton(title: "Mark artifact") { store.classifyAsteroid(c.id, verdict: .likelyArtifact) }
                        InstrumentAnswerButton(title: "Skip") { store.classifyAsteroid(c.id, verdict: .unsure) }
                    }
                }
            },
            tool: { EmptyView() })
        .id(c.id)
    }
}

/// RA/Dec chart: every mark plots a field on the candidate. There is no invented orbit.
private struct SkyPlot: View {
    let candidate: AsteroidCandidate

    var body: some View {
        Canvas { ctx, size in
            for i in 0...4 {
                let f = CGFloat(i) / 4
                var v = Path(); v.move(to: CGPoint(x: f * size.width, y: 0)); v.addLine(to: CGPoint(x: f * size.width, y: size.height))
                var h = Path(); h.move(to: CGPoint(x: 0, y: f * size.height)); h.addLine(to: CGPoint(x: size.width, y: f * size.height))
                ctx.stroke(v, with: .color(Theme.paper.opacity(0.28)), lineWidth: 1)
                ctx.stroke(h, with: .color(Theme.paper.opacity(0.28)), lineWidth: 1)
            }
            let p = Asteroid.plot(candidate)
            let c = CGPoint(x: p.x * size.width, y: p.y * size.height)
            let dot = Path(ellipseIn: CGRect(x: c.x - 9, y: c.y - 9, width: 18, height: 18))
            ctx.fill(dot, with: .color(Theme.paper))
            ctx.stroke(dot, with: .color(Theme.blueBright), lineWidth: 3)
        }
        .accessibilityElement()
        .accessibilityLabel(String(format: "Sky position for %@: right ascension %.2f hours, declination %.2f degrees, V magnitude %.1f, arc %.2f days, last seen %.1f days ago",
                                   candidate.tempDesig, candidate.ra, candidate.decl, candidate.vMag, candidate.arcDays, candidate.lastSeenDays))
    }
}
