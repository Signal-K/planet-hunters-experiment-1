import Testing
@testable import LandnamCore

struct LaunchFlightTests {
    @Test func stillOnPadUntilLiftoff() {
        #expect(LaunchFlight.altitude(at: 0) == 0)
        #expect(LaunchFlight.altitude(at: LaunchTimeline.liftoff) == 0)
        #expect(LaunchFlight.altitude(at: LaunchTimeline.liftoff + 1) > 0)
    }

    @Test func altitudeMatchesWebCurve() {
        // web launchCamera.test: accel phase VMAX*(t/3.2)^2*t/3, then linear at VMAX.
        let t = 1.6
        #expect(abs(LaunchFlight.altitude(at: LaunchTimeline.liftoff + t) - 220 * 0.25 * 1.6 / 3) < 1e-9)
        let after = LaunchFlight.altitude(at: LaunchTimeline.liftoff + 5)
        #expect(abs(after - (220 * 3.2 / 3 + 220 * 1.8)) < 1e-9)
    }

    @Test func speedIsAltitudeDerivative() {
        let e = LaunchTimeline.liftoff + 2, h = 1e-4
        let numeric = (LaunchFlight.altitude(at: e + h) - LaunchFlight.altitude(at: e - h)) / (2 * h)
        #expect(abs(numeric - LaunchFlight.speed(at: e)) < 0.01)
    }

    @Test func cameraWaitsThenTracksAtFiftyFivePercent() {
        #expect(LaunchFlight.cameraY(altitude: 100, followStart: 300) == 0)
        #expect(abs(LaunchFlight.cameraY(altitude: 500, followStart: 300) - 110) < 1e-9)
    }

    @Test func layoutDiffersByOrientation() {
        let phone = LaunchPadLayout(width: 390, height: 780)
        let desk = LaunchPadLayout(width: 1000, height: 680)
        #expect(!phone.isLandscape && desk.isLandscape)
        #expect(phone.rocketHeight <= 210 && desk.rocketHeight <= 210)
        #expect(desk.groundHeight >= 140)
    }

    @Test func telemetryTracksTheTimeline() {
        #expect(LaunchTelemetry(elapsed: 1).event == .countdown)
        #expect(LaunchTelemetry(elapsed: 1).clock == "T-02")
        #expect(LaunchTelemetry(elapsed: 3).event == .ignition)
        #expect(LaunchTelemetry(elapsed: 7).event == .boosterSeparation)
        #expect(LaunchTelemetry(elapsed: 7).clock == "T+03")
        #expect(LaunchTelemetry(elapsed: 15).event == .complete)
        #expect(LaunchTelemetry(elapsed: 15).progress == 1)
    }

    @Test func frameDtIsCapped() {
        #expect(LaunchTimeline.frameDt(1) == 0.05)
        #expect(LaunchTimeline.frameDt(-1) == 0)
        #expect(LaunchTimeline.frameDt(.nan) == 0)
    }
}

struct JuiceTests {
    @Test func hitStopMirrorsWeb() {
        #expect(Juice.hitStopSeconds(.collect, reducedMotion: false) > Juice.hitStopSeconds(.hit, reducedMotion: false))
        #expect(Juice.hitStopSeconds(.collect, reducedMotion: true) == 0)
        let a = Juice.stepHitStop(remaining: 0.09, dt: 0.016)
        #expect(a.simDt == 0 && abs(a.remaining - 0.074) < 1e-9)
        let b = Juice.stepHitStop(remaining: 0.01, dt: 0.05)
        #expect(b.remaining == 0 && abs(b.simDt - 0.04) < 1e-9)
    }

    @Test func recoilSettles() {
        #expect(Juice.recoil(at: 0) > 0)
        #expect(Juice.recoil(at: 0.18) == 0)
    }

    @Test func roverAcceleratesAndClamps() {
        var r = RoverMotion(x: 100, minX: 0, maxX: 200)
        for _ in 0..<120 { _ = r.step(dt: 1.0 / 60, input: 1, wantsDash: false) }
        #expect(r.x == 200)
        #expect(r.velocity > 0)
    }

    @Test func dashBurstsThenCoolsDown() {
        var r = RoverMotion(x: 0, minX: -1000, maxX: 1000)
        let started = r.step(dt: 0.016, input: 1, wantsDash: true)
        #expect(started)
        #expect(r.isDashing && r.velocity == RoverMotion.dashSpeed)
        let chained = r.step(dt: 0.016, input: 1, wantsDash: true)
        #expect(!chained)   // can't chain
        for _ in 0..<20 { _ = r.step(dt: 0.016, input: 0, wantsDash: false) }
        #expect(!r.isDashing && !r.dashReady)
        for _ in 0..<80 { _ = r.step(dt: 0.016, input: 0, wantsDash: false) }
        #expect(r.dashReady)
    }

    @Test func dashFollowsFacingWhenNoInput() {
        var r = RoverMotion(x: 0, minX: -1000, maxX: 1000)
        for _ in 0..<30 { _ = r.step(dt: 0.016, input: -1, wantsDash: false) }
        _ = r.step(dt: 0.016, input: 0, wantsDash: true)
        #expect(r.velocity < 0)
    }
}

struct ReachTests {
    @Test func farNodesAreOutOfRangeAndFree() {
        let t = Target(id: "t", name: "T", type: .asteroid, orbit: 2, difficulty: "easy", brief: "", minerals: ["iron"])
        var f = MiningField(target: t, required: ["iron": 1], cargoCapacity: 6, laserTier: 1, seed: 5)
        let n = f.nodes[0]
        let far = n.x < 0.5 ? 1.0 : 0.0
        #expect(f.strike(nodeId: n.id, roverX: far) == .outOfRange)
        #expect(f.charge == f.chargeCap)
        if case .hit = f.strike(nodeId: n.id, roverX: n.x) {} else if case .mined = f.strike(nodeId: n.id, roverX: n.x) {} else { Issue.record("in-range strike should connect") }
    }
}

@Suite struct SpriteChainTests {
    let counts = ["b/ignition": 8, "b/burn": 8, "b/separate": 12, "b/idle": 1]

    @Test func playsChainThenLoopsFinal() {
        let loops: Set<String> = ["b/burn"]
        #expect(SpriteChain.frame(row: "b", names: ["ignition", "burn"], counts: counts, loops: loops, t: 0) == .init(anim: "b/ignition", index: 0))
        #expect(SpriteChain.frame(row: "b", names: ["ignition", "burn"], counts: counts, loops: loops, t: 8.5 / 24) == .init(anim: "b/burn", index: 0))
        #expect(SpriteChain.frame(row: "b", names: ["ignition", "burn"], counts: counts, loops: loops, t: 17.5 / 24) == .init(anim: "b/burn", index: 1))
    }

    @Test func nonLoopingFinalHoldsLastFrame() {
        let f = SpriteChain.frame(row: "b", names: ["separate", "idle"], counts: counts, loops: [], t: 5)
        #expect(f == .init(anim: "b/idle", index: 0))
        #expect(SpriteChain.frame(row: "b", names: ["separate"], counts: counts, loops: [], t: 5) == .init(anim: "b/separate", index: 11))
        #expect(SpriteChain.frame(row: "b", names: ["burn"], counts: counts, loops: [], t: -1) == nil)
    }
}
