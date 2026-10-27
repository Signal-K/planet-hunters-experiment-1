import Foundation
import Testing
@testable import LandnamCore

/// The native base world matches web step for step: `shared/scenes/world-fixture.json` is written by
/// `web/lib/world/world-sim.test.ts` and replayed here.
@Suite struct WorldSimTests {
    static let repo = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../")
    static func shared(_ path: String) throws -> Data { try Data(contentsOf: repo.appendingPathComponent("shared/\(path)").standardized) }
    static func scene() throws -> WorldScene { try WorldScene.load(shared("scenes/base-world.json")) }
    static func calendar() throws -> WorldSkyCalendar { try WorldSkyCalendar.load(shared("scenes/sky-events.json")) }

    struct Fixture: Decodable {
        struct Rng: Decodable { let key: String; let seed: UInt32; let first: [Double] }
        struct Body: Decodable {
            let prefab: String; let over: [String: Double]; let steps: Int; let wind: Double
            let alive: Bool; let x: Double?; let y: Double?; let vx: Double?; let vy: Double?; let count: Int
        }
        let rngs: [Rng]
        let bodies: [Body]
    }

    @Test func randomnessMatchesWeb() throws {
        let fixture = try JSONDecoder().decode(Fixture.self, from: Self.shared("scenes/world-fixture.json"))
        for r in fixture.rngs {
            #expect(worldHashSeed(r.key) == r.seed)
            var rng = WorldRandom(key: r.key)
            for expected in r.first { #expect(abs(rng.next() - expected) < 1e-12) }
        }
    }

    @Test func bodiesStepLikeWeb() throws {
        let fixture = try JSONDecoder().decode(Fixture.self, from: Self.shared("scenes/world-fixture.json"))
        let scene = try Self.scene()
        for c in fixture.bodies {
            var world = World(scene: scene, seedKey: "fixture")
            world.entities = []
            world.wind = c.wind
            let o = c.over
            let id = world.spawn(c.prefab, World.Over(x: o["x"], y: o["y"], vx: o["vx"], vy: o["vy"], floor: o["floor"]))!
            for _ in 0..<c.steps { world.stepBodies(scene.physics.fixedStep) }
            let found = world.entities.first { $0.id == id }
            #expect((found != nil) == c.alive, "\(c.prefab) alive")
            #expect(world.entities.count == c.count, "\(c.prefab) count")
            if let e = found, let x = c.x, let y = c.y, let vx = c.vx, let vy = c.vy {
                #expect(abs(e.x - x) < 1e-6 && abs(e.y - y) < 1e-6, "\(c.prefab) position")
                #expect(abs(e.vx - vx) < 1e-6 && abs(e.vy - vy) < 1e-6, "\(c.prefab) velocity")
            }
        }
    }

    @Test func everyBackgroundPieceIsAnEntity() throws {
        let world = World(scene: try Self.scene())
        let ids = Set(world.entities.map(\.id))
        for id in ["ground", "steppe", "escarpment-far-1", "escarpment-mid-1", "cloud-1"] { #expect(ids.contains(id)) }
        #expect(!world.scene.sprites.keys.contains { $0.contains("mountain") || $0.contains("pine") || $0.contains("tower") })
    }

    @Test func everyLandscapeHasItsOwnFlatHorizon() throws {
        let scene = try Self.scene()
        func sprites(_ biome: String) -> Set<String> { Set(World(scene: scene, biome: biome).entities.compactMap(\.def.sprite)) }
        let want: [String: [String]] = [
            "mountains": ["steppe-plain", "escarpment-a-mid", "tussock-0"],
            "desert": ["plain-desert", "butte-a-far", "dune-ridge-mid", "saxaul", "sand-drift-0"],
            "tundra": ["plain-tundra", "snow-ridge-far", "ice", "snow-drift-0"],
            "coast": ["plain-coast", "headland-far", "coast-dune-ridge-mid", "dune-grass", "sand-drift-1"],
        ]
        for (biome, list) in want {
            let got = sprites(biome)
            for s in list + ["ground-complex", "cloud-0"] { #expect(got.contains(s), "\(biome) \(s)") }
        }
        #expect(!sprites("desert").contains("escarpment-a-mid"))
    }

    @Test func snowsInTheTundraAndRaisesDustInTheDesert() throws {
        let scene = try Self.scene(), cal = try Self.calendar()
        let view = WorldView(w: 463, h: 214)
        let day = Calendar.current.date(from: DateComponents(year: 2026, month: 1, day: 10, hour: 14))!
        var tundra = World(scene: scene, biome: "tundra")
        let snow = WorldSkyClock.sky(cal, at: day, grade: "afternoon", biome: "tundra", force: ["rain"])
        #expect(snow.weather.precip == "snow")
        for _ in 0..<40 { tundra.applySky(snow, view: view, dt: 1 / 20) }
        #expect(tundra.entities.contains { $0.def.shape == "dot" && $0.def.colour == "#f6f9fc" })
        #expect(!tundra.entities.contains { $0.def.shape == "line" })
        var desert = World(scene: scene, biome: "desert")
        let wind = WorldSkyClock.sky(cal, at: day, grade: "afternoon", biome: "desert", force: ["windy"])
        #expect(wind.weather.dust)
        for _ in 0..<40 { desert.applySky(wind, view: view, dt: 1 / 20) }
        #expect(desert.entities.contains { $0.def.colour == "#e8d9b8" })
    }

    @Test func skyEventsBecomeObjectsAndRetire() throws {
        var world = World(scene: try Self.scene())
        let cal = try Self.calendar()
        let view = WorldView(w: 463, h: 214)
        var comps = DateComponents(); comps.year = 2026; comps.month = 10; comps.day = 21; comps.hour = 22
        let night = WorldSkyClock.sky(cal, at: Calendar.current.date(from: comps)!, grade: "night", biome: "mountains", force: ["meteors", "storm", "aurora", "comet"])
        // Forced showers run at 8 a minute, so give a streak time to spawn.
        for _ in 0..<1800 { world.applySky(night, view: view, dt: 1 / 20) }
        for shape in ["streak", "line", "ribbon", "comet"] { #expect(world.entities.contains { $0.def.shape == shape }, "\(shape)") }
        var clear = night
        clear.events = []
        clear.weather.kind = "clear"; clear.weather.rainPerSecond = 0; clear.weather.boltEvery = 0
        world.applySky(clear, view: view, dt: 1 / 20)
        #expect(!world.entities.contains { $0.def.shape == "ribbon" || $0.def.shape == "comet" })
    }

    @Test func weatherDiffersByLandscape() throws {
        let data = try Self.calendar()
        let cal = Calendar.current
        func tally(_ biome: String) -> [String: Int] {
            var out: [String: Int] = [:]
            for day in 0..<400 {
                let d = cal.date(from: DateComponents(year: 2026, month: 1, day: 1 + day, hour: 14))!
                out[WorldSkyClock.sky(data, at: d, grade: "afternoon", biome: biome).weather.kind, default: 0] += 1
            }
            return out
        }
        let mountains = tally("mountains"), desert = tally("desert"), coast = tally("coast"), tundra = tally("tundra")
        #expect(mountains["windy", default: 0] > tundra["windy", default: 0])
        #expect(desert["clear", default: 0] > coast["clear", default: 0])
        #expect(coast["rain", default: 0] + coast["storm", default: 0] > desert["rain", default: 0] + desert["storm", default: 0])
    }

    @Test func realCalendarMatchesWeb() throws {
        let cal = try Self.calendar()
        func at(_ y: Int, _ m: Int, _ d: Int, _ h: Int) -> Date { Calendar.current.date(from: DateComponents(year: y, month: m, day: d, hour: h))! }
        let orionids = WorldSkyClock.sky(cal, at: at(2026, 10, 21, 23), grade: "night", biome: "mountains").events.first { $0.id == "orionids" }
        #expect(abs((orionids?.perMinute ?? 0) - 5) < 1e-9)
        #expect(WorldSkyClock.sky(cal, at: at(2026, 8, 12, 12), grade: "midday", biome: "mountains").events.contains { $0.kind == .eclipseSolar })
        #expect(WorldSkyClock.sky(cal, at: at(2026, 6, 1, 19), grade: "dusk", biome: "mountains").events.contains { $0.id == "venus-evening" })
        let a = WorldSkyClock.sky(cal, at: at(2026, 10, 14, 15), grade: "afternoon", biome: "mountains")
        #expect(a == WorldSkyClock.sky(cal, at: at(2026, 10, 14, 15), grade: "afternoon", biome: "mountains"))
    }
}

/// The site map matches web `base-site.test.ts`: same scale, sites and framing.
@Suite struct BaseSiteTests {
    static func map() throws -> BaseSiteMap { try BaseSiteMap.load(WorldSimTests.shared("layout/base-site.json")) }

    @Test func homeSitesAndScale() throws {
        let m = try Self.map()
        #expect(m.homeSite("launchpad")?.id == "pad")
        #expect(m.homeSite("garage")?.id == "hall")
        #expect(m.homeSite("market")?.id == "exchange")
        #expect(m.homeSite("refinery") == nil)
        #expect(m.scale(w: 390, h: 844) == 1.56)
        #expect(m.scale(w: 926, h: 428) == 1.78)
        #expect(m.scale(w: 1440, h: 900) == 2.77)
    }

    @Test func framesWhatIsBuilt() throws {
        let m = try Self.map()
        #expect(m.homeCenter([], viewUnits: 195) == m.site("pad")!.x)
        for (w, h) in [(390.0, 844.0), (926, 428), (1440, 900)] {
            let units = w / m.scale(w: w, h: h)
            let c = m.homeCenter(["hangar", "launchpad"], viewUnits: units)
            let hall = m.site("hall")!, pad = m.site("pad")!
            #expect(c - units / 2 <= hall.x - hall.half)
            #expect(c + units / 2 >= pad.x + pad.half)
        }
    }

    @Test func sitesNeverOverlap() throws {
        let sites = try Self.map().sites.sorted { $0.x < $1.x }
        for (a, b) in zip(sites, sites.dropFirst()) { #expect(a.x + a.half <= b.x - b.half) }
    }
}
