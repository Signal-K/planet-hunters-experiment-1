import SwiftUI
import LandnamCore

/// Assembly bay: a vector room (`HangarBayArt`) with a gantry and, only when a vehicle is staged, its rocket.
/// The floor is a row of rocket cards; tapping an open card builds that rocket for the mission that is set up.
struct HangarScreen: View {
    @Environment(GameStore.self) private var store
    @State private var configuring = false
    @State private var launching = false
    @State private var previewRocketId: String?

    private var customizerUnlocked: Bool {
        store.player.unlockedSkillNodes.contains("ship-customizer-1")
            || store.player.crewModuleResearched
            || store.player.landingResearched
    }

    private var stagedInBay: Bool { store.player.stagedRockets.contains { $0.location == .hangar } }
    private var stagedOnPad: Bool { store.player.stagedRockets.contains { $0.location == .launchpad } }
    private var hasMission: Bool { store.mission != nil && store.target != nil }
    private var stagedTier: Int? {
        guard let id = store.player.selectedStagedRocketId,
              let vehicle = store.player.stagedRockets.first(where: { $0.id == id && $0.location == .hangar }) else { return nil }
        return Rockets.model(id: Rockets.canonicalId(vehicle.rocketId))?.tier ?? 1
    }
    private var previewModel: RocketModel? {
        let id = previewRocketId ?? store.player.selectedStagedRocketId.flatMap { selected in
            store.player.stagedRockets.first(where: { $0.id == selected })?.rocketId
        }
        return id.flatMap { Rockets.model(id: Rockets.canonicalId($0)) }
    }

    var body: some View {
        if launching {
            LaunchSequenceScreen(variant: "explorer") { store.launch() }
        } else if configuring {
            HangarModulesPanel(onClose: { configuring = false })
        } else {
            bay
        }
    }

    private var bay: some View {
        GeometryReader { geo in
            let short = geo.size.height < 500
            let narrow = geo.size.width < 720
            ZStack {
                HangarBayArt(stagedTier: stagedTier)
                    .frame(width: geo.size.width, height: geo.size.height)
            }
            .overlay(alignment: .top) {
                status
                    .padding(.top, short ? 12 : 20)
                    .padding(.horizontal, 12)
            }
            .overlay(alignment: .topLeading) {
                blueprint(width: narrow ? min(96, geo.size.width * 0.26) : (short ? 92 : min(156, geo.size.width * 0.14)))
                    .padding(.top, narrow ? 76 : (short ? 48 : 72))
                    .padding(.leading, narrow ? 12 : 28)
            }
            .overlay(alignment: .bottom) {
                cards(short: short, narrow: narrow)
                    .frame(maxWidth: short ? 500 : 820)
                    .padding(.horizontal, narrow ? 12 : 24)
                    .padding(.bottom, short ? 56 : 68)
            }
            .overlay(alignment: .bottom) {
                if hasMission {
                    selectionPanel(short: short, narrow: narrow)
                        .padding(.horizontal, narrow ? 12 : 24)
                        .padding(.bottom, short ? 174 : 194)
                }
            }
            .overlay(alignment: .center) {
                if stagedInBay || stagedOnPad {
                    Button {
                        if stagedInBay { store.rollOutToPad() } else { launching = true }
                    } label: {
                        Color.clear
                            .frame(width: max(44, min(220, geo.size.width * 0.34)), height: max(44, min(280, geo.size.height * 0.42)))
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(stagedInBay ? "Roll out to pad" : "Launch")
                    .offset(y: short ? -36 : -48)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
            .clipped()
            .overlay(alignment: .bottomLeading) {
                Button { store.go(.hub) } label: {
                    Text("EXIT BAY").font(AppFont.display(14, "Bold")).tracking(1.2)
                        .foregroundStyle(Theme.paper)
                        .padding(.horizontal, 14).frame(minHeight: 44)
                        .background(Theme.ink.opacity(0.88), in: Capsule())
                        .overlay(Capsule().stroke(Theme.paper, lineWidth: 1.5))
                }
                .buttonStyle(.plain)
                .padding(.leading, narrow ? 12 : 28)
                .padding(.bottom, short ? 8 : 16)
            }
        }
        .foregroundStyle(Theme.ink)
        .ignoresSafeArea()
        .statusBarHidden()
        .accessibilityElement(children: .contain)
    }

    /// Which mission the rocket is for, or a way to choose one when none is set up.
    private var status: some View {
        HStack(spacing: 6) {
            Text(hasMission ? "BUILDING FOR \((store.mission?.title ?? "").uppercased())" : "NO MISSION SET UP")
                .font(AppFont.display(14)).tracking(1.1).lineLimit(2).multilineTextAlignment(.leading)
                .padding(.leading, 10).padding(.vertical, 4)
            if !hasMission {
                Button { store.go(.missions) } label: {
                    Text("CHOOSE MISSION").font(AppFont.display(14)).tracking(1.1)
                        .foregroundStyle(Glass.cyan)
                        .padding(.horizontal, 16).frame(minHeight: 44)
                        .overlay(Capsule().stroke(Glass.cyan, lineWidth: 1.5))
                }
                .buttonStyle(.plain)
            } else {
                Color.clear.frame(width: 4, height: 1)
            }
        }
        .foregroundStyle(Color.white)
        .padding(3)
        .glowPanel(Capsule())
        .accessibilityElement(children: .contain)
    }

    private func blueprint(width: CGFloat) -> some View {
        Button {
            if customizerUnlocked { configuring = true }
        } label: {
            Canvas { ctx, size in
                let k = size.width / 220
                ctx.scaleBy(x: k, y: k)
                let frame = Path(roundedRect: CGRect(x: 2, y: 2, width: 216, height: 146), cornerRadius: 6)
                ctx.fill(frame, with: .color(Theme.ink.opacity(0.7)))
                ctx.stroke(frame, with: .color(Theme.paper), lineWidth: 3)
                var d = Path()
                d.move(to: CGPoint(x: 60, y: 118)); d.addLine(to: CGPoint(x: 60, y: 50)); d.addQuadCurve(to: CGPoint(x: 88, y: 50), control: CGPoint(x: 74, y: 16))
                d.addLine(to: CGPoint(x: 88, y: 118)); d.closeSubpath()
                for y in [40.0, 62, 84, 106] { d.move(to: CGPoint(x: 126, y: y)); d.addLine(to: CGPoint(x: 196 - (y == 62 ? 16 : y == 106 ? 30 : 0), y: y)) }
                ctx.stroke(d, with: .color(Theme.blueBright), style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
            }
            .aspectRatio(220.0 / 150, contentMode: .fit)
            .frame(width: width)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("open-ship-customizer")
        .accessibilityLabel("Vehicle blueprint")
    }

    private func cards(short: Bool, narrow: Bool) -> some View {
        let vehicles: [(id: String, name: String)] = [
            ("explorer", "Explorer"),
            ("prospector", "Prospector"),
            ("surveyor", "Surveyor"),
        ]
        return HStack(spacing: short ? 8 : 12) {
            ForEach(vehicles, id: \.id) { vehicle in
                let model = Rockets.model(id: vehicle.id)
                let sealed = model.map { $0.locked || store.player.missionsDone < $0.missionsRequired } ?? false
                let incompatible = hasMission && (model.flatMap { m in store.mission.map { !Rockets.compatible(m, with: $0) } } ?? false)
                let note: String? = sealed
                    ? model.map { "Needs \($0.missionsRequired) \($0.missionsRequired == 1 ? "mission" : "missions")" }
                    : incompatible ? "Cannot carry this mission" : !hasMission ? "Choose a mission first" : nil
                let cost = model.map { $0.costFrancs == 0 ? "Free" : Economy.format(francs: $0.costFrancs) } ?? ""
                Button {
                    if note == nil { previewRocketId = vehicle.id }
                } label: {
                    VStack(spacing: 4) {
                        HangarRocketThumbnail(tier: model?.tier ?? 1)
                            .frame(maxWidth: .infinity)
                            .frame(height: short ? 28 : (narrow ? 44 : 72))
                            .opacity(note == nil ? 1 : 0.55)
                        Text(vehicle.name.uppercased())
                            .font(AppFont.display(14)).tracking(narrow ? 0.4 : 1.1)
                            .lineLimit(1).minimumScaleFactor(0.8)
                        if let note {
                            Text(note).font(.system(size: 14)).multilineTextAlignment(.center)
                                .frame(minHeight: 44).opacity(0.8)
                        } else {
                            VStack(spacing: 0) {
                                Text("BUILD").font(AppFont.display(14)).tracking(1.1)
                                Text(cost).font(.system(size: 14, weight: .semibold))
                            }
                            .foregroundStyle(Glass.cyan)
                            .padding(.horizontal, 16).frame(minHeight: 44)
                            .overlay(Capsule().stroke(Glass.cyan, lineWidth: 1.5))
                        }
                    }
                    .foregroundStyle(Color.white)
                    .padding(.horizontal, short ? 4 : 8)
                    .padding(.vertical, short ? 4 : 8)
                    .frame(maxWidth: .infinity, minHeight: short ? 76 : (narrow ? 104 : 120))
                    .glowPanel(RoundedRectangle(cornerRadius: 12), active: note == nil && previewModel?.id == vehicle.id)
                    .opacity(note == nil ? 1 : 0.8)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(note.map { "\(vehicle.name), \($0)" } ?? "Build \(vehicle.name) for \(cost)")
            }
        }
    }

    private func selectionPanel(short: Bool, narrow: Bool) -> some View {
        let model = previewModel
        let stats: [(String, Int, Int)] = [
            ("CAPACITY", model?.cargo ?? 0, 18),
            ("RANGE", model?.maxOrbit ?? 0, 9),
            ("LASER", model?.drillTier ?? 0, 3),
        ]
        return HStack(spacing: narrow ? 8 : 14) {
            HangarRocketThumbnail(tier: model?.tier ?? 1)
                .frame(width: narrow ? 72 : 108, height: narrow ? 38 : 58)
                .overlay(alignment: .bottomLeading) {
                    Text(model.map { "TIER \($0.tier)" } ?? "SELECT")
                        .font(AppFont.display(10, "Bold")).tracking(1)
                        .foregroundStyle(Theme.ink).padding(3).background(Glass.cyan)
                }
            VStack(alignment: .leading, spacing: 2) {
                Text("MISSION VEHICLE").font(AppFont.display(11, "Bold")).tracking(1.4).foregroundStyle(Glass.cyan)
                Text(model?.name.uppercased() ?? "NO VEHICLE SELECTED").font(AppFont.display(narrow ? 16 : 21, "Bold")).tracking(1)
                Text(model == nil ? "Choose a blueprint to inspect its flight profile." : "Review the profile, then stage this vehicle.")
                    .font(AppFont.body(12)).lineLimit(2).opacity(0.82)
            }
            if !narrow {
                HStack(spacing: 10) {
                    ForEach(stats, id: \.0) { stat in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(stat.0).font(AppFont.display(10, "Bold")).tracking(1).opacity(0.72)
                            Text(model == nil ? "—" : "\(stat.1)").font(AppFont.display(18, "Bold"))
                            ProgressView(value: Double(stat.1), total: Double(stat.2)).tint(Glass.cyan).frame(width: 48)
                        }
                    }
                }
            }
            Button {
                if let model { store.purchaseRocket(model.id) }
            } label: {
                VStack(spacing: 2) {
                    Text(model == nil ? "SELECT" : "STAGE").font(AppFont.display(12, "Bold")).tracking(1)
                    if let model { Text(model.costFrancs == 0 ? "FREE" : Economy.format(francs: model.costFrancs)).font(AppFont.body(11, "Bold")) }
                }
                .foregroundStyle(Theme.ink).padding(.horizontal, narrow ? 8 : 14).frame(minHeight: 52)
                .background(Glass.cyan, in: RoundedRectangle(cornerRadius: 6))
            }
            .buttonStyle(.plain)
            .disabled(model == nil)
            .opacity(model == nil ? 0.5 : 1)
        }
        .foregroundStyle(Color.white)
        .padding(narrow ? 8 : 12)
        .background(Theme.ink.opacity(0.96), in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.paper, lineWidth: 1.5))
        .shadow(color: Theme.ink.opacity(0.35), radius: 12, y: 6)
        .accessibilityIdentifier("hangar-vehicle-preview")
    }

}

private struct HangarRocketThumbnail: View {
    let tier: Int

    var body: some View {
        Canvas { context, size in
            let transform = CGAffineTransform(scaleX: size.width / 210, y: size.height / 107)
            context.concatenate(transform)
            let outline = Theme.ink
            let hull = Theme.paper
            let blue = Theme.blue
            let glass = Theme.blueBright
            let asphalt = Theme.ink
            func polygon(_ points: [CGPoint], color: Color, lineWidth: CGFloat = 4) {
                var path = Path()
                path.addLines(points)
                path.closeSubpath()
                context.fill(path, with: .color(color))
                context.stroke(path, with: .color(outline), lineWidth: lineWidth)
            }
            polygon([CGPoint(x: 24, y: 42), CGPoint(x: 138, y: 42), CGPoint(x: 182, y: 53), CGPoint(x: 138, y: 65), CGPoint(x: 24, y: 65)], color: hull)
            polygon([CGPoint(x: 43, y: 42), CGPoint(x: 30, y: 26), CGPoint(x: 60, y: 42)], color: blue)
            polygon([CGPoint(x: 43, y: 65), CGPoint(x: 30, y: 81), CGPoint(x: 60, y: 65)], color: blue)
            let engine = Path(CGRect(x: 18, y: 44, width: 12, height: 19))
            context.fill(engine, with: .color(asphalt))
            context.stroke(engine, with: .color(outline), lineWidth: 3)
            context.fill(Path(CGRect(x: 110, y: 43, width: 10, height: 21)), with: .color(blue))
            let window = Path(roundedRect: CGRect(x: 76, y: 48, width: 13, height: 10), cornerRadius: 4)
            context.fill(window, with: .color(glass))
            context.stroke(window, with: .color(outline), lineWidth: 2)
            if tier >= 2 {
                polygon([CGPoint(x: 91, y: 30), CGPoint(x: 129, y: 30), CGPoint(x: 129, y: 42), CGPoint(x: 91, y: 42)], color: blue)
            }
            if tier >= 3 {
                polygon([CGPoint(x: 91, y: 65), CGPoint(x: 129, y: 65), CGPoint(x: 129, y: 77), CGPoint(x: 91, y: 77)], color: blue)
            }
        }
        .accessibilityHidden(true)
    }
}
