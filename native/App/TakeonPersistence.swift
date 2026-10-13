import Foundation
import LandnamCore

/// Takeon world persistence (SSL-559): the engine snapshot on disk is the offline cache; every save is also queued
/// for PocketBase `voxel_worlds` / `structures` through `upload` (wired by `Services`), and a signed-in device with no
/// local copy pulls the account's world first.
@MainActor
enum TakeonPersistence {
    static var upload: ((_ target: String, _ seed: UInt64, _ state: JSONValue, _ snapshot: Data?) -> Void)?

    static func url(_ target: String) -> URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Landnam/takeon", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("\(target).snapshot")
    }
    static func load(_ target: String) -> Data? { try? Data(contentsOf: url(target)) }
    static func storeLocal(_ target: String, _ snapshot: Data) { try? snapshot.write(to: url(target), options: .atomic) }

    static func save(target: String, seed: UInt64, state: Data, snapshot: Data?) {
        if let snapshot { storeLocal(target, snapshot) }
        guard let json = try? JSONDecoder().decode(JSONValue.self, from: state) else { return }
        upload?(target, seed, json, snapshot)
    }
}
