import Testing
import Foundation
@testable import LandnamCore

@Suite @MainActor struct BiomeTests {
    @Test func biomeAndOneTimeMoveRoundTripWithPlayerSave() throws {
        var state = GameState()
        state.player.earthBiome = "tundra"
        state.player.earthBiomeMoveUsed = true
        let decoded = try JSONDecoder().decode(GameState.self, from: JSONEncoder().encode(state))
        #expect(decoded.player.earthBiome == "tundra")
        #expect(decoded.player.earthBiomeMoveUsed)
    }

    @Test func moveCanBeUsedOnlyOnceAndRejectsUnknownBiomes() {
        let store = GameStore()
        store.setEarthBiome("coast", asMove: true)
        #expect(store.player.earthBiome == "coast")
        #expect(store.player.earthBiomeMoveUsed)
        store.setEarthBiome("desert", asMove: true)
        #expect(store.player.earthBiome == "coast")
        store.setEarthBiome("mars")
        #expect(store.player.earthBiome == "coast")
    }
}
