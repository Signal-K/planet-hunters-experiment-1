import XCTest

/// The Exchange dock opens as its own scene with crates on the belt and a sell pad.
@MainActor final class MarketSceneTests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testExchangeSceneShowsCratesAndSellPad() {
        let app = XCUIApplication()
        app.launchArguments = ["-scene", "coach-exchange-landscape", "-landnam.orientation", "landscape"]
        app.launch()

        XCTAssertTrue(app.buttons["exchange-crate-iron"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.otherElements["exchange-francs"].exists || app.staticTexts["exchange-francs"].exists)
    }
}
