import Foundation

/// What is in the sky over the base at a local time (SSL-423), from `shared/scenes/sky-events.json`.
/// Port of web `lib/world/sky-calendar.ts`: real calendar entries use real dates, the rest are deterministic
/// per local date from the shared salt, so web and native show the same sky.
public struct WorldSkyCalendar: Decodable, Sendable {
    public struct Shower: Decodable, Sendable { public let id, name, start, peak, end: String; public let perMinute, spreadDays: Double }
    public struct Eclipse: Decodable, Sendable { public let id, kind, date, name: String }
    public struct Planet: Decodable, Sendable { public let id, name, from, to: String; public let grades: [String]; public let x, y: Double }
    public struct Satellites: Decodable, Sendable { public let passesPerNight: Int; public let seconds: Double; public let grades: [String] }
    public struct Launches: Decodable, Sendable { public let chancePerDay: Double; public let fromHour, toHour: Double; public let seconds: Double; public let name: String }
    public struct Balloons: Decodable, Sendable { public let hours: [Double]; public let seconds: Double; public let name: String }
    public struct WeatherKind: Decodable, Sendable {
        public let id: String; public let weight: Double; public let wind: [Double]; public let clouds: Double
        public let rainPerSecond: Double?; public let boltEvery: Double?; public let onlyGrades: [String]?
    }
    public struct Weather: Decodable, Sendable { public let blockHours: Int; public let kinds: [WeatherKind] }
    public struct BiomeOdds: Decodable, Sendable {
        public let weather: [String: Double]
        /// "snow" in the tundra: precipitation falls as snow.
        public let precip: String?
        /// Desert: wind over 6 raises dust.
        public let dust: Bool?
    }
    public struct Aurora: Decodable, Sendable { public let chancePerNight, tundraChancePerNight: Double; public let grades: [String] }
    public struct Comets: Decodable, Sendable { public let bucketDays: Int; public let chancePerBucket: Double; public let days: Int; public let grades: [String] }

    public let salt: String
    public let meteorShowers: [Shower]
    public let eclipses: [Eclipse]
    public let planets: [Planet]
    public let satellites: Satellites
    public let launches: Launches
    public let balloons: Balloons
    public let weather: Weather
    public let biomes: [String: BiomeOdds]
    public let aurora: Aurora
    public let comets: Comets

    public static func load(_ data: Data) throws -> WorldSkyCalendar { try JSONDecoder().decode(WorldSkyCalendar.self, from: data) }
}

public enum WorldSkyKind: String, Sendable { case meteors, eclipseSolar = "eclipse-solar", eclipseLunar = "eclipse-lunar", planet, satellite, launch, balloon, aurora, comet }

public struct WorldSkyEvent: Sendable, Equatable {
    public var id: String
    public var kind: WorldSkyKind
    public var name: String
    public var perMinute: Double?
    public var elapsed: Double?
    public var x: Double?
    public var y: Double?
}

public struct WorldWeather: Sendable, Equatable {
    public var kind: String
    /// "rain" or "snow" (tundra).
    public var precip: String = "rain"
    /// Wind lifts dust off the desert.
    public var dust: Bool = false
    public var wind: Double
    public var clouds: Double
    public var rainPerSecond: Double
    public var boltEvery: Double
}

public struct WorldSky: Sendable, Equatable {
    public var events: [WorldSkyEvent]
    public var weather: WorldWeather
}

public enum WorldSkyClock {
    static let dayMs = 86_400_000.0

    static func dateKey(_ d: Date, _ cal: Calendar) -> String {
        let c = cal.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    static func localMidnightMs(_ y: Int, _ m: Int, _ d: Int, _ cal: Calendar) -> Double {
        cal.date(from: DateComponents(year: y, month: m, day: d))!.timeIntervalSince1970 * 1000
    }

    /// Days from `d` to month-day `md` (MM-DD) in the nearest year, signed (web `daysToMonthDay`).
    static func daysToMonthDay(_ d: Date, _ md: String, _ cal: Calendar) -> Double {
        let parts = md.split(separator: "-").compactMap { Int($0) }
        let c = cal.dateComponents([.year, .month, .day], from: d)
        let today = localMidnightMs(c.year!, c.month!, c.day!, cal)
        var best = Double.infinity
        for y in [c.year! - 1, c.year!, c.year! + 1] {
            let diff = (localMidnightMs(y, parts[0], parts[1], cal) - today) / dayMs
            if abs(diff) < abs(best) { best = diff }
        }
        return best
    }

    /// Apply a landscape (web `landWeather`): tundra precipitation is snow with no lightning; desert wind over 6 raises dust.
    static func landWeather(_ w: WorldWeather, _ land: WorldSkyCalendar.BiomeOdds?) -> WorldWeather {
        var out = w
        let snow = land?.precip == "snow"
        out.precip = snow ? "snow" : "rain"
        if snow { out.boltEvery = 0 }
        out.dust = (land?.dust ?? false) && abs(w.wind) > 6
        return out
    }

    static func pickWeather(_ data: WorldSkyCalendar, _ d: Date, grade: String, biome: String, _ cal: Calendar) -> WorldWeather {
        let w = data.weather
        let block = cal.component(.hour, from: d) / w.blockHours
        var rng = WorldRandom(key: "\(data.salt):weather:\(dateKey(d, cal)):\(block)")
        let allowed = w.kinds.filter { $0.onlyGrades == nil || $0.onlyGrades!.contains(grade) }
        let odds = data.biomes[biome]?.weather ?? [:]
        func weight(_ k: WorldSkyCalendar.WeatherKind) -> Double { k.weight * (odds[k.id] ?? 1) }
        let total = allowed.reduce(0) { $0 + weight($1) }
        var roll = rng.next() * total
        var kind = allowed[0]
        for k in allowed {
            roll -= weight(k)
            if roll < 0 { kind = k; break }
        }
        let sign: Double = rng.next() < 0.7 ? 1 : -1
        return landWeather(WorldWeather(kind: kind.id, wind: sign * rng.range(kind.wind[0], kind.wind[1]), clouds: kind.clouds, rainPerSecond: kind.rainPerSecond ?? 0, boltEvery: kind.boltEvery ?? 0), data.biomes[biome])
    }

    /// The sky at a local time. `force` (dev previews) adds events and weather by kind.
    public static func sky(_ data: WorldSkyCalendar, at now: Date, grade: String, biome: String, force: [String] = [], calendar cal: Calendar = .current) -> WorldSky {
        var events: [WorldSkyEvent] = []
        let key = dateKey(now, cal)
        let night = ["dusk", "night", "dawn"].contains(grade)
        let hms = cal.dateComponents([.hour, .minute, .second], from: now)
        let secondsToday = Double(hms.hour! * 3600 + hms.minute! * 60 + hms.second!)

        for s in data.meteorShowers {
            let toStart = daysToMonthDay(now, s.start, cal), toEnd = daysToMonthDay(now, s.end, cal)
            guard toStart <= 0, toEnd >= 0, toEnd - toStart <= 60 else { continue }
            let perMinute = s.perMinute * exp(-abs(daysToMonthDay(now, s.peak, cal)) / s.spreadDays)
            if night && perMinute >= 0.5 { events.append(WorldSkyEvent(id: s.id, kind: .meteors, name: s.name, perMinute: perMinute)) }
        }
        for e in data.eclipses where e.date == key {
            if e.kind == "solar" && !night { events.append(WorldSkyEvent(id: e.id, kind: .eclipseSolar, name: e.name)) }
            if e.kind == "lunar" && grade == "night" { events.append(WorldSkyEvent(id: e.id, kind: .eclipseLunar, name: e.name)) }
        }
        for p in data.planets where key >= p.from && key <= p.to && p.grades.contains(grade) {
            events.append(WorldSkyEvent(id: p.id, kind: .planet, name: p.name, x: p.x, y: p.y))
        }
        if data.satellites.grades.contains(grade) {
            var rng = WorldRandom(key: "\(data.salt):satellites:\(key)")
            for i in 0..<data.satellites.passesPerNight {
                let start = rng.next() < 0.6 ? rng.range(18 * 3600, 23 * 3600) : rng.range(4 * 3600, 6.5 * 3600)
                let elapsed = secondsToday - start
                if elapsed >= 0 && elapsed < data.satellites.seconds { events.append(WorldSkyEvent(id: "satellite-\(key)-\(i)", kind: .satellite, name: "Satellite pass", elapsed: elapsed)) }
            }
        }
        do {
            let l = data.launches
            var rng = WorldRandom(key: "\(data.salt):launch:\(key)")
            if rng.next() < l.chancePerDay {
                let elapsed = secondsToday - rng.range(l.fromHour * 3600, l.toHour * 3600)
                if elapsed >= 0 && elapsed < l.seconds { events.append(WorldSkyEvent(id: "launch-\(key)", kind: .launch, name: l.name, elapsed: elapsed)) }
            }
        }
        for hour in data.balloons.hours {
            let elapsed = secondsToday - hour * 3600
            if elapsed >= 0 && elapsed < data.balloons.seconds { events.append(WorldSkyEvent(id: "balloon-\(key)-\(Int(hour))", kind: .balloon, name: data.balloons.name, elapsed: elapsed)) }
        }
        if data.aurora.grades.contains(grade) {
            let chance = biome == "tundra" ? data.aurora.tundraChancePerNight : data.aurora.chancePerNight
            let evening = (hms.hour ?? 0) < 12 ? now.addingTimeInterval(-86_400) : now
            var rng = WorldRandom(key: "\(data.salt):aurora:\(dateKey(evening, cal))")
            if rng.next() < chance { events.append(WorldSkyEvent(id: "aurora-\(dateKey(evening, cal))", kind: .aurora, name: "Aurora")) }
        }
        if data.comets.grades.contains(grade) {
            let c = data.comets
            let comps = cal.dateComponents([.year, .month, .day], from: now)
            let dayOfEpoch = Int(floor(localMidnightMs(comps.year!, comps.month!, comps.day!, cal) / dayMs))
            let bucket = Int(floor(Double(dayOfEpoch) / Double(c.bucketDays)))
            var rng = WorldRandom(key: "\(data.salt):comet:\(bucket)")
            if rng.next() < c.chancePerBucket {
                let first = bucket * c.bucketDays + Int(floor(rng.range(0, Double(c.bucketDays - c.days))))
                if dayOfEpoch >= first && dayOfEpoch < first + c.days { events.append(WorldSkyEvent(id: "comet-\(bucket)", kind: .comet, name: "Comet")) }
            }
        }
        var weather = pickWeather(data, now, grade: grade, biome: biome, cal)
        for f in force {
            switch f {
            case "meteors": events.append(WorldSkyEvent(id: "forced-meteors", kind: .meteors, name: "Meteor shower", perMinute: 30))
            case "launch": events.append(WorldSkyEvent(id: "forced-launch", kind: .launch, name: data.launches.name, elapsed: 0))
            case "balloon": events.append(WorldSkyEvent(id: "forced-balloon", kind: .balloon, name: data.balloons.name, elapsed: 0))
            case "satellite": events.append(WorldSkyEvent(id: "forced-satellite", kind: .satellite, name: "Satellite pass", elapsed: 0))
            case "aurora": events.append(WorldSkyEvent(id: "forced-aurora", kind: .aurora, name: "Aurora"))
            case "comet": events.append(WorldSkyEvent(id: "forced-comet", kind: .comet, name: "Comet"))
            case "eclipse": events.append(WorldSkyEvent(id: "forced-eclipse", kind: night ? .eclipseLunar : .eclipseSolar, name: "Eclipse"))
            case "venus": events.append(WorldSkyEvent(id: "forced-venus", kind: .planet, name: "Venus", x: 0.78, y: 0.62))
            default: break
            }
            if let k = data.weather.kinds.first(where: { $0.id == f }) {
                weather = landWeather(WorldWeather(kind: k.id, wind: (k.wind[0] + k.wind[1]) / 2, clouds: k.clouds, rainPerSecond: k.rainPerSecond ?? 0, boltEvery: k.boltEvery ?? 0), data.biomes[biome])
            }
        }
        return WorldSky(events: events, weather: weather)
    }
}
