import SwiftUI
import LandnamCore

/// Shared instrument console for every citizen-science classify task (mirrors web
/// InstrumentViewport, SSL-497). A project supplies the image, an answer row and an
/// optional tool; aim, zoom, focus, exposure, stretch and invert all write one
/// `InstrumentView`, whether the player drags a knob or types the matching command.
struct InstrumentViewport<Well: View, Overlay: View, Answers: View, Tool: View>: View {
    let eyebrow: String
    let title: String
    let status: String
    var caption: String?
    var back: () -> Void
    var onCommand: ((String, InstrumentView) -> Instrument.CommandResult?)?
    @ViewBuilder var well: Well
    /// Sits above the transformed image and moves with it (Saturn's 3x3 grid).
    @ViewBuilder var overlay: Overlay
    @ViewBuilder var answers: Answers
    @ViewBuilder var tool: Tool

    @Environment(\.flatLayout) private var flat
    @State private var view = InstrumentView()
    @State private var log: [String] = ["> DOWNLINK RECEIVED"]
    @State private var line = ""
    var initialView = InstrumentView()

    var body: some View {
        scroller {
            VStack(alignment: .leading, spacing: 12) {
                header
                stage
                controls
                command
                answers
                tool
            }
            .padding(16).frame(maxWidth: 560).frame(maxWidth: .infinity)
        }
        .background(Theme.bg.ignoresSafeArea())
        .foregroundStyle(Theme.ink)
        .onAppear { view = initialView }
    }

    @ViewBuilder private func scroller<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        if flat { c().frame(maxHeight: .infinity, alignment: .top) } else { ScrollView { c() } }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            Button(action: back) {
                Image(systemName: "chevron.left").font(.system(size: 18, weight: .bold))
                    .frame(width: 44, height: 44)
                    .background(Theme.paper, in: Circle()).overlay(Circle().stroke(Theme.border, lineWidth: 2))
            }.buttonStyle(.plain).accessibilityLabel("Back to Control Station")
            VStack(alignment: .leading, spacing: 2) {
                Eyebrow(text: eyebrow).lineLimit(2)
                Text(title).font(AppFont.display(23)).lineLimit(1).minimumScaleFactor(0.7)
            }
            Spacer(minLength: 0)
            Text(status.uppercased()).font(AppFont.display(14)).tracking(1.2)
                .padding(.horizontal, 10).frame(minHeight: 44)
                .background(Theme.paper2, in: Capsule()).overlay(Capsule().stroke(Theme.border, lineWidth: 1.5))
        }
    }

    private var stage: some View {
        let o = Instrument.optics(view)
        return ZStack {
            Theme.ink
            GeometryReader { geo in
                ZStack {
                    well.frame(width: geo.size.width, height: geo.size.height)
                    overlay.frame(width: geo.size.width, height: geo.size.height)
                }
                .scaleEffect(x: o.zoom * o.stretch, y: o.zoom)
                .offset(x: -o.panX * geo.size.width * (o.zoom - 1) * 0.5 * 2, y: -o.panY * geo.size.height * (o.zoom - 1) * 0.5 * 2)
                .blur(radius: o.blur)
                .contrast(o.exposure)
                .modifier(InvertIf(on: o.invert))
                .frame(width: geo.size.width, height: geo.size.height)
                .clipped()
            }
            Image(systemName: "scope").font(.system(size: 54, weight: .ultraLight)).foregroundStyle(.white.opacity(0.8)).allowsHitTesting(false)
            if let caption {
                VStack { Spacer(); Text(caption).font(AppFont.body(14, "SemiBold")).foregroundStyle(Theme.ink)
                    .padding(8).frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.paper, in: RoundedRectangle(cornerRadius: 6)).padding(8) }
            }
        }
        .frame(maxWidth: .infinity)
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.ink, lineWidth: 3))
        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.blueBright).offset(x: 4, y: 4))
        .padding(.trailing, 4).padding(.bottom, 4)
    }

    private var controls: some View {
        Panel(accent: Theme.blueBright) {
            VStack(spacing: 12) {
                HStack(alignment: .top, spacing: 14) {
                    aimPad
                    Knob(label: "ZOOM", value: view.zoom, range: InstrumentLimits.zoomMin...InstrumentLimits.zoomMax) { view = Instrument.zoomed(view, to: $0) }
                    Knob(label: "FOCUS", value: view.focus, range: 0...1) { view = Instrument.focused(view, to: $0) }
                    Knob(label: "EXPOSE", value: view.exposure, range: InstrumentLimits.exposureMin...InstrumentLimits.exposureMax) { view = Instrument.exposed(view, to: $0) }
                }
                HStack(spacing: 10) {
                    SwitchChip(label: "STRETCH", on: view.stretch) { view.stretch.toggle() }
                    SwitchChip(label: "INVERT", on: view.invert) { view.invert.toggle() }
                }
            }
        }
    }

    private var aimPad: some View {
        VStack(spacing: 2) {
            pad("chevron.up", .north)
            HStack(spacing: 2) { pad("chevron.left", .west); pad("circle.fill", .reset); pad("chevron.right", .east) }
            pad("chevron.down", .south)
            Text("AIM").font(AppFont.display(14)).tracking(1.2)
        }
    }

    private func pad(_ symbol: String, _ d: AimDirection) -> some View {
        Button { view = Instrument.nudge(view, d) } label: {
            Image(systemName: symbol).font(.system(size: 14, weight: .bold)).frame(width: 44, height: 44)
                .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
        }.buttonStyle(.plain).accessibilityLabel("Aim \(String(describing: d))")
    }

    private var command: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(log.suffix(3).enumerated()), id: \.offset) { _, l in
                Text(l).font(AppFont.mono(14)).foregroundStyle(Theme.textDim).lineLimit(1)
            }
            HStack(spacing: 8) {
                Text(">").font(AppFont.mono(14))
                TextField("POINT, ZOOM, EXPOSE, HELP", text: $line)
                    .font(AppFont.mono(14)).textFieldStyle(.plain).autocorrectionDisabled()
                    #if os(iOS)
                    .textInputAutocapitalization(.characters)
                    #endif
                    .frame(minHeight: 44).onSubmit(run)
            }
        }
        .padding(10)
        .background(Theme.paper2, in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2))
    }

    private func run() {
        let text = line; line = ""
        guard let r = onCommand?(text, view) ?? Instrument.apply(view, text) else {
            log.append("> \(text.uppercased())  UNKNOWN"); return
        }
        view = r.view; log.append(contentsOf: r.lines)
        log = Array(log.suffix(8))
    }
}

private struct InvertIf: ViewModifier {
    let on: Bool
    func body(content: Content) -> some View { if on { content.colorInvert() } else { content } }
}

/// Round dial: drag up/down to turn, or use VoiceOver adjust. 44pt hit area.
private struct Knob: View {
    let label: String
    let value: Double
    let range: ClosedRange<Double>
    let set: (Double) -> Void
    @State private var start: Double?

    var body: some View {
        let t = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
        VStack(spacing: 4) {
            ZStack {
                Circle().fill(Theme.paper2).overlay(Circle().stroke(Theme.ink, lineWidth: 2))
                Capsule().fill(Theme.blue).frame(width: 4, height: 16).offset(y: -12)
                    .rotationEffect(.degrees(-135 + t * 270))
            }
            .frame(width: 48, height: 48).frame(minWidth: 44, minHeight: 44)
            .gesture(DragGesture(minimumDistance: 2).onChanged { g in
                let s = start ?? value; start = s
                let span = range.upperBound - range.lowerBound
                set(min(range.upperBound, max(range.lowerBound, s - Double(g.translation.height) / 120 * span)))
            }.onEnded { _ in start = nil })
            Text(label).font(AppFont.display(14)).tracking(0.6).lineLimit(1).minimumScaleFactor(0.8)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label.capitalized)
        .accessibilityValue(String(format: "%.2f", value))
        .accessibilityAdjustableAction { dir in
            let step = (range.upperBound - range.lowerBound) / 10
            set(min(range.upperBound, max(range.lowerBound, value + (dir == .increment ? step : -step))))
        }
    }
}

private struct SwitchChip: View {
    let label: String
    let on: Bool
    let toggle: () -> Void
    var body: some View {
        Button(action: toggle) {
            HStack(spacing: 8) {
                Image(systemName: on ? "checkmark.square.fill" : "square").font(.system(size: 18))
                Text(label).font(AppFont.display(14)).tracking(1.2)
            }
            .foregroundStyle(on ? Color.white : Theme.ink)
            .padding(.horizontal, 14).frame(maxWidth: .infinity, minHeight: 44)
            .background(on ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
        }.buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
    }
}

/// Answer row button shared by every project.
struct InstrumentAnswerButton: View {
    let title: String
    var enabled = true
    var primary = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title.uppercased()).font(AppFont.display(14)).tracking(1.2).multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 44).padding(.horizontal, 6)
                .foregroundStyle(primary ? Color.white : Theme.ink)
                .background(primary ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                .opacity(enabled ? 1 : 0.4)
        }.buttonStyle(.plain).disabled(!enabled)
    }
}
