import XCTest

/// Forces each orientation preference via the defaults launch argument, then rotates the device the opposite way.
@MainActor final class OrientationTests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    private func run(_ mode: String, device: UIDeviceOrientation, expectLandscape: Bool, shotName: String) {
        let app = XCUIApplication()
        app.launchArguments = ["-landnam.orientation", mode]
        XCUIDevice.shared.orientation = device
        app.launch()
        sleep(2)
        let f = app.windows.firstMatch.frame
        XCTAssertEqual(f.width > f.height, expectLandscape, "\(mode) with device \(device.rawValue): window \(f)")
        let a = XCTAttachment(screenshot: app.screenshot()); a.name = shotName; a.lifetime = .keepAlways; add(a)
        app.terminate()
    }

    func testPortraitForcedWhileDeviceLandscape() {
        run("portrait", device: .landscapeLeft, expectLandscape: false, shotName: "portrait-forced-device-landscape")
    }

    func testLandscapeForcedWhileDevicePortrait() {
        run("landscape", device: .portrait, expectLandscape: true, shotName: "landscape-forced-device-portrait")
    }

    func testAutoFollowsDevice() {
        run("auto", device: .landscapeLeft, expectLandscape: true, shotName: "auto-device-landscape")
        run("auto", device: .portrait, expectLandscape: false, shotName: "auto-device-portrait")
    }
}
