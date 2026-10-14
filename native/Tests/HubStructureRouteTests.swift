import Testing
import LandnamCore

@Test func surfaceSiloEntersBuildFlow() {
    #expect(Screen.hubStructureDestination("surface-silo") == .build)
}

@Test func exchangeRemainsASeparateDestination() {
    #expect(Screen.hubStructureDestination("market") == nil)
}
