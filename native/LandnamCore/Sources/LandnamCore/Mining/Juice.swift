import Foundation

/// Game-feel rules, mirroring web `lib/engine/miningJuice.ts` so both clients feel identical.
public enum Juice {
    public enum HitKind: Sendable { case hit, collect }

    public static func hitStopSeconds(_ kind: HitKind, reducedMotion: Bool) -> Double {
        if reducedMotion { return 0 }
        return kind == .collect ? 0.09 : 0.04
    }

    /// Advances a hit-stop: while frozen the world gets dt 0; leftovers carry into the sim step.
    public static func stepHitStop(remaining: Double, dt: Double) -> (simDt: Double, remaining: Double) {
        guard remaining > 0 else { return (dt, 0) }
        let left = remaining - dt
        return left > 0 ? (0, left) : (-left, 0)
    }

    public static func easeInOutCubic(_ t: Double) -> Double {
        let c = min(1, max(0, t))
        return c < 0.5 ? 4 * c * c * c : 1 - pow(-2 * c + 2, 3) / 2
    }

    /// Recoil offset (points, up is positive here) `t` seconds after a shot; settles to 0.
    public static func recoil(at t: Double, kick: Double = 5, settle: Double = 0.18) -> Double {
        guard t >= 0, t < settle else { return 0 }
        let k = 1 - t / settle
        return kick * k * k
    }
}

/// The rover's horizontal motion: eased drive plus a short, cooled-down dash.
public struct RoverMotion: Equatable, Sendable {
    public static let driveSpeed = 150.0     // points / second at full input
    public static let dashSpeed = 520.0
    public static let dashDuration = 0.16
    public static let dashCooldown = 0.9
    public static let acceleration = 9.0

    public private(set) var x: Double
    public private(set) var velocity = 0.0
    public private(set) var dashRemaining = 0.0
    public private(set) var cooldownRemaining = 0.0
    private var dashDirection = 1.0
    public let minX: Double, maxX: Double

    public var isDashing: Bool { dashRemaining > 0 }
    public var dashReady: Bool { cooldownRemaining <= 0 && !isDashing }
    /// 0...1 recharge fill for the HUD dash button.
    public var dashCharge: Double { dashReady ? 1 : isDashing ? 0 : 1 - cooldownRemaining / Self.dashCooldown }

    public init(x: Double, minX: Double, maxX: Double) {
        self.x = x; self.minX = minX; self.maxX = maxX
    }

    /// `input` is -1...1 (left/right). Returns true when a dash started this call.
    @discardableResult
    public mutating func step(dt: Double, input: Double, wantsDash: Bool) -> Bool {
        var started = false
        if wantsDash && dashReady {
            dashRemaining = Self.dashDuration
            cooldownRemaining = Self.dashCooldown
            dashDirection = input != 0 ? (input > 0 ? 1 : -1) : (velocity >= 0 ? 1 : -1)
            started = true
        }
        if isDashing {
            velocity = dashDirection * Self.dashSpeed
            dashRemaining = max(0, dashRemaining - dt)
        } else {
            let target = max(-1, min(1, input)) * Self.driveSpeed
            velocity += (target - velocity) * min(1, dt * Self.acceleration)
            cooldownRemaining = max(0, cooldownRemaining - dt)
        }
        x = max(minX, min(maxX, x + velocity * dt))
        return started
    }
}
