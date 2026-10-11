import XCTest

/// Plays the Takeon scene in the simulator: tap a block, mine it, bank, and write
/// screenshots to $TAKEON_SHOTS (default /tmp/takeon-shots) for visual review.
final class TakeonSceneTests: XCTestCase {
    private let dir = ProcessInfo.processInfo.environment["TAKEON_SHOTS"] ?? "/tmp/takeon-shots"

    private func shot(_ name: String) {
        try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        let data = XCUIScreen.main.screenshot().pngRepresentation
        try? data.write(to: URL(fileURLWithPath: "\(dir)/\(name).png"))
        let a = XCTAttachment(data: data, uniformTypeIdentifier: "public.png"); a.name = name; a.lifetime = .keepAlways; add(a)
    }

    func testTapMineAndBank() {
        let app = XCUIApplication()
        app.launchArguments = ["-scene", "takeon-live", "-landnam.orientation", "portrait"]
        app.launch()
        XCTAssertTrue(app.buttons["takeon-dock-action"].waitForExistence(timeout: 10))
        shot("10-start")
        // Tap a block up-field: the floating "Mine here" card must appear.
        let win = app.windows.firstMatch
        win.coordinate(withNormalizedOffset: CGVector(dx: 0.74, dy: 0.50)).tap()
        XCTAssertTrue(app.buttons["takeon-mine-card"].waitForExistence(timeout: 3), "tap-a-block card should appear")
        shot("11-block-selected")
        app.buttons["takeon-mine-card"].tap()
        sleep(1); shot("12-driving-to-block")
        sleep(3); shot("13-mining")
        sleep(5); shot("14-after-mine")
        // Back at base with held yield: the dock offers Bank and banking raises mission progress.
        XCTAssertEqual(app.buttons["takeon-dock-action"].label, "Bank")
        app.buttons["takeon-dock-action"].tap()
        sleep(1); shot("16-banked")
        XCTAssertTrue(app.otherElements["takeon-notice"].waitForExistence(timeout: 2) || app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Banked'")).count > 0)
        // « » turn the heading; the dock's primary action drives one step.
        app.buttons["Turn right"].tap(); app.buttons["Turn left"].tap()
        shot("15-dock")
    }
}
