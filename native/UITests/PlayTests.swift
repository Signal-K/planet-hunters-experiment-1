import XCTest

@MainActor final class PlayTests: XCTestCase {
    let app = XCUIApplication()
    override func setUp() { continueAfterFailure = false }
    func shot(_ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a)
    }
    func dump(_ name: String) {
        let a = XCTAttachment(string: app.debugDescription); a.name = name; a.lifetime = .keepAlways; add(a)
    }

    func testExploreHub() {
        app.launch()
        let begin = app.buttons["BEGIN OPERATIONS"]
        if begin.waitForExistence(timeout: 8) { begin.tap() }
        sleep(3)
        shot("hub"); dump("hub-tree")
    }
}
