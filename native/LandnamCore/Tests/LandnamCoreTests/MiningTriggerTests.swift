import Testing
@testable import LandnamCore

struct MiningTriggerTests {
    @Test func aTapDuringCooldownSurvivesRelease() {
        var trigger = MiningTrigger()
        trigger.setHeld(true)
        let first = trigger.step(at: 0)
        #expect(first)
        trigger.setHeld(false)
        trigger.setHeld(true); trigger.setHeld(false)
        let early = trigger.step(at: 0.1)
        #expect(!early)
        #expect(trigger.charging(at: 0.2))
        let buffered = trigger.step(at: MiningTrigger.cooldown)
        #expect(buffered)
        let duplicate = trigger.step(at: MiningTrigger.cooldown + 0.1)
        #expect(!duplicate)
    }
    @Test func holdingRepeatsButEarlyRequestsNeverEmitImpactShots() {
        var trigger = MiningTrigger()
        trigger.setHeld(true)
        let first = trigger.step(at: 1)
        #expect(first)
        for tick in 1...40 {
            let early = trigger.step(at: 1 + Double(tick) / 100)
            #expect(!early)
        }
        let repeatShot = trigger.step(at: 1.5)
        #expect(repeatShot)
        trigger.cancelInput()
        let cancelled = trigger.step(at: 5)
        #expect(!cancelled)
    }
    @Test func directCanvasPressesUseTheSameCooldown() {
        var trigger = MiningTrigger()
        trigger.request()
        let first = trigger.step(at: 1)
        #expect(first)
        trigger.request(); trigger.request()
        let early = trigger.step(at: 1.1)
        #expect(!early)
        let buffered = trigger.step(at: 1.5)
        #expect(buffered)
        let duplicate = trigger.step(at: 2)
        #expect(!duplicate)
    }
}
