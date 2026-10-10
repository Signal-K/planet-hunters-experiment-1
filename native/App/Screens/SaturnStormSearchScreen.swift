import SwiftUI
import LandnamCore

/// Saturn imager classify screen (mirrors web SaturnStormSearchScreen, SSL-492): one Cassini
/// frame a day under a 3x3 grid; pick a square, answer Yes / No / Maybe, optionally mark a storm.
struct SaturnStormSearchScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(FeedModel.self) private var feed
    /// Snapshot tests pass a candidate so no network is touched.
    var candidate: SaturnCandidate?
    @State private var selected = 2
    @State private var storms: Set<Int> = []
    @State private var answers: [Int: SaturnVerdict] = [:]

    private var frame: SaturnCandidate? { candidate ?? Saturn.today(candidates: feed.saturn, player: store.player, nowMs: store.now) }

    var body: some View { content.task { if candidate == nil { await feed.loadSaturn() } } }

    @ViewBuilder private var content: some View {
        if !store.player.freeOperations {
            gate("Free Operations Required", "Saturn imager downlinks unlock after the starter contract arc.", action: nil)
        } else if store.player.saturnImagerLaunchedAt == nil {
            gate("Launch Saturn Imager", "Deploy the Saturn imager from the Launchpad to start receiving Cassini frames.", action: ("OPEN LAUNCHPAD", { store.go(.launchpad) }))
        } else if let frame {
            classify(frame)
        }
    }

    private func classify(_ c: SaturnCandidate) -> some View {
        let saved = store.player.saturnClassifications[c.id]
        return InstrumentViewport(
            eyebrow: "Instrument data feed · Saturn downlink", title: c.opusId.uppercased(),
            status: saved == nil ? "Review" : "Saved", caption: Saturn.question,
            back: { store.go(.instrumentHub) },
            well: { frameImage(c) },
            overlay: { grid(locked: saved != nil) },
            answers: {
                if let saved {
                    Panel(accent: Theme.teal) { Text("Annotation saved: \(saved.verdict.rawValue.capitalized)").font(AppFont.display(16)) }
                } else {
                    HStack(spacing: 10) {
                        ForEach(SaturnVerdict.allCases, id: \.self) { v in
                            InstrumentAnswerButton(title: v.rawValue) { answers[selected] = v; store.classifySaturn(c.id, verdict: v) }
                        }
                    }
                }
            },
            tool: {
                InstrumentAnswerButton(title: storms.contains(selected) ? "Unmark storm" : "Mark storm", enabled: saved == nil) {
                    if storms.contains(selected) { storms.remove(selected) } else { storms.insert(selected) }
                }
            })
        .id(c.id)
    }

    @ViewBuilder private func frameImage(_ c: SaturnCandidate) -> some View {
        AsyncImage(url: c.imageURL) { phase in
            switch phase {
            case .success(let image): image.resizable().scaledToFill()
            default:
                LinearGradient(colors: [Theme.ink, Theme.blue.opacity(0.7), Theme.ink], startPoint: .topLeading, endPoint: .bottomTrailing)
            }
        }
        .accessibilityLabel("Cassini frame \(c.opusId)")
    }

    private func grid(locked: Bool) -> some View {
        GeometryReader { geo in
            let w = geo.size.width / 3, h = geo.size.height / 3
            ForEach(0..<Saturn.gridCells, id: \.self) { i in
                let r = CGFloat(i / 3), col = CGFloat(i % 3)
                Button { selected = i } label: { // tap-floor-ignore: the 26pt ring is a marker inside a full grid cell
                    ZStack {
                        Rectangle().stroke(.white.opacity(0.55), lineWidth: 1)
                        if selected == i { Rectangle().stroke(Theme.blueBright, lineWidth: 4) }
                        if let a = answers[i] { Text(String(a.rawValue.prefix(1)).uppercased()).font(AppFont.display(16)).foregroundStyle(.white).padding(4).background(Theme.blue, in: Circle()).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading) }
                        if storms.contains(i) { Circle().stroke(Theme.blueBright, lineWidth: 3).frame(width: 26, height: 26) }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain).disabled(locked)
                .frame(width: w, height: h).position(x: col * w + w / 2, y: r * h + h / 2)
                .accessibilityLabel("Square \(i + 1)\(storms.contains(i) ? ", storm marked" : "")")
            }
        }
    }

    private func gate(_ title: String, _ body: String, action: (String, () -> Void)?) -> some View {
        ScreenFrame(title: "Saturn Imager", back: { store.go(.instrumentHub) }) {
            Panel {
                VStack(alignment: .leading, spacing: 10) {
                    Text(title).font(AppFont.display(16))
                    Text(body).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    if let action { PrimaryButton(title: action.0, action: action.1) }
                }
            }
        }
    }
}
