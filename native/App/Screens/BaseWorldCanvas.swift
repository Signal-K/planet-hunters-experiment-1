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
    /// When the scene first drew with every sprite decoded; nil until then.
    var revealStart: Date?
    private var preloaded = false

    func world(for biome: String) {
        guard biome != self.biome, let scene = WorldAssets.scene else { return }
        self.biome = biome
        world = World(scene: scene, biome: biome)
        sky = nil
    }

    /// Decodes every sprite the world can draw before the first frame, so the scene appears as one piece.
    func preload() {
        guard !preloaded, let scene = WorldAssets.scene else { return }
        preloaded = true
        for src in Set(scene.sprites.values.map(\.src)) { _ = Art.drawable(src) }
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
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        // 30 fps is plenty for drifting clouds and weather and halves the full-screen redraw cost (60 fps on a large
        // Mac window was the main source of lag). The sky gradient covers every pixel, so the canvas is opaque.
        TimelineView(.animation(minimumInterval: 1.0 / 6, paused: reduceMotion || scenePhase != .active)) { timeline in
            Canvas(opaque: true) { g, size in
                step(now: timeline.date, size: size)
                draw(&g, size: size, t: timeline.date.timeIntervalSinceReferenceDate)
            }
        }
        .drawingGroup()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func step(now: Date, size: CGSize) {
        runner.world(for: biome)
        runner.preload()
        if runner.revealStart == nil { runner.revealStart = now }
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
        guard let world = runner.world, let site = WorldAssets.site, let base = site.sky.grades[grade] else { return }
        let (grade, gloom) = weatherGrade(base, kind: runner.sky?.weather.kind ?? "clear")
        let reveal = reduceMotion ? 1 : min(1, Date().timeIntervalSince(runner.revealStart ?? Date()) / Self.revealSeconds)
        let w = size.width, h = size.height
        let groundY = h * (1 - site.ground.lineFromBottom)
        g.fill(Path(CGRect(x: 0, y: 0, width: w, height: h)), with: .linearGradient(
            Gradient(stops: [.init(color: color(grade.top), location: 0), .init(color: color(grade.mid), location: 0.55), .init(color: color(grade.horizon), location: 1)]),
            startPoint: .zero, endPoint: CGPoint(x: 0, y: groundY)))
        // Below the ground line the paving continues past the ground image.
        g.fill(Path(CGRect(x: 0, y: groundY, width: w, height: h - groundY)), with: .color(color(site.ground.deep)))
        if grade.stars > 0 { drawStars(&g, w: w, groundY: groundY, alpha: grade.stars, t: t) }
        drawMilkyWay(&g, w: w, groundY: groundY, stars: grade.stars, t: t)
        drawLuminary(&g, grade: grade, sky: runner.sky, w: w, groundY: groundY, t: t, gloom: gloom)
        drawHorizonGlow(&g, grade: grade, w: w, groundY: groundY, gloom: gloom)
        let overcast = runner.sky.map { $0.weather.kind == "rain" || $0.weather.kind == "storm" } ?? false
        let storm = runner.sky?.weather.kind == "storm"
        for e in (reveal > 0 ? world.entities : []).sorted(by: { ($0.def.layer ?? 0) < ($1.def.layer ?? 0) }) {
            let depth = CGFloat(e.def.depth ?? 1)
            let screen = e.def.sky == true
            let z = screen ? 1 : zoom
            let sx = camX * depth + CGFloat(e.x) * px * z
            let sy = groundY * z - CGFloat(e.y) * px * z + (screen ? groundY * (1 - z) : 0)
            let cloud = e.def.sprite?.hasPrefix("cloud") == true
            var layer = g
            layer.opacity = reveal * e.alpha * (cloud ? grade.clouds * (runner.sky?.weather.clouds ?? 1) : 1)
            if let name = e.def.sprite, let s = world.scene.sprites[name] {
                drawSprite(&layer, s, e, sx: sx, sy: sy, k: px * z * CGFloat(e.scale))
            } else {
                drawShape(&layer, e, sx: sx, sy: sy, k: px * z, groundY: groundY, w: w, t: t)
            }
        }
        if overcast {
            // One tint for the whole sky: a brightness filter per cloud cost an offscreen pass each.
            var dim = g
            dim.opacity = storm ? 0.3 : 0.14
            dim.fill(Path(CGRect(x: 0, y: 0, width: w, height: groundY)), with: .color(color("#101826")))
        }
        if grade.shade > 0 {
            var shade = g
            shade.opacity = grade.shade * 0.6
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
            g.stroke(p, with: .color(fill.opacity(0.35)), lineWidth: CGFloat(d.width ?? 2) + 5)
            g.stroke(p, with: .color(fill), lineWidth: CGFloat(d.width ?? 2))
        case "bank":
            let bw = 260 * k, bh = CGFloat(d.height ?? 20) * k
            g.fill(Path(CGRect(x: sx - bw / 2, y: sy - bh, width: bw, height: bh)), with: .linearGradient(
                Gradient(colors: [fill.opacity(0), fill]), startPoint: CGPoint(x: 0, y: sy - bh), endPoint: CGPoint(x: 0, y: sy)))
        case "ribbon":
            let top = sy - CGFloat(d.height ?? 40) * k
            for i in 0..<24 {
                let x = CGFloat(i) / 23 * w
                let wave = CGFloat(sin(Double(i) * 0.35 + t * 0.4 + e.seed * 6)) * 12 * k / 2
                g.fill(Path(CGRect(x: x, y: top + wave, width: w / 23 + 1, height: sy - top)), with: .linearGradient(
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

    static let revealSeconds = 0.6

    /// How much the weather hides the sky: 0 clear, 1 storm. Drives the gradient, the sun and the stars (web `GLOOM`).
    private static let gloomByKind: [String: Double] = ["clear": 0, "windy": 0.15, "cloudy": 0.45, "fog": 0.5, "rain": 0.8, "storm": 1]

    /// A time-of-day grade after the weather has pulled it toward overcast grey.
    struct Look {
        var top: String, mid: String, horizon: String
        var stars: Double, clouds: Double, shade: Double
        var luminary: BaseSiteMap.Luminary
    }

    private func mixHex(_ a: String, _ b: String, _ k: Double) -> String {
        func n(_ h: String, _ i: Int) -> Double {
            let s = h.index(h.startIndex, offsetBy: 1 + i * 2)
            return Double(Int(h[s..<h.index(s, offsetBy: 2)], radix: 16) ?? 0)
        }
        func c(_ i: Int) -> String { String(format: "%02x", Int((n(a, i) + (n(b, i) - n(a, i)) * k).rounded())) }
        return "#\(c(0))\(c(1))\(c(2))"
    }

    private func weatherGrade(_ g: BaseSiteMap.Grade, kind: String) -> (Look, Double) {
        let gloom = Self.gloomByKind[kind] ?? 0
        var look = Look(top: g.top, mid: g.mid, horizon: g.horizon, stars: g.stars, clouds: g.clouds, shade: g.shade, luminary: g.luminary)
        guard gloom > 0 else { return (look, 0) }
        let k = gloom * 0.75 * (g.shade > 0.3 ? 0.35 : 1)
        look.top = mixHex(g.top, "#667585", k)
        look.mid = mixHex(g.mid, "#8d9aa5", k)
        look.horizon = mixHex(g.horizon, "#b4bcc2", k)
        look.stars = g.stars * (1 - gloom)
        return (look, gloom)
    }

    private func drawStars(_ g: inout GraphicsContext, w: CGFloat, groundY: CGFloat, alpha: Double, t: Double) {
        let tints = ["#f4f8fb", "#cfe0ff", "#fff1d6"]
        var s: Int64 = 7
        for i in 0..<160 {
            s = (s * 16807) % 2147483647
            let x = CGFloat(s % 10000) / 10000 * w
            s = (s * 16807) % 2147483647
            let y = CGFloat(s % 10000) / 10000 * groundY * 0.8
            let bright = i % 11 == 0
            let tw = 0.6 + 0.4 * sin(t * (bright ? 1.1 : 1.7) + Double(i))
            let a = alpha * tw * (bright ? 1 : i % 5 == 0 ? 0.85 : 0.55) * (1 - Double(y / groundY) * 0.7)
            let size: CGFloat = bright ? 2.4 : i % 7 == 0 ? 2 : 1.2
            let c = color(tints[i % 3])
            g.fill(Path(CGRect(x: x, y: y, width: size, height: size)), with: .color(c.opacity(a)))
            if bright {
                g.fill(Path(CGRect(x: x - 4, y: y + size / 2 - 0.4, width: size + 8, height: 0.8)), with: .color(c.opacity(a * 0.35)))
                g.fill(Path(CGRect(x: x + size / 2 - 0.4, y: y - 4, width: 0.8, height: size + 8)), with: .color(c.opacity(a * 0.35)))
            }
        }
    }

    /// A faint diagonal band of dust and unresolved stars, only once the sky is dark.
    private func drawMilkyWay(_ g: inout GraphicsContext, w: CGFloat, groundY: CGFloat, stars: Double, t: Double) {
        guard stars >= 0.6 else { return }
        var c = g
        c.translateBy(x: w * 0.5, y: groundY * 0.3)
        c.rotate(by: .radians(-0.42))
        let len = max(w, groundY) * 0.9
        let band = CGRect(x: -len / 2, y: -groundY * 0.2, width: len, height: groundY * 0.4)
        let edge = Color(red: 190 / 255, green: 205 / 255, blue: 1)
        c.fill(Path(band), with: .linearGradient(
            Gradient(colors: [edge.opacity(0), Color(red: 205 / 255, green: 215 / 255, blue: 1).opacity(0.1 * stars), edge.opacity(0)]),
            startPoint: CGPoint(x: 0, y: band.minY), endPoint: CGPoint(x: 0, y: band.maxY)))
        var s: Int64 = 311
        for i in 0..<70 {
            s = (s * 16807) % 2147483647
            let x = (CGFloat(s % 10000) / 10000 - 0.5) * len
            s = (s * 16807) % 2147483647
            let y = (CGFloat(s % 10000) / 10000 - 0.5) * groundY * 0.22
            c.fill(Path(CGRect(x: x, y: y, width: 1, height: 1)), with: .color(color("#e8eeff").opacity(stars * 0.35 * (0.6 + 0.4 * sin(t * 1.3 + Double(i))))))
        }
    }

    /// Warm (or cool, at night) light pooling on the horizon under the luminary.
    private func drawHorizonGlow(_ g: inout GraphicsContext, grade: Look, w: CGFloat, groundY: CGFloat, gloom: Double) {
        let x = CGFloat(grade.luminary.x) * w
        let night = grade.luminary.kind == "moon"
        let reach = w * (night ? 0.45 : 0.6)
        let inner = night ? Color(red: 160 / 255, green: 185 / 255, blue: 230 / 255).opacity(0.16 * (1 - gloom)) : Color(red: 1, green: 214 / 255, blue: 150 / 255).opacity(0.32 * (1 - gloom))
        g.fill(Path(CGRect(x: 0, y: groundY - reach, width: w, height: reach)), with: .radialGradient(
            Gradient(colors: [inner, Color(red: 1, green: 214 / 255, blue: 150 / 255).opacity(0)]),
            center: CGPoint(x: x, y: groundY), startRadius: 0, endRadius: reach))
    }

    private func drawLuminary(_ g: inout GraphicsContext, grade: Look, sky: WorldSky?, w: CGFloat, groundY: CGFloat, t: Double, gloom: Double) {
        // Behind cloud the disc is a dim smear: no rays, a soft halo, much less light.
        var g = g
        g.opacity = 1 - gloom * 0.85
        let x = CGFloat(grade.luminary.x) * w, y = CGFloat(grade.luminary.y) * groundY
        let sun = grade.luminary.kind == "sun"
        let r = (sun ? 8 : 6) * px
        let solar = sky?.events.contains { $0.kind == .eclipseSolar } ?? false
        let lunar = sky?.events.contains { $0.kind == .eclipseLunar } ?? false
        let low = sun && y > groundY * 0.5
        let core = color(sun ? (low ? "#ffd9a0" : "#fff7dc") : lunar ? "#b5674f" : "#f3f1e6")
        let glow: Color = sun ? (low ? Color(red: 1, green: 170 / 255, blue: 110 / 255) : Color(red: 1, green: 226 / 255, blue: 160 / 255))
            : lunar ? Color(red: 200 / 255, green: 110 / 255, blue: 80 / 255) : Color(red: 190 / 255, green: 210 / 255, blue: 1)

        // Wide atmospheric halo.
        let reach = r * (sun ? 7 : 5)
        g.fill(Path(ellipseIn: CGRect(x: x - reach, y: y - reach, width: reach * 2, height: reach * 2)), with: .radialGradient(
            Gradient(stops: [.init(color: glow.opacity(sun ? 0.5 : 0.28), location: 0.8 / (sun ? 7 : 5) * 1),
                             .init(color: glow.opacity(sun ? 0.16 : 0.09), location: 0.4),
                             .init(color: glow.opacity(0), location: 1)]),
            center: CGPoint(x: x, y: y), startRadius: 0, endRadius: reach))

        if sun && gloom < 0.3 {
            // Slowly turning rays.
            var c = g
            c.translateBy(x: x, y: y)
            c.rotate(by: .radians(t * 0.03))
            for i in 0..<12 {
                c.rotate(by: .radians(.pi / 6))
                let len = r * (i % 2 == 1 ? 2.6 : 3.6)
                var ray = Path()
                ray.move(to: CGPoint(x: r * 0.9, y: -r * 0.1)); ray.addLine(to: CGPoint(x: len, y: 0)); ray.addLine(to: CGPoint(x: r * 0.9, y: r * 0.1))
                c.fill(ray, with: .linearGradient(Gradient(colors: [glow.opacity(0.35), glow.opacity(0)]), startPoint: CGPoint(x: r, y: 0), endPoint: CGPoint(x: len, y: 0)))
            }
        }

        // Disc with limb shading so it reads as a sphere, not a flat circle.
        let rim = color(sun ? (low ? "#f3a56a" : "#f8d98a") : "#c9cdd8")
        let disc = Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2))
        g.fill(disc, with: .radialGradient(Gradient(stops: [.init(color: .white, location: 0), .init(color: core, location: 0.6), .init(color: rim, location: 1)]),
                                           center: CGPoint(x: x - r * 0.25, y: y - r * 0.25), startRadius: r * 0.1, endRadius: r * 1.2))

        if !sun {
            var c = g
            c.clip(to: disc)
            let marks: [(CGFloat, CGFloat, CGFloat)] = [(-0.3, -0.25, 0.32), (0.25, -0.1, 0.24), (-0.05, 0.38, 0.2), (0.4, 0.35, 0.13), (-0.45, 0.2, 0.12)]
            for (mx, my, mr) in marks {
                c.fill(Path(ellipseIn: CGRect(x: x + mx * r - mr * r, y: y + my * r - mr * r, width: mr * r * 2, height: mr * r * 2)), with: .color(Color(red: 120 / 255, green: 128 / 255, blue: 150 / 255).opacity(0.28)))
            }
            for (mx, my, mr) in marks.dropFirst(2) {
                let rr = mr * r * 0.7
                c.stroke(Path(ellipseIn: CGRect(x: x + mx * r - rr, y: y + my * r - rr, width: rr * 2, height: rr * 2)), with: .color(.white.opacity(0.18)), lineWidth: max(0.6, r * 0.04))
            }
            if !lunar {
                // Phase: the unlit side keeps a faint earthshine, so the stars behind it are not erased.
                let rr = r * 0.95
                c.fill(Path(ellipseIn: CGRect(x: x + r * 0.5 - rr, y: y - r * 0.2 - rr, width: rr * 2, height: rr * 2)), with: .color(Color(red: 14 / 255, green: 21 / 255, blue: 40 / 255).opacity(0.84)))
            }
        }
        if sun && solar {
            g.fill(Path(ellipseIn: CGRect(x: x + r * 0.18 - r * 0.98, y: y - r * 0.08 - r * 0.98, width: r * 1.96, height: r * 1.96)), with: .color(color("#1b2433")))
        }
    }

    private func color(_ hex: String) -> Color {
        if let hit = WorldRunner.colors[hex] { return hit }
        let c = Theme.hex(UInt32(hex.dropFirst(), radix: 16) ?? 0xffffff)
        WorldRunner.colors[hex] = c
        return c
    }
}
