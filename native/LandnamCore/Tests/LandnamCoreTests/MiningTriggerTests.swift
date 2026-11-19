import Testing
@testable import LandnamCore

struct MiningTriggerTests {
    @Test func aTapDuringCooldownSurvivesRelease() {
        var trigger = MiningTrigger()
        trigger.setHeld(true)
        #expect(trigger.step(at: 0))
        trigger.setHeld(false)
        trigger.setHeld(true); trigger.setHeld(false)
        #expect(!trigger.step(at: 0.1))
        #expect(trigger.charging(at: 0.2))
        #expect(trigger.step(at: MiningTrigger.cooldown))
        #expect(!trigger.step(at: MiningTrigger.cooldown + 0.1))
    }
    @Test func holdingRepeatsButEarlyRequestsNeverEmitImpactShots() {
        var trigger = MiningTrigger()
        trigger.setHeld(true)
        #expect(trigger.step(at: 1))
        for tick in 1...40 { #expect(!trigger.step(at: 1 + Double(tick) / 100)) }
        #expect(trigger.step(at: 1.5))
        trigger.cancelInput()
        #expect(!trigger.step(at: 5))
    }
    @Test func directCanvasPressesUseTheSameCooldown() {
        var trigger = MiningTrigger()
        trigger.request(); #expect(trigger.step(at: 1))
        trigger.request(); trigger.request()
        #expect(!trigger.step(at: 1.1))
        #expect(trigger.step(at: 1.5))
        #expect(!trigger.step(at: 2))
    }
}
