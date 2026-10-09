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

    func tap(_ label: String, wait: Double = 5) {
        let b = app.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] %@", label)).firstMatch
        XCTAssertTrue(b.waitForExistence(timeout: wait), "missing button \(label)")
        b.tap(); sleep(2)
    }
    func buttons() -> String {
        app.buttons.allElementsBoundByIndex.map { $0.label }.joined(separator: " | ")
    }
    func step(_ name: String) {
        shot(name)
        let a = XCTAttachment(string: buttons()); a.name = name + "-buttons"; a.lifetime = .keepAlways; add(a)
    }

    /// Runs lines from the script file: `tap Label`, `wait N`, `shot name`, `type Field|text`.
    func testScript() throws {
        let path = "/private/tmp/claude-501/-Users-scroobz-Navigation-Landnam/ad5c1b5a-b254-4b6f-8006-0e64a71df986/scratchpad/script.txt"
        let lines = try String(contentsOfFile: path, encoding: .utf8).split(separator: "\n").map(String.init)
        app.launch()
        let begin = app.buttons["BEGIN OPERATIONS"]
        if begin.waitForExistence(timeout: 6) { begin.tap(); sleep(2) }
        for l in lines {
            let parts = l.split(separator: " ", maxSplits: 1).map(String.init)
            let arg = parts.count > 1 ? parts[1] : ""
            switch parts[0] {
            case "tap": tap(arg)
            case "wait": sleep(UInt32(arg) ?? 1)
            case "shot": step(arg)
            case "tapxy":
                let c = arg.split(separator: ",").compactMap { Double($0) }
                app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: c[0], dy: c[1])).tap(); sleep(1)
            case "taps":
                let c = arg.split(separator: ",").compactMap { Double($0) }
                let pt = app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: c[0], dy: c[1]))
                for _ in 0..<Int(c[2]) { pt.tap() }
            case "press":
                let c = arg.split(separator: ",").compactMap { Double($0) }
                app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: c[0], dy: c[1])).press(forDuration: c[2])
            case "drag":
                let c = arg.split(separator: ",").compactMap { Double($0) }
                let z = app.coordinate(withNormalizedOffset: .zero)
                z.withOffset(CGVector(dx: c[0], dy: c[1])).press(forDuration: 0.1, thenDragTo: z.withOffset(CGVector(dx: c[2], dy: c[3])))
            default: break
            }
        }
    }
}
