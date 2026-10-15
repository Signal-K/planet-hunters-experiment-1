import SwiftUI
import LandnamCore

/// Shared world data from the bundle: `shared/scenes` and `shared/layout` (web reads the same files).
enum WorldAssets {
    private static func data(_ name: String) -> Data? {
        Bundle.main.url(forResource: name, withExtension: "json").flatMap { try? Data(contentsOf: $0) }
    }
    static let scene: WorldScene? = data("base-world").flatMap { try? WorldScene.load($0) }
    static let calendar: WorldSkyCalendar? = data("sky-events").flatMap { try? WorldSkyCalendar.load($0) }
    static let site: BaseSiteMap? = data("base-site").flatMap { try? BaseSiteMap.load($0) }

    /// Local-time grade, as web `worldTimeForHour`. `-landnam.time <grade>` overrides it for previews.
    static func grade(_ date: Date = Date()) -> String {
        let forced = UserDefaults.standard.string(forKey: "landnam.time") ?? ProcessInfo.processInfo.environment["LANDNAM_TIME"]
        if let forced, site?.sky.grades[forced] != nil { return forced }
        switch Calendar.current.component(.hour, from: date) {
        case 5..<8: return "dawn"
        case 8..<11: return "morning"
        case 11..<14: return "midday"
        case 14..<17: return "afternoon"
        case 17..<20: return "dusk"
        default: return "night"
        }
    }

    /// `-landnam.sky storm,launch` forces sky events and weather for previews (web `?sky=`).
    static var forcedSky: [String] {
        (UserDefaults.standard.string(forKey: "landnam.sky") ?? ProcessInfo.processInfo.environment["LANDNAM_SKY"] ?? "").split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }
}

/// Holds the running world between frames (a reference so the Canvas closure can step it).
@MainActor
final class WorldRunner {
    var world: World?
    var carry = 0.0
    var last: Date?
    var sky: WorldSky?
    var skyAt = Date.distantPast
    /// Parsed hex colours; the canvas asks for the same few dozen every frame.
    static var colors: [String: Color] = [:]

    /// The landscape the world was built for; a different one rebuilds it (its own horizon, plants and drifts).
    var biome = ""

    func world(for biome: String) {
        guard biome != self.biome, let scene = WorldAssets.scene else { return }
        self.biome = biome
        world = World(scene: scene, biome: biome)
        sky = nil
    }
}

/// The base world (SSL-423): every background piece is an entity from `base-world.json`, stepped by the shared
/// world sim and drawn in layer order with camera parallax; sky events spawn their own objects. Mirrors web
/// `BaseWorldCanvas.tsx`. Structures and controls are SwiftUI views on top.
struct BaseWorldCanvas: View {
    /// Points per kit unit.
    var px: CGFloat
    /// Camera pan in screen points (negative as the view moves right along the strip) and zoom.
    var camX: CGFloat
    var zoom: CGFloat = 1
    var biome: String
    var grade: String = WorldAssets.grade()
    @State private var runner = WorldRunner()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        // 30 fps is plenty for drifting clouds and weather and halves the full-screen redraw cost (60 fps on a large
        // Mac window was the main source of lag). The sky gradient covers every pixel, so the canvas is opaque.
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: false)) { timeline in
            Canvas(opaque: true) { g, size in
                step(now: timeline.date, size: size)
                draw(&g, size: size, t: timeline.date.timeIntervalSinceReferenceDate)
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func step(now: Date, size: CGSize) {
        runner.world(for: biome)
        guard runner.world != nil, let site = WorldAssets.site, let cal = WorldAssets.calendar else { return }
        let dt = min(0.1, runner.last.map { now.timeIntervalSince($0) } ?? 0)
        runner.last = now
        if runner.sky == nil || now.timeIntervalSince(runner.skyAt) > 1 {
            runner.sky = WorldSkyClock.sky(cal, at: now, grade: grade, biome: biome, force: WorldAssets.forcedSky)
            runner.skyAt = now
        }
        let view = WorldView(w: size.width / px, h: size.height * (1 - site.ground.lineFromBottom) / px, camX: camX, px: px)
        // Step in place: copying the world out and back each frame duplicated the entity array every frame.
        if let sky = runner.sky { runner.world!.applySky(sky, view: view, dt: reduceMotion ? 0 : dt) }
        if !reduceMotion { runner.carry = runner.world!.advance(dt, carry: runner.carry) }
    }

    private func draw(_ g: inout GraphicsContext, size: CGSize, t: Double) {
        guard let world = runner.world, let site = WorldAssets.site, let grade = site.sky.grades[grade] else { return }
        let w = size.width, h = size.height
        let groundY = h * (1 - site.ground.lineFromBottom)
        g.fill(Path(CGRect(x: 0, y: 0, width: w, height: h)), with: .linearGradient(
            Gradient(stops: [.init(color: color(grade.top), location: 0), .init(color: color(grade.mid), location: 0.55), .init(color: color(grade.horizon), location: 1)]),
            startPoint: .zero, endPoint: CGPoint(x: 0, y: groundY)))
        // Below the ground line the paving continues past the ground image.
        g.fill(Path(CGRect(x: 0, y: groundY, width: w, height: h - groundY)), with: .color(color(site.ground.deep)))
        if grade.stars > 0 { drawStars(&g, w: w, groundY: groundY, alpha: grade.stars, t: t) }
        drawLuminary(&g, grade: grade, sky: runner.sky, w: w, groundY: groundY)
        let overcast = runner.sky.map { $0.weather.kind == "rain" || $0.weather.kind == "storm" } ?? false
        let storm = runner.sky?.weather.kind == "storm"
        for e in world.entities.sorted(by: { ($0.def.layer ?? 0) < ($1.def.layer ?? 0) }) {
            let depth = CGFloat(e.def.depth ?? 1)
            let screen = e.def.sky == true
            let z = screen ? 1 : zoom
            let sx = camX * depth + CGFloat(e.x) * px * z
            let sy = groundY * z - CGFloat(e.y) * px * z + (screen ? groundY * (1 - z) : 0)
            let cloud = e.def.sprite?.hasPrefix("cloud") == true
            var layer = g
            layer.opacity = e.alpha * (cloud ? grade.clouds * (runner.sky?.weather.clouds ?? 1) : 1)
            if cloud && overcast { layer.addFilter(.brightness(storm ? -0.45 : -0.22)) }
            if let name = e.def.sprite, let s = world.scene.sprites[name] {
                drawSprite(&layer, s, e, sx: sx, sy: sy, k: px * z * CGFloat(e.scale))
            } else {
                drawShape(&layer, e, sx: sx, sy: sy, k: px * z, groundY: groundY, w: w, t: t)
            }
        }
        if grade.shade > 0 {
            var shade = g
            shade.blendMode = .multiply
            shade.opacity = grade.shade
            shade.fill(Path(CGRect(x: 0, y: 0, width: w, height: h)), with: .color(color(grade.top)))
        }
        if world.flash > 0 {
            var flash = g
            flash.opacity = world.flash * 0.28
            flash.fill(Path(CGRect(x: 0, y: 0, width: w, height: h)), with: .color(color("#f2f6ff")))
        }
    }

    private func drawSprite(_ g: inout GraphicsContext, _ s: WorldScene.SpriteDef, _ e: WorldEntity, sx: CGFloat, sy: CGFloat, k: CGFloat) {
        guard let img = Art.drawable(s.src) else { return }
        let rect = CGRect(x: CGFloat(s.x0) * k, y: -CGFloat(s.v0 + s.h) * k, width: CGFloat(s.w) * k, height: CGFloat(s.h) * k)
        var c = g
        c.translateBy(x: sx, y: sy)
        if e.heading != 0 { c.rotate(by: .radians(e.heading)) }
        c.draw(img.resizable(), in: rect)
    }

    private func drawShape(_ g: inout GraphicsContext, _ e: WorldEntity, sx: CGFloat, sy: CGFloat, k: CGFloat, groundY: CGFloat, w: CGFloat, t: Double) {
        let d = e.def
        let fill = color(d.colour ?? "#ffffff")
        let speed = max(hypot(e.vx, e.vy), 1)
        switch d.shape {
        case "streak", "line":
            let len = CGFloat(d.length ?? 10) * k
            let end = CGPoint(x: sx - CGFloat(e.vx / speed) * len, y: sy + CGFloat(e.vy / speed) * len)
            var p = Path(); p.move(to: CGPoint(x: sx, y: sy)); p.addLine(to: end)
            g.stroke(p, with: .linearGradient(Gradient(colors: [fill, fill.opacity(0)]), startPoint: CGPoint(x: sx, y: sy), endPoint: end),
                     style: StrokeStyle(lineWidth: max(1, CGFloat(d.width ?? 1) * (d.shape == "streak" ? 1.4 : 1)), lineCap: .round))
            if d.shape == "streak" { g.fill(Path(ellipseIn: CGRect(x: sx - 1.6, y: sy - 1.6, width: 3.2, height: 3.2)), with: .color(fill)) }
        case "puff", "dot":
            let r = max(0.8, CGFloat(d.radius ?? 1) * k * CGFloat(e.scale))
            g.fill(Path(ellipseIn: CGRect(x: sx - r, y: sy - r, width: r * 2, height: r * 2)), with: .color(fill))
            if d.shape == "dot" {
                let halo = CGFloat(d.radius ?? 1) * k * 2.4
                g.fill(Path(ellipseIn: CGRect(x: sx - halo, y: sy - halo, width: halo * 2, height: halo * 2)), with: .color(fill.opacity(0.35)))
            }
        case "bolt":
            let bottom = groundY - 56 * k
            var x = sx, y = sy
            var s = e.seed * 1000
            var p = Path(); p.move(to: CGPoint(x: x, y: y))
            while y < bottom {
                s = (s * 9301 + 49297).truncatingRemainder(dividingBy: 233280)
                x += CGFloat(s / 233280 - 0.5) * 18
                y += 10 + CGFloat(s / 233280) * 10
                p.addLine(to: CGPoint(x: x, y: min(y, bottom)))
            }
            var glow = g
            glow.addFilter(.shadow(color: color("#cfe0ff"), radius: 6))
            glow.stroke(p, with: .color(fill), lineWidth: CGFloat(d.width ?? 2))
        case "bank":
            let bw = 260 * k, bh = CGFloat(d.height ?? 20) * k
            g.fill(Path(CGRect(x: sx - bw / 2, y: sy - bh, width: bw, height: bh)), with: .linearGradient(
                Gradient(colors: [fill.opacity(0), fill]), startPoint: CGPoint(x: 0, y: sy - bh), endPoint: CGPoint(x: 0, y: sy)))
        case "ribbon":
            let top = sy - CGFloat(d.height ?? 40) * k
            for i in 0..<46 {
                let x = CGFloat(i) / 45 * w
                let wave = CGFloat(sin(Double(i) * 0.35 + t * 0.4 + e.seed * 6)) * 12 * k / 2
                g.fill(Path(CGRect(x: x, y: top + wave, width: w / 45 + 1, height: sy - top)), with: .linearGradient(
                    Gradient(stops: [.init(color: color("#a078dc").opacity(0), location: 0), .init(color: color("#7fe0c8").opacity(0.55), location: 0.45), .init(color: color("#7fe0c8").opacity(0), location: 1)]),
                    startPoint: CGPoint(x: 0, y: top + wave), endPoint: CGPoint(x: 0, y: sy + wave)))
            }
        case "comet":
            let len = CGFloat(d.length ?? 40) * k
            let end = CGPoint(x: sx + len, y: sy - len * 0.35)
            var p = Path(); p.move(to: CGPoint(x: sx, y: sy)); p.addLine(to: end)
            g.stroke(p, with: .linearGradient(Gradient(colors: [fill.opacity(0.9), fill.opacity(0)]), startPoint: CGPoint(x: sx, y: sy), endPoint: end), lineWidth: 3)
            let r = CGFloat(d.radius ?? 2) * k / 2 + 1
            g.fill(Path(ellipseIn: CGRect(x: sx - r, y: sy - r, width: r * 2, height: r * 2)), with: .color(fill))
        default:
            break
        }
    }

    private func drawStars(_ g: inout GraphicsContext, w: CGFloat, groundY: CGFloat, alpha: Double, t: Double) {
        var s: Int64 = 7
        for i in 0..<90 {
            s = (s * 16807) % 2147483647
            let x = CGFloat(s % 10000) / 10000 * w
            s = (s * 16807) % 2147483647
            let y = CGFloat(s % 10000) / 10000 * groundY * 0.72
            let tw = 0.6 + 0.4 * sin(t * 1.7 + Double(i))
            let size: CGFloat = i % 7 == 0 ? 2 : 1.2
            g.fill(Path(CGRect(x: x, y: y, width: size, height: size)), with: .color(color("#f4f8fb").opacity(alpha * tw * (i % 5 == 0 ? 1 : 0.6))))
        }
    }

    private func drawLuminary(_ g: inout GraphicsContext, grade: BaseSiteMap.Grade, sky: WorldSky?, w: CGFloat, groundY: CGFloat) {
        let x = CGFloat(grade.luminary.x) * w, y = CGFloat(grade.luminary.y) * groundY
        let sun = grade.luminary.kind == "sun"
        let r = (sun ? 7 : 5) * px
        let solar = sky?.events.contains { $0.kind == .eclipseSolar } ?? false
        let lunar = sky?.events.contains { $0.kind == .eclipseLunar } ?? false
        let disc = color(!sun && lunar ? "#b5674f" : "#fbf8ef")
        g.fill(Path(ellipseIn: CGRect(x: x - r * 1.7, y: y - r * 1.7, width: r * 3.4, height: r * 3.4)), with: .color(disc.opacity(0.25)))
        g.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)), with: .color(disc))
        if sun && solar {
            g.fill(Path(ellipseIn: CGRect(x: x + r * 0.18 - r * 0.98, y: y - r * 0.08 - r * 0.98, width: r * 1.96, height: r * 1.96)), with: .color(color("#1b2433")))
        }
        if !sun && !lunar {
            g.fill(Path(ellipseIn: CGRect(x: x + r * 0.45 - r * 0.9, y: y - r * 0.2 - r * 0.9, width: r * 1.8, height: r * 1.8)), with: .color(color(grade.top)))
        }
    }

    private func color(_ hex: String) -> Color {
        if let hit = WorldRunner.colors[hex] { return hit }
        let c = Theme.hex(UInt32(hex.dropFirst(), radix: 16) ?? 0xffffff)
        WorldRunner.colors[hex] = c
        return c
    }
}
