import Foundation

/// The base world as game objects (SSL-423): entities from `base-world.json`, fixed-step physics (velocity,
/// acceleration, gravity, drag, wind, ground collision, lifetimes, emitters, wrap) and sky-event spawners.
/// A line-for-line port of web `lib/world/world-sim.ts`; `WorldSimTests` replays `world-fixture.json`.
public struct WorldEntity: Sendable, Identifiable {
    public var id: String
    public var def: WorldScene.EntityDef
    public var x: Double, y: Double, vx: Double, vy: Double
    public var heading: Double
    public var scale: Double
    public var alpha: Double
    public var age: Double
    public var floor: Double
    public var emitClock: Double
    public var event: String?
    public var seed: Double
}

public struct WorldView: Sendable {
    /// View size in kit units.
    public var w: Double, h: Double
    /// Camera pan in screen points and points per kit unit.
    public var camX: Double, px: Double
    public init(w: Double, h: Double, camX: Double = 0, px: Double = 2) { self.w = w; self.h = h; self.camX = camX; self.px = px }

    /// Strip x that shows at a fraction across the view for an object at `depth` (parallax).
    public func stripX(_ frac: Double, depth: Double) -> Double { (frac * w * px - camX * depth) / px }
}

public struct World: Sendable {
    public let scene: WorldScene
    public var entities: [WorldEntity] = []
    public var time: Double = 0
    public var wind: Double = 0
    public var rng: WorldRandom
    public var nextId = 0
    public var activeEvents: Set<String> = []
    public var spawnClock: [String: Double] = [:]
    public var flash: Double = 0
    public var sky: WorldSky?

    /// A world for one landscape: the common entities (paving, clouds) plus that landscape's own set.
    public init(scene: WorldScene, seedKey: String = "base", biome: String = "mountains") {
        self.scene = scene
        rng = WorldRandom(key: seedKey)
        let land = scene.biomes[biome] ?? scene.biomes["mountains"] ?? []
        for def in scene.entities + land { entities.append(make(def)) }
    }

    public struct Over {
        public var x: Double?, y: Double?, vx: Double?, vy: Double?, floor: Double?, event: String?
        public init(x: Double? = nil, y: Double? = nil, vx: Double? = nil, vy: Double? = nil, floor: Double? = nil, event: String? = nil) {
            self.x = x; self.y = y; self.vx = vx; self.vy = vy; self.floor = floor; self.event = event
        }
    }

    mutating func make(_ def: WorldScene.EntityDef, _ o: Over = Over()) -> WorldEntity {
        nextId += 1
        let seed = rng.next()
        return WorldEntity(
            id: def.id ?? "e\(nextId)", def: def,
            x: o.x ?? def.x ?? 0, y: o.y ?? def.y ?? 0,
            vx: o.vx ?? def.body?.vx ?? 0, vy: o.vy ?? def.body?.vy ?? 0,
            heading: 0, scale: def.scale ?? 1, alpha: def.alpha ?? 1, age: 0,
            floor: o.floor ?? scene.physics.groundY, emitClock: 0, event: o.event, seed: seed)
    }

    @discardableResult
    public mutating func spawn(_ prefab: String, _ o: Over = Over()) -> String? {
        guard let def = scene.prefabs[prefab] else { return nil }
        let e = make(def, o)
        entities.append(e)
        return e.id
    }

    /// One fixed physics step for every body.
    public mutating func stepBodies(_ dt: Double) {
        let physics = scene.physics
        var survivors: [WorldEntity] = []
        var born: [WorldEntity] = []
        for var e in entities {
            guard let b = e.def.body else { survivors.append(e); continue }
            e.age += dt
            if let life = b.life, e.age >= life { continue }
            if let p = b.pitch, p != 0 { e.heading += p * dt }
            let thrust = b.ay ?? 0
            let pitched = (b.pitch ?? 0) != 0
            let ax = (b.ax ?? 0) + (pitched ? sin(e.heading) * thrust : 0)
            let ay = (pitched ? cos(e.heading) * thrust : thrust) + physics.gravity * (b.gravity ?? 0)
            e.vx += ax * dt
            e.vy += ay * dt
            if let w = b.wind, w != 0 { e.vx += (wind * physics.windScale * w - e.vx) * min(1, dt * 0.5) }
            if let d = b.drag, d != 0 {
                let k = exp(-d * dt)
                e.vx *= k
                e.vy *= k
            }
            e.x += e.vx * dt
            e.y += e.vy * dt
            if let g = b.grow, g != 0 { e.scale += g * dt }
            if b.fade == true, let life = b.life, life != 0 { e.alpha = (e.def.alpha ?? 1) * max(0, 1 - e.age / life) }
            if let wrap = e.def.wrap, wrap.count == 2 {
                if e.x > wrap[1] { e.x = wrap[0] } else if e.x < wrap[0] { e.x = wrap[1] }
            }
            if let ground = b.ground, ground != "none", e.y <= e.floor {
                if ground == "splash" {
                    if let s = scene.prefabs["splash"] { born.append(make(s, Over(x: e.x, y: e.floor, event: e.event))) }
                    continue
                }
                if ground == "stop" { e.y = e.floor; e.vx = 0; e.vy = 0 }
                if ground == "bounce" { e.y = e.floor; e.vy = -e.vy * (b.bounce ?? 0.4) }
            }
            if let emit = e.def.emit {
                e.emitClock += dt
                while e.emitClock >= emit.every {
                    e.emitClock -= emit.every
                    if let child = scene.prefabs[emit.prefab] { born.append(make(child, Over(x: e.x, y: e.y, event: e.event))) }
                }
            }
            survivors.append(e)
        }
        entities = survivors + born
    }

    /// Advance by `dt` seconds in fixed steps; returns the leftover for the next frame.
    @discardableResult
    public mutating func advance(_ dt: Double, carry: Double = 0) -> Double {
        var acc = carry + min(dt, 0.25)
        let step = scene.physics.fixedStep
        while acc >= step {
            stepBodies(step)
            time += step
            acc -= step
        }
        return acc
    }

    /// Spawns and retires event objects for the current sky (web `applySky`).
    public mutating func applySky(_ sky: WorldSky, view: WorldView, dt: Double) {
        self.sky = sky
        wind = sky.weather.wind
        var live = Set(sky.events.map(\.id))
        if sky.weather.kind == "fog" {
            live.insert("weather-fog")
            if !entities.contains(where: { $0.event == "weather-fog" }) {
                for f in [0.15, 0.5, 0.85] { let y = 8 + rng.range(0, 10); spawn("fog", Over(x: view.stripX(f, depth: 0.6), y: y, event: "weather-fog")) }
            }
        }
        entities = entities.filter { e in e.event == nil || live.contains(e.event!) || e.def.shape == "streak" || e.def.shape == "puff" }
        for ev in sky.events {
            if !activeEvents.contains(ev.id) {
                activeEvents.insert(ev.id)
                startEvent(ev, view: view)
            }
            if ev.kind == .meteors, let perMinute = ev.perMinute {
                emitAtRate("m:\(ev.id)", perSecond: perMinute / 60, dt: dt) { w in
                    let angle = (w.rng.next() < 0.5 ? -1.0 : 1.0) * w.rng.range(0.35, 0.75)
                    let speed = w.rng.range(160, 240)
                    let x = w.rng.range(0, view.w), y = w.rng.range(view.h * 0.55, view.h * 0.95)
                    w.spawn("meteor", Over(x: x, y: y, vx: sin(angle) * speed, vy: -cos(angle) * speed, event: ev.id))
                }
            }
        }
        activeEvents = activeEvents.filter { live.contains($0) }
        let weather = sky.weather
        let snow = weather.precip == "snow"
        if weather.rainPerSecond > 0 {
            emitAtRate("rain", perSecond: weather.rainPerSecond * (snow ? 0.6 : 1), dt: dt) { w in
                let x = view.stripX(w.rng.range(-0.05, 1.05), depth: 0.9)
                let floor = w.rng.range(-36, 4)
                w.spawn(snow ? "snowflake" : "raindrop", Over(x: x, y: view.h, vy: snow ? -14 : -150, floor: floor))
            }
        }
        if weather.dust {
            emitAtRate("dust", perSecond: 8, dt: dt) { w in
                let x = view.stripX(w.rng.range(-0.1, 0.9), depth: 0.7)
                let y = w.rng.range(0, 28)
                w.spawn("dust", Over(x: x, y: y, vx: weather.wind))
            }
        }
        if weather.boltEvery > 0 {
            emitAtRate("bolt", perSecond: 1 / weather.boltEvery, dt: dt) { w in
                w.spawn("bolt", Over(x: view.stripX(w.rng.range(0.1, 0.9), depth: 0.1), y: view.h * 0.62))
                w.flash = 1
            }
        }
        flash = max(0, flash - dt * 5)
    }

    private mutating func emitAtRate(_ key: String, perSecond: Double, dt: Double, _ make: (inout World) -> Void) {
        var c = (spawnClock[key] ?? rng.next() / perSecond) - dt
        var guardCount = 0
        while c <= 0 && guardCount < 50 {
            make(&self)
            c += -log(1 - rng.next() * 0.999) / perSecond
            guardCount += 1
        }
        spawnClock[key] = c
    }

    private mutating func startEvent(_ ev: WorldSkyEvent, view: WorldView) {
        let t = ev.elapsed ?? 0
        switch ev.kind {
        case .launch:
            if let id = spawn("far-rocket", Over(x: view.stripX(0.74, depth: 0.15), y: 56, event: ev.id)), t > 0 { fastForward(id, seconds: min(t, 60), step: 0.1) }
        case .balloon:
            if let id = spawn("balloon", Over(x: view.stripX(0.62, depth: 0.5), y: 26, event: ev.id)), t > 0 { fastForward(id, seconds: min(t, 200), step: 0.25) }
        case .satellite:
            let seconds = 70.0
            spawn("satellite", Over(x: (t / seconds) * view.w, y: view.h * 0.86, vx: view.w / seconds, vy: -view.h * 0.002, event: ev.id))
        case .aurora:
            entities.append(make(WorldScene.EntityDef(shape: "ribbon", colour: "#7fe0c8", layer: 2, alpha: 0.5, height: 46), Over(x: 0, y: view.h * 0.62, event: ev.id)))
        case .comet:
            entities.append(make(WorldScene.EntityDef(shape: "comet", colour: "#eef6ff", layer: 3, length: 46, radius: 2.2), Over(x: view.w * 0.3, y: view.h * 0.82, event: ev.id)))
        case .planet:
            entities.append(make(WorldScene.EntityDef(shape: "dot", colour: "#fff7de", layer: 3, radius: 1.8), Over(x: view.w * (ev.x ?? 0.7), y: view.h * (ev.y ?? 0.6), event: ev.id)))
        default:
            break
        }
    }

    /// Advance one body alone (an event that started before the player looked).
    private mutating func fastForward(_ id: String, seconds: Double, step: Double) {
        guard let index = entities.firstIndex(where: { $0.id == id }) else { return }
        let saved = entities
        entities = [saved[index]]
        var s = 0.0
        while s < seconds { stepBodies(step); s += step }
        let result = entities
        entities = saved
        if let alive = result.first(where: { $0.id == id }) { entities[index] = alive } else { entities.remove(at: index) }
        entities += result.filter { $0.id != id }
    }
}
