import SwiftUI
import LandnamCore

/// Control Station: every owned instrument in one place (mirrors web
/// ControlStationBoard, SSL-496). The map is a SwiftUI Canvas drawn from the
/// same 640x320 diagram data, so markers can't drift from the planets.
struct ControlStationScreen: View {
    @Environment(GameStore.self) private var store
    @State private var bodyId = "all"
    var signals: [InstrumentSignal] = []

    private var model: ControlStation.Model {
        ControlStation.build(player: store.player, signals: signals, bodyId: bodyId, now: store.now)
    }

    var body: some View {
        ScreenFrame(title: "Control Station", back: { store.go(.hub) }) {
            let m = model
            WorldSpaceWeekBanner(banner: WorldSpaceWeek.banner(badges: store.player.badges, now: store.now))
            WorldSpaceWeekChips(chips: m.skyBadges)
            StationMap(model: m).coachTarget("station-map")
            filters(m).coachTarget("station-filters")
            if let empty = m.emptyLabel { Text(empty).font(AppFont.body(14, "Bold")).foregroundStyle(Theme.ink) }
            ForEach(m.groups) { group in
                VStack(alignment: .leading, spacing: 8) {
                    Text(group.label.uppercased()).font(AppFont.display(14)).tracking(1.7).foregroundStyle(Theme.ink)
                    ForEach(group.rows) { row in rowView(row) }
                }
            }
            SkyBadgeRow(badges: store.player.badges)
        }
        .helpable(.instrumentHub)
    }

    private func filters(_ m: ControlStation.Model) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(m.filters, id: \.id) { f in
                    let on = f.id == m.activeBodyId
                    Button { bodyId = f.id } label: {
                        Text(f.label.uppercased()).font(AppFont.display(14)).tracking(1.1)
                            .padding(.horizontal, 16).frame(minHeight: 48)
                            .foregroundStyle(on ? Theme.paper : Theme.ink)
                            .background(on ? Theme.ink : Theme.paper, in: Capsule())
                            .overlay(Capsule().stroke(on ? Theme.ink : Theme.border, lineWidth: 1))
                    }.buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
                }
            }
        }
    }

    private func rowView(_ row: ControlStation.Row) -> some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 8) {
                Text(row.name).font(AppFont.display(16)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 8) {
                    RoundedRectangle(cornerRadius: 4).fill(row.live ? Theme.blue : Color.clear).frame(width: 12, height: 12)
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.blue, lineWidth: 2))
                    Text(row.status.uppercased()).font(AppFont.body(14, "Bold")).tracking(0.8).foregroundStyle(Theme.ink)
                }
                WorldSpaceWeekChips(chips: row.wsw)
                if !row.projects.isEmpty {
                    ChipFlow(spacing: 8) {
                        ForEach(row.projects, id: \.self) { project in
                            Text(project.uppercased()).font(AppFont.display(14, "Bold")).tracking(0.6).foregroundStyle(Theme.ink)
                                .padding(.horizontal, 8).padding(.vertical, 4)
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.border, lineWidth: 1))
                        }
                    }
                }
            }
            Spacer(minLength: 0)
            if row.buildPrompt {
                inkButton("BUILD", label: "Build \(row.name)", id: "control-station-build") { store.go(.build) }
            }
            if let signal = row.open {
                EquipmentThumb(kind: signal.kind, count: row.readyCount)
                inkButton("OPEN", label: "Open \(row.name)", id: "control-station-open") { open(signal) }
            }
        }
        .padding(.vertical, 12).padding(.leading, 16).padding(.trailing, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))
    }

    private func inkButton(_ title: String, label: String, id: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.paper)
                .padding(.horizontal, 16).frame(minWidth: 64, minHeight: 48)
                .background(Theme.ink, in: RoundedRectangle(cornerRadius: 8))
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
                ctx.fill(Path(ellipseIn: CGRect(x: pt(Double(x), Double(y)).x - 1.5, y: pt(Double(x), Double(y)).y - 1.5, width: 3, height: 3)), with: .color(Theme.ink.opacity(0.35)))
            }
            for b in model.bodies {
                let c = pt(b.x, b.y), r = b.r * k
                if !b.ringed {
                    ctx.stroke(Path(ellipseIn: CGRect(x: c.x - (r + 40 * k), y: c.y - (r + 40 * k), width: 2 * (r + 40 * k), height: 2 * (r + 40 * k))),
                               with: .color(Theme.ink.opacity(0.45)), style: StrokeStyle(lineWidth: 1.5, dash: [5, 7]))
                }
                let disc = Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r))
                ctx.fill(disc, with: .color(b.ringed ? Theme.paper2 : Theme.blue))
                if b.ringed {
                    ctx.stroke(disc, with: .color(Theme.ink), lineWidth: 2)
                    var ring = ctx
                    ring.translateBy(x: c.x, y: c.y); ring.rotate(by: .degrees(-18))
                    ring.stroke(Path(ellipseIn: CGRect(x: -r * 1.75, y: -r * 0.42, width: r * 3.5, height: r * 0.84)), with: .color(Theme.blue), lineWidth: 3)
                } else {
                    var land = ctx; land.clip(to: disc)
                    land.fill(Path(ellipseIn: CGRect(x: c.x - r * 0.68, y: c.y - r * 0.4, width: r * 0.92, height: r * 0.56)), with: .color(Theme.paper))
                    land.fill(Path(ellipseIn: CGRect(x: c.x + r * 0.08, y: c.y - r * 0.14, width: r * 0.4, height: r * 0.68)), with: .color(Theme.paper))
                }
                ctx.draw(Text(b.name.uppercased()).font(AppFont.display(14)).foregroundStyle(Theme.ink), at: CGPoint(x: c.x, y: c.y + r + 18), anchor: .top)
            }
            for m in model.markers {
                let c = pt(m.x, m.y)
                if m.readyCount > 0 {
                    let badge = Path(ellipseIn: CGRect(x: c.x - 14, y: c.y - 14, width: 28, height: 28))
                    ctx.fill(badge, with: .color(Theme.ink))
                    ctx.stroke(badge, with: .color(Theme.paper), lineWidth: 2)
                    ctx.draw(Text("\(m.readyCount)").font(AppFont.display(14)).foregroundStyle(Theme.paper), at: c)
                } else {
                    let dot = Path(ellipseIn: CGRect(x: c.x - 6, y: c.y - 6, width: 12, height: 12))
                    ctx.fill(dot, with: .color(Theme.paper))
                    ctx.stroke(dot, with: .color(Theme.blue), lineWidth: 2)
                }
            }
        }
        .frame(height: 256).frame(maxWidth: .infinity)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1))
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
            func dot(_ x: Double, _ y: Double, _ r: Double) { ctx.fill(Path(ellipseIn: CGRect(x: (x - r) * k, y: (y - r) * k, width: 2 * r * k, height: 2 * r * k)), with: .color(Theme.paper)) }
            ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Theme.ink))
            switch kind {
            case .transit:
                var path = Path(); path.move(to: p(4, 24))
                path.addCurve(to: p(18, 24), control1: p(10, 22), control2: p(14, 23))
                path.addCurve(to: p(30, 24), control1: p(22, 18), control2: p(26, 30))
                path.addCurve(to: p(44, 23), control1: p(34, 20), control2: p(38, 22))
                ctx.stroke(path, with: .color(Theme.paper), lineWidth: 1.6 * k)
                dot(12, 14, 1.2); dot(34, 12, 1)
            case .saturn:
                let c = p(24, 24)
                var ring = ctx; ring.translateBy(x: c.x, y: c.y); ring.rotate(by: .degrees(-18))
                ring.stroke(Path(ellipseIn: CGRect(x: -16 * k, y: -6 * k, width: 32 * k, height: 12 * k)), with: .color(Theme.blue), lineWidth: 2 * k)
                ctx.fill(Path(ellipseIn: CGRect(x: c.x - 8 * k, y: c.y - 8 * k, width: 16 * k, height: 16 * k)), with: .color(Theme.paper2))
            case .deepSpace:
                dot(12, 16, 1.4); dot(28, 12, 1); dot(36, 22, 1.6); dot(18, 30, 1.2); dot(32, 34, 1)
            }
        }
        .frame(width: 48, height: 48)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))
        .overlay(alignment: .topTrailing) {
            Text("\(count)").font(AppFont.display(14)).foregroundStyle(Theme.paper)
                .frame(minWidth: 24, minHeight: 24).padding(.horizontal, 2)
                .background(Theme.ink, in: Capsule()).overlay(Capsule().stroke(Theme.paper, lineWidth: 1))
                .offset(x: -4, y: 4)
        }
        .accessibilityHidden(true)
    }
}
