import XCTest
@testable import LandnamCore

final class HomeDeliveryTests: XCTestCase {
    func testDefaultSplitFillsClientThenSiloInIdOrderThenSell() {
        let split = HomeDelivery.defaultSplit(["platinum": 10, "nickel": 2], demand: ["platinum": 8], siloFree: 3)
        XCTAssertEqual(split["platinum"], .init(client: 8, silo: 1, sell: 1))
        XCTAssertEqual(split["nickel"], .init(client: 0, silo: 2, sell: 0))
        XCTAssertTrue(HomeDelivery.fulfilled(split, demand: ["platinum": 8]))
    }
    func testShiftRespectsDemandAndSiloRoom() {
        var split = HomeDelivery.defaultSplit(["platinum": 4], demand: ["platinum": 2], siloFree: 0)
        XCTAssertEqual(split["platinum"], .init(client: 2, silo: 0, sell: 2))
        split = HomeDelivery.shift(split, id: "platinum", to: .client, demand: ["platinum": 2], siloFree: 0)
        XCTAssertEqual(split["platinum"]?.client, 2)
        split = HomeDelivery.shift(split, id: "platinum", to: .silo, demand: ["platinum": 2], siloFree: 0)
        XCTAssertEqual(split["platinum"]?.silo, 0)
        split = HomeDelivery.release(split, id: "platinum", from: .client, siloFree: 0)
        XCTAssertEqual(split["platinum"], .init(client: 1, silo: 0, sell: 3))
        XCTAssertFalse(HomeDelivery.fulfilled(split, demand: ["platinum": 2]))
    }
}
