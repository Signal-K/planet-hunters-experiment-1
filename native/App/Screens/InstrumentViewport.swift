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
    /// The person on the other end of the downlink briefs the player (web `InstrumentBriefing`).
    var briefing: InstrumentBriefing? = nil
    @State private var briefStep: Int? = nil

    var body: some View {
        scroller {
            VStack(alignment: .leading, spacing: 12) {
                header
                stage
                controls
                if let b = briefing, let i = briefStep, i < b.lines.count { desk(b, i) } else { command }
                if let b = briefing, briefStep == nil {
                    InstrumentAnswerButton(title: "Briefing · \(b.speaker)") { briefStep = 0 }
                }
                answers
                tool
            }
            .padding(16).frame(maxWidth: 560).frame(maxWidth: .infinity)
        }
        .background(Theme.bg.ignoresSafeArea())
        .foregroundStyle(Theme.ink)
        .onAppear {
            view = initialView
            if briefing?.startOpen == true { briefStep = 0 }
        }
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
            LinearGradient(colors: [ConsoleHW.deep, Theme.hex(0x05061A)], startPoint: .top, endPoint: .bottom)
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
            StageGreebles(readout: "\(aimReadout(view)) · \(String(format: "%.1f", view.zoom))×").allowsHitTesting(false)
            Image(systemName: "scope").font(.system(size: 54, weight: .ultraLight)).foregroundStyle(ConsoleHW.periwinkle.opacity(0.85))
                .shadow(color: ConsoleHW.violet.opacity(0.7), radius: 6).allowsHitTesting(false)
            if let caption {
                VStack { Spacer(); Text(caption).font(AppFont.body(14, "SemiBold")).foregroundStyle(ConsoleHW.cream)
                    .padding(8).frame(maxWidth: .infinity, alignment: .leading)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(ConsoleHW.violet.opacity(0.4), lineWidth: 1))
                    .padding(.horizontal, 8).padding(.bottom, 30) }
            }
        }
        .frame(maxWidth: .infinity)
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(ConsoleHW.periwinkle.opacity(0.85), lineWidth: 2))
        .shadow(color: ConsoleHW.violet.opacity(0.35), radius: 14)
    }

    /// Glass console plate: engraved name strip with lamps, over a smoked-glass panel.
    private func plate<L: View, C: View>(_ name: String, @ViewBuilder lights: () -> L, @ViewBuilder content: () -> C) -> some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                Text(name).font(AppFont.mono(14)).tracking(1.1).foregroundStyle(ConsoleHW.amber)
                    .shadow(color: ConsoleHW.amber.opacity(0.4), radius: 4).lineLimit(1).minimumScaleFactor(0.8)
                Spacer(minLength: 4)
                lights()
            }
            .padding(.horizontal, 10).frame(minHeight: 30)
            .background(LinearGradient(colors: [Theme.hex(0x06061A, 0.75), Theme.hex(0x18143C, 0.6)], startPoint: .top, endPoint: .bottom),
                        in: RoundedRectangle(cornerRadius: 6))
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(ConsoleHW.violet.opacity(0.25), lineWidth: 1))
            content()
        }
        .padding(12)
        .background(GlassPanel(cornerRadius: 14))
    }

    private var controls: some View {
        plate("OPTICS · IV-01", lights: {
            HStack(spacing: 8) {
                Led(label: "PWR", on: true, color: ConsoleHW.violet)
                Led(label: "TRK", on: true, color: ConsoleHW.magenta, blink: true)
                Led(label: "MAG", on: view.zoom > 1.01, color: ConsoleHW.amber)
            }
        }, content: {
            VStack(spacing: 12) {
                HStack(alignment: .top, spacing: 8) {
                    aimPad
                    VStack(spacing: 8) {
                        HStack(spacing: 8) {
                            Knob(label: "ZOOM", readout: String(format: "%.1f×", view.zoom), value: view.zoom, range: InstrumentLimits.zoomMin...InstrumentLimits.zoomMax) { view = Instrument.zoomed(view, to: $0) }
                            Knob(label: "FOCUS", readout: "\(Int((100 - abs(view.focus - 0.5) * 200).rounded()))%", value: view.focus, range: 0...1) { view = Instrument.focused(view, to: $0) }
                        }
                        Knob(label: "EXPOSE", readout: (view.exposure >= 1 ? "+" : "") + String(format: "%.1fEV", view.exposure - 1), value: view.exposure, range: InstrumentLimits.exposureMin...InstrumentLimits.exposureMax) { view = Instrument.exposed(view, to: $0) }
                    }
                    .frame(maxWidth: .infinity)
                }
                HStack(spacing: 10) {
                    LeverSwitch(label: "STRETCH", on: view.stretch) { view.stretch.toggle() }
                    LeverSwitch(label: "INVERT", on: view.invert) { view.invert.toggle() }
                }
                // Vent grille.
                HStack(spacing: 2) { ForEach(0..<24, id: \.self) { _ in Capsule().fill(Theme.hex(0x06061A)).frame(width: 5, height: 10) } }
                    .frame(maxWidth: .infinity).accessibilityHidden(true)
            }
        })
    }

    private var aimPad: some View {
        VStack(spacing: 4) {
            ZStack {
                // Graduated ring behind the keys.
                Circle().fill(RadialGradient(colors: [Theme.hex(0x1A1A48, 0.8), Theme.hex(0x0A0A24, 0.9)], center: .center, startRadius: 0, endRadius: 75))
                Circle().strokeBorder(ConsoleHW.periwinkle.opacity(0.55), style: StrokeStyle(lineWidth: 6, dash: [1, 7.3]))
                Circle().strokeBorder(ConsoleHW.violet.opacity(0.35), lineWidth: 1).padding(8)
                VStack(spacing: 2) {
                    pad("chevron.up", .north)
                    HStack(spacing: 2) { pad("chevron.left", .west); pad("circle.fill", .reset, centre: true); pad("chevron.right", .east) }
                    pad("chevron.down", .south)
                }
            }
            .frame(width: 148, height: 148)
            Lcd(text: aimReadout(view))
            Text("AIM").font(AppFont.display(14)).tracking(1.2).foregroundStyle(ConsoleHW.label)
        }
    }

    private func pad(_ symbol: String, _ d: AimDirection, centre: Bool = false) -> some View {
        Button { view = Instrument.nudge(view, d) } label: {
            Image(systemName: symbol).font(.system(size: 14, weight: .bold)).frame(width: 44, height: 44)
                .foregroundStyle(centre ? Color.white : ConsoleHW.cream)
        }
        .buttonStyle(KeycapStyle(radius: centre ? 22 : 8, fill: centre ? [Theme.hex(0x8A7CFF), Theme.hex(0x3A2C8C)] : nil))
        .accessibilityLabel("Aim \(String(describing: d))")
    }

    private var command: some View {
        plate("DOWNLINK · CH 02", lights: { SignalBars() }, content: {
            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(log.suffix(3).enumerated()), id: \.offset) { _, l in
                    Text(l).font(AppFont.mono(14)).foregroundStyle(ConsoleHW.phosphor).lineLimit(1)
                        .shadow(color: ConsoleHW.violet.opacity(0.6), radius: 4)
                }
                HStack(spacing: 8) {
                    Text(">").font(AppFont.mono(14)).foregroundStyle(ConsoleHW.magenta).shadow(color: ConsoleHW.magenta.opacity(0.6), radius: 4)
                    TextField("POINT, ZOOM, EXPOSE, HELP", text: $line)
                        .font(AppFont.mono(14)).foregroundStyle(ConsoleHW.phosphor).textFieldStyle(.plain).autocorrectionDisabled()
                        #if os(iOS)
                        .textInputAutocapitalization(.characters)
                        #endif
                        .frame(minHeight: 44).onSubmit(run)
                }
                .overlay(alignment: .bottom) { Rectangle().fill(ConsoleHW.violet.opacity(0.55)).frame(height: 1) }
            }
            .padding(10)
            .background(CrtGlass())
        })
    }

    private func desk(_ b: InstrumentBriefing, _ i: Int) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(b.speaker.uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(ConsoleHW.amber)
            Text(b.lines[i]).font(AppFont.body(16)).fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.updatesFrequently)
            InstrumentAnswerButton(title: i + 1 < b.lines.count ? "Next · \(i + 1)/\(b.lines.count)" : "Start", primary: true) {
                briefStep = i + 1 < b.lines.count ? i + 1 : nil
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(GlassPanel(cornerRadius: 10))
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

/// Lines from the person on the other end of an instrument's downlink (web `InstrumentBriefing`).
struct InstrumentBriefing {
    let speaker: String
    let lines: [String]
    /// Open on arrival: the player's first time on this instrument.
    let startOpen: Bool
}

private struct InvertIf: ViewModifier {
    let on: Bool
    func body(content: Content) -> some View { if on { content.colorInvert() } else { content } }
}

/// Console palette (mirrors web `.screen` --hw-* glass tokens, SSL-744): violet, blue, magenta,
/// amber for warnings, cream for the primary key. No green or teal on the console.
enum ConsoleHW {
    static let violet = Theme.hex(0xB49BFF)
    static let blue = Theme.hex(0x74A8FF)
    static let magenta = Theme.hex(0xFF73D2)
    static let amber = Theme.hex(0xF2B33D)
    static let cream = Theme.hex(0xF4EFE4)
    static let periwinkle = Theme.hex(0xAABEFF)
    static let phosphor = Theme.hex(0xDDD3FF)
    static let label = Theme.hex(0xD9E3F2)
    static let deep = Theme.hex(0x0E1030)
    static let rim = AngularGradient(colors: [blue, violet, magenta, amber, blue], center: .center, angle: .degrees(200))
}

/// "E04′ N00′": pointing offset in arcminutes (web `aimReadout`).
func aimReadout(_ v: InstrumentView) -> String {
    func fmt(_ x: Double, _ pos: String, _ neg: String) -> String {
        let n = Int(abs((x * 40).rounded()))
        return "\(x < 0 ? neg : pos)\(n < 10 ? "0" : "")\(n)′"
    }
    return "\(fmt(v.panX, "E", "W")) \(fmt(-v.panY, "N", "S"))"
}

/// Smoked glass with a specular sheen, colour washes, an iridescent rim and rivets.
struct GlassPanel: View {
    var cornerRadius: CGFloat = 14
    var body: some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius)
        ZStack {
            shape.fill(.ultraThinMaterial)
            shape.fill(LinearGradient(colors: [Theme.hex(0x1E1E48, 0.62), Theme.hex(0x0E102C, 0.74)], startPoint: .top, endPoint: .bottom))
            shape.fill(RadialGradient(colors: [ConsoleHW.blue.opacity(0.22), .clear], center: .topLeading, startRadius: 0, endRadius: 260))
            shape.fill(RadialGradient(colors: [ConsoleHW.magenta.opacity(0.18), .clear], center: .bottomTrailing, startRadius: 0, endRadius: 260))
            shape.fill(LinearGradient(colors: [.white.opacity(0.16), .white.opacity(0.03), .clear], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.4)))
            shape.strokeBorder(ConsoleHW.rim, lineWidth: 1.5)
            GeometryReader { g in
                ForEach(0..<4, id: \.self) { i in
                    Circle().fill(RadialGradient(colors: [Theme.hex(0xDFE6F3), Theme.hex(0x7D8AA8), Theme.hex(0x2A3350)], center: UnitPoint(x: 0.4, y: 0.35), startRadius: 0, endRadius: 4))
                        .frame(width: 7, height: 7)
                        .position(x: i % 2 == 0 ? 10 : g.size.width - 10, y: i < 2 ? 10 : g.size.height - 10)
                }
            }
        }
        .shadow(color: ConsoleHW.violet.opacity(0.22), radius: 12)
        .shadow(color: .black.opacity(0.5), radius: 14, y: 10)
        .accessibilityHidden(true)
    }
}

/// Indigo CRT with lavender phosphor, scanlines and a vignette.
private struct CrtGlass: View {
    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 12)
        ZStack {
            shape.fill(LinearGradient(colors: [Theme.hex(0x120F36), Theme.hex(0x0A0A24)], startPoint: .top, endPoint: .bottom))
            shape.fill(RadialGradient(colors: [ConsoleHW.blue.opacity(0.22), .clear], center: UnitPoint(x: 0.25, y: 0.15), startRadius: 0, endRadius: 200))
            shape.fill(RadialGradient(colors: [ConsoleHW.magenta.opacity(0.16), .clear], center: UnitPoint(x: 0.9, y: 1), startRadius: 0, endRadius: 200))
            Canvas { ctx, size in
                var y: CGFloat = 3
                while y < size.height { ctx.fill(Path(CGRect(x: 0, y: y, width: size.width, height: 1)), with: .color(.black.opacity(0.16))); y += 4 }
            }.clipShape(shape)
            shape.fill(LinearGradient(colors: [.white.opacity(0.09), .clear], startPoint: .topLeading, endPoint: UnitPoint(x: 0.4, y: 0.4)))
            shape.strokeBorder(Theme.hex(0x070B18), lineWidth: 3)
            shape.stroke(Theme.hex(0x9682E6, 0.55), lineWidth: 2).padding(-2)
        }
        .shadow(color: ConsoleHW.violet.opacity(0.3), radius: 10)
        .accessibilityHidden(true)
    }
}

/// Glass greebles over the stage: corner brackets, edge scales, a scan line and a pointing readout.
private struct StageGreebles: View {
    let readout: String
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var scan = false
    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height
            ZStack(alignment: .topLeading) {
                Canvas { ctx, size in
                    let tick = GraphicsContext.Shading.color(ConsoleHW.periwinkle.opacity(0.45))
                    for i in 0...40 {
                        let x = size.width * CGFloat(i) / 40, len: CGFloat = i % 5 == 0 ? 9 : 4
                        ctx.fill(Path(CGRect(x: x, y: 0, width: 1, height: len)), with: tick)
                        let y = size.height * CGFloat(i) / 40
                        ctx.fill(Path(CGRect(x: 0, y: y, width: len, height: 1)), with: tick)
                    }
                    let b: CGFloat = 18, m: CGFloat = 10
                    var p = Path()
                    let corners: [(CGFloat, CGFloat, CGFloat, CGFloat)] = [(m, m, 1, 1), (size.width - m, m, -1, 1), (m, size.height - m, 1, -1), (size.width - m, size.height - m, -1, -1)]
                    for (cx, cy, sx, sy) in corners {
                        p.move(to: CGPoint(x: cx, y: cy + b * sy)); p.addLine(to: CGPoint(x: cx, y: cy)); p.addLine(to: CGPoint(x: cx + b * sx, y: cy))
                    }
                    ctx.stroke(p, with: .color(ConsoleHW.periwinkle.opacity(0.8)), lineWidth: 1.5)
                }
                LinearGradient(colors: [.clear, ConsoleHW.violet.opacity(0.18), .clear], startPoint: .top, endPoint: .bottom)
                    .frame(width: w, height: 24)
                    .offset(y: scan ? h - 24 : 0)
                Text(readout).font(AppFont.mono(14, "Regular")).foregroundStyle(Theme.hex(0xCFE0FF))
                    .shadow(color: ConsoleHW.blue.opacity(0.8), radius: 4)
                    .position(x: w - 80, y: h - 14)
            }
        }
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.linear(duration: 4).repeatForever(autoreverses: true)) { scan = true }
        }
        .accessibilityHidden(true)
    }
}

/// Status lamp with an engraved label.
private struct Led: View {
    let label: String
    let on: Bool
    var color: Color = ConsoleHW.violet
    var blink = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var dim = false
    var body: some View {
        HStack(spacing: 4) {
            LedDot(on: on && !(blink && dim), color: color)
            Text(label).font(AppFont.mono(14)).foregroundStyle(Theme.hex(0xC4BCE8))
        }
        .onAppear {
            guard blink, !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 0.8).repeatForever()) { dim = true }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(label) \(on ? "on" : "off")")
    }
}

private struct LedDot: View {
    let on: Bool
    var color: Color = ConsoleHW.violet
    var body: some View {
        Circle()
            .fill(on ? RadialGradient(colors: [.white, color, color.opacity(0.6)], center: UnitPoint(x: 0.35, y: 0.3), startRadius: 0, endRadius: 6)
                     : RadialGradient(colors: [Theme.hex(0x4A5570), Theme.hex(0x1A2034)], center: UnitPoint(x: 0.35, y: 0.3), startRadius: 0, endRadius: 6))
            .frame(width: 10, height: 10)
            .shadow(color: on ? color.opacity(0.8) : .clear, radius: 5)
            .animation(.easeOut(duration: 0.12), value: on)
    }
}

private struct SignalBars: View {
    var body: some View {
        HStack(alignment: .bottom, spacing: 2) {
            ForEach(0..<5, id: \.self) { i in
                RoundedRectangle(cornerRadius: 1).fill(i < 4 ? ConsoleHW.blue : Theme.hex(0x2C2A55))
                    .frame(width: 4, height: CGFloat(4 + i * 3))
                    .shadow(color: i < 4 ? ConsoleHW.blue.opacity(0.7) : .clear, radius: 2)
            }
            Text("×5").font(AppFont.mono(14)).foregroundStyle(Theme.hex(0xC4BCE8)).padding(.leading, 4)
        }
        .accessibilityElement(children: .ignore).accessibilityLabel("Signal strong")
    }
}

/// Lit glass readout strip.
private struct Lcd: View {
    let text: String
    var body: some View {
        Text(text).font(AppFont.mono(14)).foregroundStyle(ConsoleHW.phosphor).lineLimit(1).minimumScaleFactor(0.8)
            .shadow(color: ConsoleHW.violet.opacity(0.8), radius: 4)
            .padding(.horizontal, 6).padding(.vertical, 3).frame(minWidth: 56)
            .background(LinearGradient(colors: [Theme.hex(0x140E3C, 0.85), Theme.hex(0x281450, 0.7)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(ConsoleHW.violet.opacity(0.45), lineWidth: 1))
    }
}

/// Glass keycap that presses in, with a coloured backlight strip.
private struct KeycapStyle: ButtonStyle {
    var radius: CGFloat = 8
    var fill: [Color]? = nil
    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        let shape = RoundedRectangle(cornerRadius: radius)
        return configuration.label
            .background(
                ZStack {
                    shape.fill(LinearGradient(colors: fill ?? [Theme.hex(0x5A64AA, 0.75), Theme.hex(0x1E2050, 0.85)], startPoint: .top, endPoint: .bottom))
                    shape.fill(LinearGradient(colors: [.white.opacity(0.22), .clear], startPoint: .top, endPoint: .center))
                    shape.strokeBorder(ConsoleHW.violet.opacity(pressed ? 0.9 : 0.35), lineWidth: 1)
                }
                .shadow(color: pressed ? ConsoleHW.violet.opacity(0.6) : .black.opacity(0.6), radius: pressed ? 8 : 0, y: pressed ? 0 : 3)
            )
            .offset(y: pressed ? 2 : 0)
            .animation(.easeOut(duration: 0.08), value: pressed)
    }
}

/// Round dial: drag up/down to turn, or use VoiceOver adjust. Graduated bezel, a value arc
/// sweeping blue → violet → magenta, a knurled cap and an LCD readout. 64pt hit area.
private struct Knob: View {
    let label: String
    let readout: String
    let value: Double
    let range: ClosedRange<Double>
    let set: (Double) -> Void
    @State private var start: Double?

    var body: some View {
        let t = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
        VStack(spacing: 4) {
            ZStack {
                Circle().strokeBorder(ConsoleHW.periwinkle.opacity(0.55), style: StrokeStyle(lineWidth: 5, dash: [1.2, 13.3]))
                Circle().trim(from: 0, to: 0.75 * t)
                    .stroke(AngularGradient(colors: [ConsoleHW.blue, ConsoleHW.violet, ConsoleHW.magenta], center: .center, startAngle: .degrees(0), endAngle: .degrees(270 * max(t, 0.01))),
                            style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(135))
                    .padding(2)
                    .shadow(color: ConsoleHW.violet.opacity(0.6), radius: 4)
                ZStack {
                    Circle().fill(RadialGradient(colors: [Theme.hex(0x56658F), Theme.hex(0x27304F), Theme.hex(0x141A30)], center: UnitPoint(x: 0.4, y: 0.32), startRadius: 0, endRadius: 26))
                    Circle().strokeBorder(Theme.hex(0x39456A), style: StrokeStyle(lineWidth: 3, dash: [2, 2]))
                    Capsule().fill(Color.white).frame(width: 3, height: 13).offset(y: -10)
                        .shadow(color: ConsoleHW.magenta.opacity(0.8), radius: 4)
                        .rotationEffect(.degrees(-135 + t * 270))
                }
                .frame(width: 44, height: 44)
                .shadow(color: start != nil ? ConsoleHW.magenta.opacity(0.55) : .black.opacity(0.6), radius: start != nil ? 8 : 3, y: start != nil ? 0 : 3)
            }
            .frame(width: 64, height: 64)
            .contentShape(Circle())
            .gesture(DragGesture(minimumDistance: 2).onChanged { g in
                let s = start ?? value; start = s
                let span = range.upperBound - range.lowerBound
                set(min(range.upperBound, max(range.lowerBound, s - Double(g.translation.height) / 120 * span)))
            }.onEnded { _ in start = nil })
            Lcd(text: readout)
            Text(label).font(AppFont.display(14)).tracking(0.6).foregroundStyle(ConsoleHW.label).lineLimit(1).minimumScaleFactor(0.8)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label.capitalized)
        .accessibilityValue(readout)
        .accessibilityAdjustableAction { dir in
            let step = (range.upperBound - range.lowerBound) / 10
            set(min(range.upperBound, max(range.lowerBound, value + (dir == .increment ? step : -step))))
        }
    }
}

/// Bat-lever toggle with a status lamp; the channel lights blue → magenta when on.
private struct LeverSwitch: View {
    let label: String
    let on: Bool
    let toggle: () -> Void
    var body: some View {
        Button(action: toggle) {
            HStack(spacing: 10) {
                LedDot(on: on)
                ZStack(alignment: on ? .top : .bottom) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(on ? AnyShapeStyle(LinearGradient(colors: [ConsoleHW.blue.opacity(0.5), ConsoleHW.magenta.opacity(0.5)], startPoint: .top, endPoint: .bottom))
                                 : AnyShapeStyle(LinearGradient(colors: [Theme.hex(0x070B18), Theme.hex(0x141B33)], startPoint: .top, endPoint: .bottom)))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(on ? Theme.hex(0xDCC8FF, 0.7) : Theme.hex(0x0A0F1F), lineWidth: 1))
                        .frame(width: 30, height: 44)
                        .shadow(color: on ? ConsoleHW.violet.opacity(0.45) : .clear, radius: 6)
                    RoundedRectangle(cornerRadius: 6)
                        .fill(LinearGradient(colors: [ConsoleHW.cream, Theme.hex(0xB9C1D4), Theme.hex(0x7F89A3)], startPoint: .top, endPoint: .bottom))
                        .frame(width: 24, height: 22).padding(3)
                        .shadow(color: .black.opacity(0.6), radius: 2, y: 2)
                }
                .animation(.easeOut(duration: 0.12), value: on)
                Text(label).font(AppFont.display(14)).tracking(1.2).foregroundStyle(ConsoleHW.label)
            }
            .frame(maxWidth: .infinity, minHeight: 48)
        }.buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
    }
}

/// Answer row button shared by every project: glass keycap; primary is the cream key.
struct InstrumentAnswerButton: View {
    let title: String
    var enabled = true
    var primary = false
    /// Looks unready but still runs the action, so a tap can explain what is missing.
    var dim = false
    let action: () -> Void
    var body: some View {
        let enabled = enabled && !dim
        // Not .disabled: the system dims a disabled plain button's label below 4.5:1. Gate the action instead.
        Button(action: { if enabled || dim { action() } }) {
            Text(title.uppercased()).font(AppFont.display(14)).tracking(1.2).multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 44).padding(.horizontal, 6)
                .foregroundStyle(!enabled ? Theme.hex(0xB7B2D6) : (primary ? Theme.hex(0x10182C) : ConsoleHW.cream))
                .overlay(alignment: .top) {
                    Capsule().fill(!enabled ? AnyShapeStyle(Theme.hex(0x3A4460)) : AnyShapeStyle(LinearGradient(colors: [primary ? ConsoleHW.violet : ConsoleHW.blue, ConsoleHW.magenta], startPoint: .leading, endPoint: .trailing)))
                        .frame(width: 28, height: 3).padding(.top, 5)
                }
        }
        .buttonStyle(AnswerKeyStyle(enabled: enabled, primary: primary))
        .accessibilityAddTraits(enabled ? [] : .isStaticText)
    }
}

private struct AnswerKeyStyle: ButtonStyle {
    let enabled: Bool
    let primary: Bool
    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed && enabled
        let shape = RoundedRectangle(cornerRadius: 10)
        return configuration.label
            .background {
                if !enabled {
                    shape.fill(Theme.hex(0x141432, 0.55))
                        .overlay(shape.stroke(Theme.hex(0xC8BEF0, 0.35), style: StrokeStyle(lineWidth: 1, dash: [4, 3])))
                } else if primary {
                    shape.fill(LinearGradient(colors: [Theme.hex(0xFFFAF0), ConsoleHW.cream, Theme.hex(0xD8CFBB)], startPoint: .top, endPoint: .bottom))
                        .shadow(color: pressed ? .clear : Theme.hex(0x8E8572), radius: 0, y: 4)
                        .shadow(color: ConsoleHW.cream.opacity(0.35), radius: 9)
                } else {
                    ZStack {
                        shape.fill(.ultraThinMaterial)
                        shape.fill(LinearGradient(colors: [Theme.hex(0x464696, 0.6), Theme.hex(0x1A1A46, 0.75)], startPoint: .top, endPoint: .bottom))
                        shape.fill(LinearGradient(colors: [.white.opacity(0.14), .clear], startPoint: .top, endPoint: .center))
                        shape.strokeBorder(ConsoleHW.violet.opacity(0.3), lineWidth: 1)
                    }
                    .shadow(color: pressed ? .clear : Theme.hex(0x070B18), radius: 0, y: 4)
                }
            }
            .offset(y: pressed ? 3 : 0)
            .animation(.easeOut(duration: 0.08), value: pressed)
    }
}
