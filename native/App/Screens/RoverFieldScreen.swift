import SwiftUI
import LandnamCore

/// Starter-rover survey (mirrors web RoverSurveyScreen): deploy the Mule, scout the field, then continue to the ship laser. The rover does not extract contract cargo.
/// The field fills the screen; only the hotbar, drive pad and survey readout sit over it.
struct RoverFieldScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var deployed: Bool
    @State private var prospecting: Prospecting

    /// Snapshot tests pass a ready state; the app starts at touchdown.
    init(initial: Prospecting? = nil, deployed: Bool = false) {
        _prospecting = State(initialValue: initial ?? Prospecting())
        _deployed = State(initialValue: deployed)
    }

    private var targetName: String { store.target?.name ?? "Target" }
    private var orionidsResearch: Bool { store.mission?.id == OrionidsRun.surfaceResearchMissionId }

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
                        // Landscape has no spare height: drive pad on the left, readout beside them.
                        HStack(alignment: .bottom, spacing: 12) { controls.frame(maxWidth: 330); readout }
                    } else { readout; controls }
                }
                .padding(16)
            }
        }
        .background(Theme.bg.ignoresSafeArea())
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
                Text(prospecting.logged != nil ? "OBSERVATION LOGGED" : "SCOUTING")
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
                Text(orionidsResearch ? "Deploy the Orionids field rover" : "Deploy the Mule rover").font(AppFont.display(20))
                Text(orionidsResearch ? "The rover is loaded in your payload. Drive it onto the meteor, find the blue fracture outcrop, and log the observation for community research." : "The Prospector is your rocket. The Mule is the rover in its hold. Deploy it to scout the terrain and log one outcrop. Ship laser extraction begins after the survey.")
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
            Art.view("actors/road_rover.png").resizable().aspectRatio(1.5, contentMode: .fit).frame(width: 64)
                .position(at(prospecting.rover.x, prospecting.rover.y + 0.0))
                .offset(y: 52)
                .animation(reduceMotion ? nil : .easeInOut(duration: 0.5), value: prospecting.rover.x)
                .animation(reduceMotion ? nil : .easeInOut(duration: 0.5), value: prospecting.rover.y)
                .allowsHitTesting(false).accessibilityHidden(true)
        }
    }

    private func outcropButton(_ o: Outcrop) -> some View {
        let on = prospecting.logged == o.id
        return Button {
            prospecting.observe(o.id)
        } label: {
            VStack(spacing: 2) {
                Image(systemName: on ? "flag.fill" : "triangle.fill").font(.system(size: 22, weight: .bold))
                    .foregroundStyle(on ? Theme.teal : Theme.blue)
                Text(o.label).font(AppFont.display(14)).tracking(0.8).foregroundStyle(Theme.ink)
                    .padding(.horizontal, 6).background(Theme.paper, in: Capsule())
            }
            .frame(minWidth: 44, minHeight: 44)
            .padding(4)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(on ? Theme.ink : .clear, lineWidth: 2.5))
        }.buttonStyle(.plain).accessibilityLabel(o.label).accessibilityAddTraits(on ? .isSelected : [])
    }

    // MARK: panels

    private var readout: some View {
        Panel(accent: Theme.teal) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Eyebrow(text: "Survey results")
                    Spacer()
                    Text(prospecting.logged != nil ? "OBSERVATION LOGGED" : "SCOUTING").font(AppFont.display(14)).tracking(1.0)
                }
                Text(prospecting.loggedOutcrop.map { orionidsResearch ? "\($0.label) logged. The Orionids observation is ready for debrief." : "\($0.label) logged. The ship laser is ready for extraction." }
                     ?? "Use the drive pad to scout the field, then tap an exposed outcrop to log a surface observation.")
                    .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                PrimaryButton(title: orionidsResearch ? "LOG OBSERVATION" : "CONTINUE TO SHIP LASER") { store.roverSurveyComplete() }
                    .disabled(!prospecting.canContinue).opacity(prospecting.canContinue ? 1 : 0.45)
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
            Eyebrow(text: prospecting.loggedOutcrop.map { "\($0.label) logged" } ?? "Select an outcrop")
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
