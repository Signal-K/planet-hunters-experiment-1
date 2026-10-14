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
        ControlStation.build(player: store.player, signals: signals, bodyId: bodyId)
    }

    var body: some View {
        ScreenFrame(title: "Control Station", back: { store.go(.hub) }) {
            let m = model
            StationSummary(model: m)
            StationMap(model: m).coachTarget("station-map")
            filters(m).coachTarget("station-filters")
            if let empty = m.emptyLabel { Panel { Text(empty).foregroundStyle(Theme.textDim) } }
            ForEach(m.groups) { group in
                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow(text: group.label)
                    ForEach(group.rows) { row in rowView(row) }
                }
            }
            SkyBadgeRow(badges: store.player.badges)
        }
        .helpable(.instrumentHub)
    }

    private func filters(_ m: ControlStation.Model) -> some View {
        HStack(spacing: 8) {
            ForEach(m.filters, id: \.id) { f in
                let on = f.id == m.activeBodyId
                Button { bodyId = f.id } label: {
                    Text(f.label.uppercased()).font(AppFont.display(14)).tracking(1.2)
                        .padding(.horizontal, 16).frame(minHeight: 44)
                        .foregroundStyle(on ? Color.white : Theme.ink)
                        .background(on ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1.5))
                }.buttonStyle(.plain)
            }
            Spacer(minLength: 0)
        }
    }

    private func rowView(_ row: ControlStation.Row) -> some View {
        Panel(accent: row.live ? Theme.teal : Theme.paper2) {
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(row.name).font(AppFont.display(16)).foregroundStyle(Theme.ink)
                    HStack(spacing: 6) {
                        Circle().fill(row.live ? Theme.teal : Theme.textMuted).frame(width: 8, height: 8)
                        Text(row.status).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    }
                    Text(row.projects.joined(separator: " · ")).font(AppFont.body(14)).foregroundStyle(Theme.textMuted)
                }
                Spacer(minLength: 0)
                if let signal = row.open {
                    Button { open(signal) } label: {
                        Text("OPEN").font(AppFont.display(14)).tracking(1.4).foregroundStyle(.white)
                            .padding(.horizontal, 18).frame(minHeight: 44)
                            .background(Theme.blue, in: RoundedRectangle(cornerRadius: 8))
                    }.buttonStyle(.plain).accessibilityLabel("Open \(row.name)")
                }
            }
        }
    }

    private func open(_ s: InstrumentSignal) {
        switch s.kind {
        case .transit: store.go(.galaxy)
        case .deepSpace: store.go(.asteroidDiscovery)
        case .saturn: store.go(.saturnStormSearch)
        }
    }
}

/// Live numbers make the station read as an operations room before a row is opened.
private struct StationSummary: View {
    let model: ControlStation.Model
    private var rows: [ControlStation.Row] { model.groups.flatMap(\.rows) }
    var body: some View {
        let live = rows.filter(\.live).count
        let ready = rows.reduce(0) { $0 + $1.readyCount }
        let projects = Set(rows.flatMap(\.projects)).count
        HStack(spacing: 8) {
            tile("INSTRUMENTS", "\(live)/\(rows.count)", live > 0 ? "ONLINE" : "STANDBY")
            tile("QUEUE", "\(ready)", ready > 0 ? "READY" : "CLEAR")
            tile("PROJECTS", "\(projects)", "LINKED")
        }.accessibilityElement(children: .combine).accessibilityLabel("\(live) of \(rows.count) instruments online, \(ready) queued frames, \(projects) projects linked")
    }
    private func tile(_ label: String, _ value: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(AppFont.display(11, "Bold")).tracking(0.8).foregroundStyle(Theme.textMuted)
            Text(value).font(AppFont.mono(18)).foregroundStyle(Theme.ink)
            Text(detail).font(AppFont.display(10, "Bold")).tracking(0.7).foregroundStyle(Theme.teal)
        }.padding(9).frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 1.25))
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
                    ctx.fill(Path(ellipseIn: CGRect(x: c.x - 11, y: c.y - 11, width: 22, height: 22)), with: .color(Theme.teal))
                    ctx.draw(Text("\(m.readyCount)").font(AppFont.display(14)).foregroundStyle(.white), at: c)
                } else {
                    ctx.fill(Path(ellipseIn: CGRect(x: c.x - 5, y: c.y - 5, width: 10, height: 10)), with: .color(Theme.paper))
                    ctx.stroke(Path(ellipseIn: CGRect(x: c.x - 5, y: c.y - 5, width: 10, height: 10)), with: .color(Theme.ink), lineWidth: 2)
                }
            }
        }
        .frame(height: 256).frame(maxWidth: .infinity)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 1.5))
        .accessibilityHidden(true)
    }
}
