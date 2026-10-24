import SwiftUI
import UIKit

/// Player-chosen screen orientation lock. Auto follows the device (the default); iOS only.
enum OrientationPreference: String, CaseIterable, Identifiable, Sendable {
    case auto, portrait, landscape

    static let storageKey = "landnam.orientation"
    var id: String { rawValue }
    var title: String { rawValue.capitalized }

    /// Unknown or missing stored values fall back to Auto, so old installs and future renames are safe.
    init(stored: String?) { self = stored.flatMap(Self.init(rawValue:)) ?? .auto }

    static var current: OrientationPreference { .init(stored: UserDefaults.standard.string(forKey: storageKey)) }

    /// Orientations the iPhone app may rotate into.
    func mask(idiom: UIUserInterfaceIdiom) -> UIInterfaceOrientationMask {
        switch self {
        case .auto: .allButUpsideDown
        case .portrait: .portrait
        case .landscape: .landscape
        }
    }

    @MainActor func apply() {
        let mask = mask(idiom: UIDevice.current.userInterfaceIdiom)
        OrientationLock.mask = mask
        for case let scene as UIWindowScene in UIApplication.shared.connectedScenes {
            scene.windows.first?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
            scene.requestGeometryUpdate(.iOS(interfaceOrientations: mask)) { _ in }
        }
    }
}

/// Runtime orientation mask read by the app delegate, so the setting needs no relaunch.
enum OrientationLock {
    /// Starts as .all so launch never fights the Info.plist; the app applies the saved choice on first appear.
    nonisolated(unsafe) static var mask: UIInterfaceOrientationMask = .all
}

final class LandnamAppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        OrientationLock.mask
    }
}
