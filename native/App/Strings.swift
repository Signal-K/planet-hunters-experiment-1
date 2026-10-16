import Foundation

/// The one scene-name table, `web/lib/scene-names.json`, bundled with the app.
/// Names are for accessibility. Scenes do not render them as titles.
/// Fallbacks match the JSON so previews still read the same words when the bundle is absent.
enum Strings {
    enum Scene {
        static let base = SceneTable.name("base", "Base")
        static let hub = SceneTable.name("hub", "Hub")
        static let exchange = SceneTable.name("exchange", "Exchange")
        static let build = SceneTable.name("build", "Build")
        static let launchpad = SceneTable.name("launchpad", "Launchpad")
        static let market = SceneTable.name("market", "Market")
        static let mining = SceneTable.name("mining", "Mining")
        static let transit = SceneTable.name("transit", "Transit")
    }
}

private enum SceneTable {
    static func name(_ key: String, _ fallback: String) -> String {
        guard let url = Bundle.main.url(forResource: "scene-names", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: String],
              let name = object[key], !name.isEmpty else { return fallback }
        return name
    }
}
