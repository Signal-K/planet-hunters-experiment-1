import SwiftUI
import LandnamCore

/// Surface-ops prospecting (mirrors web RoverMiningScreen, SSL-484 / SSL-485): deploy the Mule rover,
/// drive to exposed ore, drill. Drill three always opens a mine site; stake the first rig, then return.
/// The field fills the screen; only the hotbar, drive pad and drill control sit over it.
struct RoverFieldScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var deployed: Bool
    @State private var prospecting: Prospecting

    /// Snapshot tests pass a ready state; the app starts at touchdown.
    init(initial: Prospecting? = nil, deployed: Bool = false) {
        _prospecting = State(initialValue: initial ?? Prospecting(requirements: [:]))
        _deployed = State(initialValue: deployed)
    }

    private var targetName: String { store.target?.name ?? "Target" }
    private var requirements: Cargo {
        guard let m = store.mission, let t = store.target else { return prospecting.requirements }
        return Prospecting.requirements(for: m, target: t)
    }

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .topLeading) {
                RoverTerrain().ignoresSafeArea()
                if deployed { field(geo.size) }
                VStack(spacing: 10) {
                    hotbar
                    Spacer(minLength: 0)
                    if !deployed { touchdown }
                    else if geo.size.width > geo.size.height {
                        // Landscape has no spare height: drive pad and drill on the left, readout beside them.
                        HStack(alignment: .bottom, spacing: 12) { controls.frame(maxWidth: 330); readout }
                    } else { readout; controls }
                }
                .padding(16)
            }
        }
        .background(Theme.bg.ignoresSafeArea())
        .onAppear { if prospecting.requirements.isEmpty { prospecting = Prospecting(requirements: requirements) } }
    }

    private var hotbar: some View {
        HStack(spacing: 10) {
            Button { store.go(.hub) } label: {
                Text("EXIT FIELD").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.ink)
                    .padding(.horizontal, 12).frame(minHeight: 44)
                    .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.border, lineWidth: 2))
            }.buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 2) {
                Eyebrow(text: "Prospector · \(targetName)")
                Text(prospecting.mineSite != nil ? "MINE SITE ACTIVE" : "\(prospecting.drillsToSite) DRILLS TO GUARANTEED SITE")
                    .font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.ink)
            }
            .padding(8).background(Theme.paper.opacity(0.9), in: RoundedRectangle(cornerRadius: 8))
            Spacer(minLength: 0)
        }
    }

    private var touchdown: some View {
        Panel(accent: Theme.blueBright) {
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow(text: "Touchdown · \(targetName)")
                Text("Deploy the Mule rover").font(AppFont.display(20))
                Text("The Prospector is your rocket. The Mule is the rover in its hold. Deploy it to drive across the visible terrain and drill the client order.")
                    .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                PrimaryButton(title: "DEPLOY MULE ROVER") { deployed = true }
            }
        }
    }

    // MARK: field

    private func field(_ size: CGSize) -> some View {
        let fieldTop = size.height * 0.2, fieldH = size.height * 0.3
        func at(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: x * size.width, y: fieldTop + y * fieldH) }
        return ZStack {
            ForEach(Prospecting.outcrops) { o in
                outcropButton(o).position(at(o.x, o.y))
            }
            if let site = prospecting.mineSite.flatMap({ id in Prospecting.outcrops.first { $0.id == id } }) {
                Button { prospecting.startConstruction() } label: {
                    Text(prospecting.constructionStarted ? "FIRST MINE RIG · STARTED" : "START FIRST MINE RIG")
                        .font(AppFont.display(14)).tracking(1.0).foregroundStyle(.white)
                        .padding(.horizontal, 12).frame(minHeight: 44)
                        .background(prospecting.constructionStarted ? Theme.teal : Theme.blue, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                }.buttonStyle(.plain).position(CGPoint(x: size.width / 2, y: fieldTop - 8))
            }
            Art.view("actors/road_rover.png").resizable().aspectRatio(1.5, contentMode: .fit).frame(width: 64)
                .position(at(prospecting.rover.x, prospecting.rover.y + 0.0))
                .offset(y: 52)
                .animation(reduceMotion ? nil : .easeInOut(duration: 0.5), value: prospecting.rover.x)
                .animation(reduceMotion ? nil : .easeInOut(duration: 0.5), value: prospecting.rover.y)
                .allowsHitTesting(false).accessibilityHidden(true)
        }
    }

    private func outcropButton(_ o: Outcrop) -> some View {
        let isSite = prospecting.mineSite == o.id, on = prospecting.selected == o.id
        return Button {
            prospecting.select(o.id); prospecting.driveToSelected()
        } label: {
            VStack(spacing: 2) {
                Image(systemName: isSite ? "flag.fill" : "triangle.fill").font(.system(size: 22, weight: .bold))
                    .foregroundStyle(isSite ? Theme.teal : Theme.blue)
                Text(isSite ? "MINE SITE" : o.label).font(AppFont.display(14)).tracking(0.8).foregroundStyle(Theme.ink)
                    .padding(.horizontal, 6).background(Theme.paper, in: Capsule())
            }
            .frame(minWidth: 44, minHeight: 44)
            .padding(4)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(on ? Theme.ink : .clear, lineWidth: 2.5))
        }.buttonStyle(.plain).accessibilityLabel(isSite ? "Mine site" : o.label).accessibilityAddTraits(on ? .isSelected : [])
    }

    // MARK: panels

    private var readout: some View {
        Panel(accent: Theme.teal) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Eyebrow(text: "Drill results")
                    Spacer()
                    Text(prospecting.mineSite != nil ? "SITE LOCATED" : "PROSPECTING").font(AppFont.display(14)).tracking(1.0)
                }
                if prospecting.drillings.isEmpty {
                    Text("Select an exposed ore marker, drive into range, then use the drill. A mine site is guaranteed by drill three.")
                        .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                } else {
                    // The latest result only: the full history pushed the drive pad off the screen.
                    ForEach(prospecting.drillings.suffix(1)) { f in
                        Text("DRILL \(f.attempt) · \(f.label)").font(AppFont.mono(14)).foregroundStyle(f.kind == .mineSite ? Theme.teal : Theme.ink)
                    }
                }
                if prospecting.mineSite != nil {
                    Text(prospecting.constructionStarted ? "FIRST MINE RIG IS STAKED ON THE FIELD." : "SELECT THE MINE SITE ON THE FIELD TO START THE FIRST RIG.")
                        .font(AppFont.display(14)).tracking(0.8).foregroundStyle(Theme.ink)
                }
                PrimaryButton(title: "RETURN PROSPECTOR", enabled: prospecting.canReturn) { store.roverMiningDone(prospecting.cargo) }
            }
        }
    }

    private var controls: some View {
        HStack(alignment: .bottom, spacing: 12) {
            VStack(spacing: 2) {
                padButton("chevron.up", "Drive north") { prospecting.drive(dx: 0, dy: -0.06) }
                HStack(spacing: 2) {
                    padButton("chevron.left", "Drive west") { prospecting.drive(dx: -0.06, dy: 0) }
                    padButton("chevron.down", "Drive south") { prospecting.drive(dx: 0, dy: 0.06) }
                    padButton("chevron.right", "Drive east") { prospecting.drive(dx: 0.06, dy: 0) }
                }
            }
            Spacer(minLength: 0)
            VStack(alignment: .trailing, spacing: 6) {
                Eyebrow(text: prospecting.selectedOutcrop.map { "\($0.label) selected" } ?? "Select exposed ore")
                InstrumentAnswerButton(title: prospecting.mineSite != nil ? "Mine site open" : (prospecting.selected != nil && !prospecting.inRange ? "Drive closer" : "Drill exposed ore"),
                                       enabled: prospecting.canDrill, primary: true) { prospecting.drill() }
                    .frame(maxWidth: 220)
            }
        }
    }

    private func padButton(_ symbol: String, _ label: String, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Image(systemName: symbol).font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.ink).frame(width: 44, height: 44)
                .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8)).overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
        }.buttonStyle(.plain).accessibilityLabel(label)
    }
}

/// Full-bleed blueprint surface: pale sky, outlined ridge, a ground that runs off every edge so the field never reads flat.
struct RoverTerrain: View {
    var body: some View {
        Canvas { ctx, size in
            ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .linearGradient(
                Gradient(colors: [Theme.skyTop, Theme.skyMid, Theme.horizon]), startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height * 0.35)))
            let horizon = size.height * 0.16
            var ridge = Path(); ridge.move(to: CGPoint(x: 0, y: horizon))
            for i in 1...8 {
                let x = size.width * CGFloat(i) / 8
                ridge.addLine(to: CGPoint(x: x, y: horizon - (i % 2 == 0 ? 28 : 8) - CGFloat((i * 13) % 17)))
            }
            ridge.addLine(to: CGPoint(x: size.width, y: size.height)); ridge.addLine(to: CGPoint(x: 0, y: size.height)); ridge.closeSubpath()
            ctx.fill(ridge, with: .linearGradient(Gradient(colors: [Theme.groundFar, Theme.groundNear]), startPoint: CGPoint(x: 0, y: horizon), endPoint: CGPoint(x: 0, y: size.height)))
            ctx.stroke(ridge, with: .color(Theme.ink), lineWidth: 3)
            // Ground grid receding to the horizon: the field edge reads as a surface with depth.
            for i in 1...6 {
                let y = horizon + (size.height - horizon) * pow(CGFloat(i) / 6, 1.8)
                var l = Path(); l.move(to: CGPoint(x: 0, y: y)); l.addLine(to: CGPoint(x: size.width, y: y))
                ctx.stroke(l, with: .color(Theme.ink.opacity(0.18)), lineWidth: 1.5)
            }
        }
        .accessibilityHidden(true)
    }
}
