import XCTest

/// Drives the real app against a local PocketBase (debug build defaults to localhost:8090/8091).
/// Needs a signed-out simulator: `simctl uninstall` the app and `simctl keychain reset` first.
@MainActor final class AuthFlowTests: XCTestCase {
    let app = XCUIApplication()
    override func setUp() { continueAfterFailure = false }

    func shot(_ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a)
    }

    func enterSlowly(_ value: String, into field: XCUIElement) {
        for character in value {
            field.typeText(String(character))
            usleep(30_000)
        }
    }

    func testCreateAccountOpensTheGame() {
        app.launch()
        let email = app.textFields["Email"]
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        app.buttons["auth-signup"].tap()
        let testEmail = "sim-\(UUID().uuidString.lowercased())@landnam.test"
        let password = "LanternSimulator20261014"
        email.tap(); email.typeText(testEmail)
        let pw = app.secureTextFields["Create password"]
        pw.tap(); enterSlowly(password, into: pw)
        let confirmation = app.secureTextFields["Confirm password"]
        confirmation.tap(); enterSlowly(password, into: confirmation)
        app.buttons["auth-submit"].tap()
        sleep(3)
        shot("native-signup-result")
        let signedOut = expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: email)
        wait(for: [signedOut], timeout: 12)
        sleep(2)
        shot("native-account-created-game")
        XCTAssertFalse(app.textFields["Email"].exists, "still on sign-up screen")
    }
}
