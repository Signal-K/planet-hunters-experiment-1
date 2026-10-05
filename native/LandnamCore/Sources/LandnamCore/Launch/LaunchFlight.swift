import Foundation

/// Port of web `lib/pixi/launchTimeline.ts` + `launchCamera.ts`. Same constants, same curves,
/// so the native cinematic lines up beat for beat with the web one.
public enum LaunchTimeline {
    public static let countdownStart = 0.0
    public static let ignitionStart = 2.6
    public static let liftoff = 3.5
    public static let boosterSep = 6.4
    public static let stageSep = 8.2
    public static let upperAtmos = 9.4
    public static let blackout = 10.6
    public static let orbit = 11.2
    public static let departureBurn = 12.8
    public static let fadeOut = 14.2
    public static let done = 15.0

    /// Longest single frame the scene will simulate, so a hitch cannot skip the cinematic.
    public static func frameDt(_ rawDt: Double) -> Double {
        guard rawDt.isFinite, rawDt > 0 else { return 0 }
        return min(0.05, rawDt)
    }
}

public struct LaunchPadLayout: Equatable, Sendable {
    public let isLandscape: Bool
    public let groundTop: Double      // y-down, from the top of the view
    public let groundHeight: Double
    public let padDeckY: Double
    public let rocketScale: Double
    public let rocketHeight: Double
    public let followStart: Double

    /// Authored stack height in author units (engine exit at 0, nose at -H).
    public static let authorHeight = 248.0

    public init(width w: Double, height h: Double) {
        isLandscape = w > h
        groundHeight = isLandscape ? max((h * 0.32).rounded(), 140) : max((h * 0.18).rounded(), 96)
        groundTop = h - groundHeight
        padDeckY = groundTop + (groundHeight * 0.18).rounded()
        rocketHeight = min(isLandscape ? h * 0.40 : h * 0.30, 210)
        rocketScale = rocketHeight / Self.authorHeight
        followStart = h * (isLandscape ? 0.30 : 0.44)
    }
}

public enum LaunchFlight {
    static let accelDuration = 3.2
    static let vMax = 220.0

    /// World-space altitude in points after liftoff. 0 while on the pad.
    public static func altitude(at elapsed: Double) -> Double {
        guard elapsed >= LaunchTimeline.liftoff else { return 0 }
        let t = elapsed - LaunchTimeline.liftoff
        if t <= accelDuration { return vMax * pow(t / accelDuration, 2) * t / 3 }
        return vMax * accelDuration / 3 + vMax * (t - accelDuration)
    }

    /// Camera stays put until the rocket has flown a fraction of the view, then tracks at 55%.
    public static func cameraY(altitude: Double, followStart: Double) -> Double {
        max(0, (altitude - followStart) * 0.55)
    }

    /// Vertical speed in points per second (derivative of `altitude`).
    public static func speed(at elapsed: Double) -> Double {
        guard elapsed >= LaunchTimeline.liftoff else { return 0 }
        let t = elapsed - LaunchTimeline.liftoff
        return t <= accelDuration ? vMax * pow(t / accelDuration, 2) : vMax
    }

    /// 0 on the ground, 1 in space: drives sky colour and star fade.
    public static func skyProgress(altitude: Double) -> Double { min(1, max(0, altitude / 1800)) }
}

public enum LaunchEvent: String, Equatable, Sendable {
    case countdown, ignition, liftoff, boosterSeparation, stageSeparation, upperAtmosphere, blackout, orbit, departureBurn, complete

    public var label: String {
        switch self {
        case .countdown: "Countdown"
        case .ignition: "Ignition"
        case .liftoff: "Liftoff"
        case .boosterSeparation: "Booster separation"
        case .stageSeparation: "Stage separation"
        case .upperAtmosphere: "Upper atmosphere"
        case .blackout: "Comms blackout"
        case .orbit: "Parking orbit"
        case .departureBurn: "Departure burn"
        case .complete: "Away"
        }
    }
}

/// What the flight HUD shows at a moment in the cinematic.
public struct LaunchTelemetry: Equatable, Sendable {
    public let event: LaunchEvent
    public let clock: String       // "T-02" before liftoff, "T+07" after
    public let altitudeKm: Int
    public let speedMs: Int
    public let progress: Double    // 0...1 across the whole cinematic

    public init(elapsed: Double) {
        let marks: [(Double, LaunchEvent)] = [
            (LaunchTimeline.countdownStart, .countdown), (LaunchTimeline.ignitionStart, .ignition),
            (LaunchTimeline.liftoff, .liftoff), (LaunchTimeline.boosterSep, .boosterSeparation),
            (LaunchTimeline.stageSep, .stageSeparation), (LaunchTimeline.upperAtmos, .upperAtmosphere),
            (LaunchTimeline.blackout, .blackout), (LaunchTimeline.orbit, .orbit),
            (LaunchTimeline.departureBurn, .departureBurn), (LaunchTimeline.done, .complete),
        ]
        event = marks.last { elapsed >= $0.0 }?.1 ?? .countdown
        let rel = elapsed - LaunchTimeline.liftoff
        let secs = Int(abs(rel).rounded(.down))
        clock = (rel < 0 ? "T-" : "T+") + String(format: "%02d", secs)
        let alt = LaunchFlight.altitude(at: elapsed)
        altitudeKm = Int(alt / 6)
        speedMs = Int(LaunchFlight.speed(at: elapsed) * 24)
        progress = min(1, max(0, elapsed / LaunchTimeline.done))
    }
}
