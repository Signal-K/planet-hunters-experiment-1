import XCTest

/// Drives the real app against a local PocketBase (debug build defaults to localhost:8090/8091).
@MainActor final class AuthFlowTests: XCTestCase {
    let app = XCUIApplication()
    override func setUp() { continueAfterFailure = false }

    func shot(_ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a)
    }

    func testWrongPasswordThenSignIn() {
        app.launch()
        let email = app.textFields["Email"], pw = app.secureTextFields["Password"]
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        email.tap(); email.typeText("tester@example.com")
        pw.tap(); pw.typeText("wrongwrong")
        app.buttons["SIGN IN"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Email or password is incorrect."].waitForExistence(timeout: 10))
        shot("wrong-password")
        pw.tap(); pw.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 10) + "TesterPass123")
        app.buttons["SIGN IN"].firstMatch.tap()
        XCTAssertFalse(email.waitForExistence(timeout: 2) && email.isHittable == false)
        sleep(4)
        shot("after-sign-in")
        XCTAssertFalse(app.textFields["Email"].exists, "still on sign-in screen")
    }
}
