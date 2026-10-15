import XCTest

/// A stale Exchange scene request must fall back to the Base while the feature is deferred.
@MainActor final class MarketSceneTests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    func testDeferredExchangeSceneReturnsToBase() {
        let app = XCUIApplication()
        app.launchArguments = ["-scene", "coach-exchange-landscape", "-landnam.orientation", "landscape"]
        app.launch()

        XCTAssertTrue(app.buttons["Build"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["exchange-crate-iron"].exists)
        XCTAssertFalse(app.buttons["sell-all-btn"].exists)
    }
}
