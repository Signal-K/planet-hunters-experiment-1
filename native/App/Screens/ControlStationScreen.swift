import SwiftUI
import LandnamCore

/// Control room palette (web `--ln-world-*`): hull-white panels, a navy outline, and a night-sky window.
private enum Room {
    static let outline = Theme.hex(0x16293B)
    static let hullLit = Theme.hex(0xFAF7F0)
    static let hull = Theme.hex(0xECE8DF)
    static let hullShade = Theme.hex(0xC9C4B8)
    static let blue = Theme.hex(0x2F6FA8)
    static let teal = Theme.hex(0x2A9AA3)
    static let glass = Theme.hex(0x9FD6E4)
    static let nightTop = Theme.hex(0x0E1528)
    static let nightMid = Theme.hex(0x1A2744)
    static let asphalt = Theme.hex(0x3A404C)
}

/// Control Station: a control room with a window onto the sky above a desk of monitors, one per owned instrument
/// (mirrors web ControlStationBoard, SSL-496 and SSL-611). The window is a SwiftUI Canvas drawn from the same
/// 640x320 diagram data, so markers can't drift from the planets.
struct ControlStationScreen: View {
    @Environment(GameStore.self) private var store
    @State private var bodyId = "all"
    var signals: [InstrumentSignal] = []

    private var model: ControlStation.Model {
        ControlStation.build(player: store.player, signals: signals, bodyId: bodyId, now: store.now)
    }

    var body: some View {
        ScreenFrame(title: "Control Station", back: { store.go(.hub) }, night: true) {
            let m = model
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    WorldSpaceWeekBanner(banner: WorldSpaceWeek.banner(badges: store.player.badges, now: store.now))
                    ScrollView(.horizontal, showsIndicators: false) { WorldSpaceWeekChips(chips: m.skyBadges) }
                }
                StationMap(model: m).coachTarget("station-map")
                filters(m).coachTarget("station-filters")
                desk(m)
            }
            .padding(12)
            .background(LinearGradient(colors: [Room.hullLit, Room.hull], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Room.outline, lineWidth: 2))
            SkyBadgeRow(badges: store.player.badges)
        }
        .helpable(.instrumentHub, firstVisit: true)
    }

    private func filters(_ m: ControlStation.Model) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(m.filters, id: \.id) { f in
                    let on = f.id == m.activeBodyId
                    Button { bodyId = f.id } label: {
                        Text(f.label.uppercased()).font(AppFont.display(14)).tracking(1.4)
                            .padding(.horizontal, 18).frame(minHeight: 48)
                            .foregroundStyle(on ? Room.hullLit : Room.outline)
                            .background(on ? Room.blue : Room.hullLit, in: RoundedRectangle(cornerRadius: 10))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Room.outline, lineWidth: 2))
                    }.buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
                }
            }.padding(2)
        }
    }

    /// The desk: a blue edge band over hull panels, holding one console per instrument.
    private func desk(_ m: ControlStation.Model) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            if let empty = m.emptyLabel { Text(empty).font(AppFont.body(14, "Bold")).foregroundStyle(Room.outline) }
            ForEach(m.groups) { group in
                VStack(alignment: .leading, spacing: 10) {
                    Text(group.label.uppercased()).font(AppFont.display(14)).tracking(1.9).foregroundStyle(Room.outline)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 260), spacing: 12)], spacing: 12) {
                        ForEach(group.rows) { row in console(row) }
                    }
                }
            }
        }
        .padding(.horizontal, 12).padding(.top, 18).padding(.bottom, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LinearGradient(colors: [Room.hull, Room.hullShade], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 12))
        .overlay(alignment: .top) { UnevenRoundedRectangle(topLeadingRadius: 12, topTrailingRadius: 12).fill(Room.blue).frame(height: 8) }
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Room.outline, lineWidth: 2))
    }

    /// One console: a monitor beside a nameplate, a status lamp and a key.
    private func console(_ row: ControlStation.Row) -> some View {
        HStack(alignment: .top, spacing: 12) {
            monitor(row)
            VStack(alignment: .leading, spacing: 6) {
                Text(row.name.uppercased()).font(AppFont.display(16)).tracking(0.6).foregroundStyle(Room.outline).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 8) {
                    Circle().fill(row.live ? Room.teal : Color.clear).frame(width: 12, height: 12)
                        .overlay(Circle().stroke(row.live ? Room.teal : Room.blue, lineWidth: 2))
                        .shadow(color: row.live ? Room.teal : .clear, radius: 3)
                    Text(row.status.uppercased()).font(AppFont.body(14, "Bold")).tracking(0.8).foregroundStyle(Room.outline)
                }
                WorldSpaceWeekChips(chips: row.wsw)
                if !row.projects.isEmpty {
                    ChipFlow(spacing: 6) {
                        ForEach(row.projects, id: \.self) { project in
                            Text(project.uppercased()).font(AppFont.display(14, "Bold")).tracking(0.6).foregroundStyle(Room.outline)
                                .padding(.horizontal, 8).padding(.vertical, 4)
                                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Room.outline, lineWidth: 1))
                        }
                    }
                }
                if row.buildPrompt { key("BUILD", label: "Build \(row.name)", id: "control-station-build") { store.go(.build) } }
                if let signal = row.open { key("OPEN", label: "Open \(row.name)", id: "control-station-open") { open(signal) } }
            }
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Room.hullLit, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Room.outline, lineWidth: 2))
    }

    @ViewBuilder private func monitor(_ row: ControlStation.Row) -> some View {
        ZStack(alignment: .topTrailing) {
            if let signal = row.open {
                EquipmentThumb(kind: signal.kind, count: row.readyCount)
                    .frame(width: 96, height: 96)
            } else {
                Text((row.buildPrompt ? "No signal" : row.live ? "Listening" : "Standby").uppercased())
                    .font(AppFont.display(14)).tracking(0.8).foregroundStyle(Room.glass).multilineTextAlignment(.center)
                    .frame(width: 96, height: 96).background(Room.asphalt)
            }
        }
        .frame(width: 96, height: 96)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Room.outline, lineWidth: 3))
        .padding(3).overlay(RoundedRectangle(cornerRadius: 10).stroke(Room.hullShade, lineWidth: 3))
        .accessibilityHidden(true)
    }

    private func key(_ title: String, label: String, id: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(AppFont.display(14)).tracking(1.7).foregroundStyle(Room.hullLit)
                .padding(.horizontal, 20).frame(minWidth: 96, minHeight: 48)
                .background(Room.blue, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Room.outline, lineWidth: 2))
        }.buttonStyle(.plain).accessibilityLabel(label).accessibilityIdentifier(id)
    }

    private func open(_ s: InstrumentSignal) {
        switch s.kind {
        case .transit: store.go(.galaxy)
        case .deepSpace: store.go(.asteroidDiscovery)
        case .saturn: store.go(.saturnStormSearch)
        }
    }
}

struct StationMap: View {
    let model: ControlStation.Model

    var body: some View {
        Canvas { ctx, size in
            let k = min(size.width / ControlStation.mapWidth, size.height / ControlStation.mapHeight)
            let ox = (size.width - ControlStation.mapWidth * k) / 2, oy = (size.height - ControlStation.mapHeight * k) / 2
            func pt(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: ox + x * k, y: oy + y * k) }
            for (x, y) in [(36, 42), (84, 96), (300, 48), (360, 210), (420, 64), (590, 46), (560, 250), (70, 250)] {
                ctx.fill(Path(ellipseIn: CGRect(x: pt(Double(x), Double(y)).x - 1.5, y: pt(Double(x), Double(y)).y - 1.5, width: 3, height: 3)), with: .color(Room.hullLit.opacity(0.8)))
            }
            for b in model.bodies {
                let c = pt(b.x, b.y), r = b.r * k
                if !b.ringed {
                    ctx.stroke(Path(ellipseIn: CGRect(x: c.x - (r + 40 * k), y: c.y - (r + 40 * k), width: 2 * (r + 40 * k), height: 2 * (r + 40 * k))),
                               with: .color(Room.glass.opacity(0.55)), style: StrokeStyle(lineWidth: 1.5, dash: [5, 7]))
                }
                let disc = Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r))
                ctx.fill(disc, with: .color(b.ringed ? Room.hullShade : Room.blue))
                if b.ringed {
                    ctx.stroke(disc, with: .color(Room.hullLit), lineWidth: 2)
                    var ring = ctx
                    ring.translateBy(x: c.x, y: c.y); ring.rotate(by: .degrees(-18))
                    ring.stroke(Path(ellipseIn: CGRect(x: -r * 1.75, y: -r * 0.42, width: r * 3.5, height: r * 0.84)), with: .color(Room.glass), lineWidth: 3)
                } else {
                    var land = ctx; land.clip(to: disc)
                    land.fill(Path(ellipseIn: CGRect(x: c.x - r * 0.68, y: c.y - r * 0.4, width: r * 0.92, height: r * 0.56)), with: .color(Room.glass))
                    land.fill(Path(ellipseIn: CGRect(x: c.x + r * 0.08, y: c.y - r * 0.14, width: r * 0.4, height: r * 0.68)), with: .color(Room.glass))
                }
                ctx.draw(Text(b.name.uppercased()).font(AppFont.display(14)).foregroundStyle(Room.glass), at: CGPoint(x: c.x, y: c.y + r + 18), anchor: .top)
            }
            for m in model.markers {
                let c = pt(m.x, m.y)
                if m.readyCount > 0 {
                    let badge = Path(ellipseIn: CGRect(x: c.x - 14, y: c.y - 14, width: 28, height: 28))
                    ctx.fill(badge, with: .color(Room.hullLit))
                    ctx.stroke(badge, with: .color(Room.blue), lineWidth: 2)
                    ctx.draw(Text("\(m.readyCount)").font(AppFont.display(14)).foregroundStyle(Room.outline), at: c)
                } else {
                    let dot = Path(ellipseIn: CGRect(x: c.x - 6, y: c.y - 6, width: 12, height: 12))
                    ctx.fill(dot, with: .color(Room.teal))
                    ctx.stroke(dot, with: .color(Room.hullLit), lineWidth: 2)
                }
            }
        }
        .frame(height: 256).frame(maxWidth: .infinity)
        .background(LinearGradient(colors: [Room.nightTop, Room.nightMid], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 12))
        .overlay { HStack { Spacer(); Rectangle().fill(Room.hull.opacity(0.55)).frame(width: 3); Spacer(); Rectangle().fill(Room.hull.opacity(0.55)).frame(width: 3); Spacer() } }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Room.outline, lineWidth: 3))
        .accessibilityHidden(true)
    }
}

/// Instrument thumbnail with its ready count (web `EquipmentPreview` + count badge).
struct EquipmentThumb: View {
    let kind: SignalKind
    let count: Int

    var body: some View {
        Canvas { ctx, size in
            let k = size.width / 48
            func p(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: x * k, y: y * k) }
            func dot(_ x: Double, _ y: Double, _ r: Double) { ctx.fill(Path(ellipseIn: CGRect(x: (x - r) * k, y: (y - r) * k, width: 2 * r * k, height: 2 * r * k)), with: .color(Room.hullLit)) }
            ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Room.nightTop))
            switch kind {
            case .transit:
                var path = Path(); path.move(to: p(4, 24))
                path.addCurve(to: p(18, 24), control1: p(10, 22), control2: p(14, 23))
                path.addCurve(to: p(30, 24), control1: p(22, 18), control2: p(26, 30))
                path.addCurve(to: p(44, 23), control1: p(34, 20), control2: p(38, 22))
                ctx.stroke(path, with: .color(Room.glass), lineWidth: 1.6 * k)
                dot(12, 14, 1.2); dot(34, 12, 1)
            case .saturn:
                let c = p(24, 24)
                var ring = ctx; ring.translateBy(x: c.x, y: c.y); ring.rotate(by: .degrees(-18))
                ring.stroke(Path(ellipseIn: CGRect(x: -16 * k, y: -6 * k, width: 32 * k, height: 12 * k)), with: .color(Room.glass), lineWidth: 2 * k)
                ctx.fill(Path(ellipseIn: CGRect(x: c.x - 8 * k, y: c.y - 8 * k, width: 16 * k, height: 16 * k)), with: .color(Room.hullShade))
            case .deepSpace:
                dot(12, 16, 1.4); dot(28, 12, 1); dot(36, 22, 1.6); dot(18, 30, 1.2); dot(32, 34, 1)
            }
        }
        .frame(width: 96, height: 96)
        .overlay(alignment: .topTrailing) {
            Text("\(count)").font(AppFont.display(14)).foregroundStyle(Room.outline)
                .frame(minWidth: 26, minHeight: 26).padding(.horizontal, 3)
                .background(Room.hullLit, in: Capsule()).overlay(Capsule().stroke(Room.blue, lineWidth: 2))
                .offset(x: -4, y: 4)
        }
        .accessibilityHidden(true)
    }
}
