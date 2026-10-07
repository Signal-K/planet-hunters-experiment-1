import Foundation

/// Shared optics for every citizen-science classify task (mirrors web
/// lib/instrument-viewport/view.ts, SSL-497). A project supplies a renderer,
/// an answer row and an optional tool; aim, zoom, focus, exposure, stretch and
/// invert all write this one view, whether the player turns a knob or types
/// the matching command.
public struct InstrumentView: Equatable, Sendable {
    public var panX = 0.0, panY = 0.0
    public var zoom = 1.0
    /// 0...1. 0.5 is in focus; either end softens the view.
    public var focus = 0.5
    /// Contrast multiplier. 1 is the downlink as received.
    public var exposure = 1.0
    public var stretch = false
    public var invert = false
    public init() {}
}

public enum InstrumentLimits {
    public static let pan = 0.72, panStep = 0.18
    public static let zoomMin = 1.0, zoomMax = 3.0
    public static let focusMin = 0.0, focusMax = 1.0
    public static let exposureMin = 0.6, exposureMax = 1.8
    public static let stretchScale = 1.7
}

public struct InstrumentOptics: Equatable, Sendable {
    public let panX, panY, zoom, stretch, exposure, blur: Double
    public let invert: Bool
}

public enum AimDirection: Sendable { case north, south, east, west, reset }

public enum Instrument {
    static func clamp(_ v: Double, _ lo: Double, _ hi: Double) -> Double { min(hi, max(lo, v)) }
    static func round2(_ v: Double) -> Double { (v * 100).rounded() / 100 }

    public static func optics(_ v: InstrumentView) -> InstrumentOptics {
        InstrumentOptics(panX: v.panX, panY: v.panY, zoom: v.zoom,
                         stretch: v.stretch ? InstrumentLimits.stretchScale : 1,
                         exposure: v.exposure, blur: round2(abs(v.focus - 0.5) * 8), invert: v.invert)
    }

    public static func nudge(_ v: InstrumentView, _ d: AimDirection) -> InstrumentView {
        var n = v
        let step = InstrumentLimits.panStep, lim = InstrumentLimits.pan
        switch d {
        case .reset: n.panX = 0; n.panY = 0
        case .north: n.panY = clamp(round2(v.panY - step), -lim, lim)
        case .south: n.panY = clamp(round2(v.panY + step), -lim, lim)
        case .east: n.panX = clamp(round2(v.panX + step), -lim, lim)
        case .west: n.panX = clamp(round2(v.panX - step), -lim, lim)
        }
        return n
    }

    public static func zoomed(_ v: InstrumentView, to z: Double) -> InstrumentView {
        var n = v; n.zoom = clamp(round2(z), InstrumentLimits.zoomMin, InstrumentLimits.zoomMax); return n
    }
    public static func focused(_ v: InstrumentView, to f: Double) -> InstrumentView {
        var n = v; n.focus = clamp(round2(f), InstrumentLimits.focusMin, InstrumentLimits.focusMax); return n
    }
    public static func exposed(_ v: InstrumentView, to e: Double) -> InstrumentView {
        var n = v; n.exposure = clamp(round2(e), InstrumentLimits.exposureMin, InstrumentLimits.exposureMax); return n
    }

    public struct CommandResult: Equatable, Sendable {
        public let view: InstrumentView
        public let lines: [String]
    }

    static let helpLines = ["> HELP", "POINT N|S|E|W|RESET", "ZOOM 1-3", "FOCUS 0-100", "EXPOSE 0.6-1.8",
                            "STRETCH ON|OFF", "INVERT ON|OFF", "DOWNLINK"]

    private static func echo(_ command: String, _ detail: String) -> String { detail.isEmpty ? "> \(command)" : "> \(command) \(detail)" }
    private static func onOff(_ s: String) -> Bool? {
        switch s.trimmingCharacters(in: .whitespaces).uppercased() {
        case "ON", "1", "TRUE": true
        case "OFF", "0", "FALSE": false
        default: nil
        }
    }
    private static func num(_ d: Double) -> String { d == d.rounded() ? String(Int(d)) : String(d) }

    /// Parse one command line. Returns nil when it is not a shared command so a project can handle its own verbs.
    public static func apply(_ view: InstrumentView, _ raw: String) -> CommandResult? {
        let line = raw.split(whereSeparator: \.isWhitespace).joined(separator: " ")
        if line.isEmpty { return CommandResult(view: view, lines: []) }
        let parts = line.split(separator: " ", maxSplits: 1).map(String.init)
        let command = parts[0].uppercased(), args = parts.count > 1 ? parts[1] : ""

        switch command {
        case "HELP", "?":
            return CommandResult(view: view, lines: helpLines)
        case "DOWNLINK":
            return CommandResult(view: view, lines: [echo("DOWNLINK", "RECEIVED")])
        case "POINT", "AIM":
            let token = args.uppercased()
            let cardinal: [String: AimDirection] = ["N": .north, "NORTH": .north, "UP": .north, "S": .south, "SOUTH": .south, "DOWN": .south,
                                                    "E": .east, "EAST": .east, "RIGHT": .east, "W": .west, "WEST": .west, "LEFT": .west,
                                                    "RESET": .reset, "CENTER": .reset, "CENTRE": .reset]
            if let d = cardinal[token] { return CommandResult(view: nudge(view, d), lines: [echo("POINT", "\(token)  OK")]) }
            let nums = args.split(separator: " ").compactMap { Double($0) }
            if nums.count == 2, args.split(separator: " ").count == 2 {
                var n = view; let lim = InstrumentLimits.pan
                n.panX = clamp(round2(nums[0]), -lim, lim); n.panY = clamp(round2(nums[1]), -lim, lim)
                return CommandResult(view: n, lines: [echo("POINT", "\(num(n.panX)) \(num(n.panY))  OK")])
            }
            return CommandResult(view: view, lines: [echo("POINT", "USE N S E W OR RESET")])
        case "ZOOM":
            let token = args.uppercased()
            if token == "IN" { return CommandResult(view: zoomed(view, to: view.zoom + 0.25), lines: [echo("ZOOM", "IN  OK")]) }
            if token == "OUT" { return CommandResult(view: zoomed(view, to: view.zoom - 0.25), lines: [echo("ZOOM", "OUT  OK")]) }
            guard let value = Double(args) else { return CommandResult(view: view, lines: [echo("ZOOM", "USE 1-3")]) }
            let n = zoomed(view, to: value)
            return CommandResult(view: n, lines: [echo("ZOOM", "\(num(n.zoom))  OK")])
        case "FOCUS":
            guard let value = Double(args) else { return CommandResult(view: view, lines: [echo("FOCUS", "USE 0-100")]) }
            let n = focused(view, to: value > 1 ? value / 100 : value)
            return CommandResult(view: n, lines: [echo("FOCUS", "\(Int((n.focus * 100).rounded()))  OK")])
        case "EXPOSE", "EXPOSURE":
            let token = args.hasSuffix("s") || args.hasSuffix("S") ? String(args.dropLast()) : args
            guard let value = Double(token) else { return CommandResult(view: view, lines: [echo("EXPOSE", "USE 0.6-1.8")]) }
            let n = exposed(view, to: value)
            return CommandResult(view: n, lines: [echo("EXPOSE", "\(num(n.exposure))  OK")])
        case "STRETCH":
            guard let flag = onOff(args) else { return CommandResult(view: view, lines: [echo("STRETCH", "USE ON OR OFF")]) }
            var n = view; n.stretch = flag
            return CommandResult(view: n, lines: [echo("STRETCH", "\(flag ? "ON" : "OFF")  OK")])
        case "INVERT":
            var n = view
            if args.isEmpty { n.invert.toggle(); return CommandResult(view: n, lines: [echo("INVERT", "\(n.invert ? "ON" : "OFF")  OK")]) }
            guard let flag = onOff(args) else { return CommandResult(view: view, lines: [echo("INVERT", "USE ON OR OFF")]) }
            n.invert = flag
            return CommandResult(view: n, lines: [echo("INVERT", "\(flag ? "ON" : "OFF")  OK")])
        default:
            return nil
        }
    }
}
