import Testing
import Foundation
@testable import Landnam
#if canImport(UIKit)
import UIKit
#endif

struct OrientationPreferenceTests {
    @Test func defaultsToAutoAndIgnoresUnknownValues() {
        #expect(OrientationPreference(stored: nil) == .auto)
        #expect(OrientationPreference(stored: "sideways") == .auto)
        #expect(OrientationPreference(stored: "landscape") == .landscape)
        #expect(OrientationPreference(stored: "portrait") == .portrait)
    }

    @Test func persistsThroughUserDefaults() {
        let d = UserDefaults(suiteName: "orientation-test")!
        d.removePersistentDomain(forName: "orientation-test")
        #expect(OrientationPreference(stored: d.string(forKey: OrientationPreference.storageKey)) == .auto)
        d.set(OrientationPreference.landscape.rawValue, forKey: OrientationPreference.storageKey)
        #expect(OrientationPreference(stored: d.string(forKey: OrientationPreference.storageKey)) == .landscape)
    }

    #if canImport(UIKit)
    @Test func masksMatchChoice() {
        #expect(OrientationPreference.portrait.mask(idiom: .phone) == .portrait)
        #expect(OrientationPreference.landscape.mask(idiom: .phone) == .landscape)
        #expect(OrientationPreference.landscape.mask(idiom: .pad) == .landscape)
        #expect(OrientationPreference.auto.mask(idiom: .phone) == .allButUpsideDown)
        #expect(OrientationPreference.auto.mask(idiom: .pad) == .all)
        #expect(OrientationPreference.portrait.mask(idiom: .pad).contains(.portraitUpsideDown))
    }
    #endif
}
