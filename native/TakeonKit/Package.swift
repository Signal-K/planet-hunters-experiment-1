// swift-tools-version: 6.0
import Foundation
import PackageDescription

// Prefer the sibling Takeon checkout when available. CI/release callers can
// set TAKEON_PACKAGE_PATH explicitly or resolve the pinned source revision.
let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let sibling = root.appendingPathComponent("../../../takeon").standardizedFileURL.path
let configured = ProcessInfo.processInfo.environment["TAKEON_PACKAGE_PATH"]
let local = configured ?? (FileManager.default.fileExists(atPath: sibling + "/Package.swift") ? sibling : nil)
let source: Package.Dependency = local.map { .package(name: "takeon", path: $0) } ?? .package(
    url: "https://github.com/Signal-K/takeon.git",
    revision: "912ad63e738947cfb636bdd04d1534f741494d2f"
)
let package = Package(
    name: "TakeonKit", platforms: [.iOS(.v17)],
    products: [.library(name: "TakeonKit", targets: ["TakeonKit"])],
    dependencies: [source],
    targets: [
        .target(name: "TakeonKit", dependencies: [.product(name: "TakeonCore", package: "takeon")]),
        .testTarget(name: "TakeonKitTests", dependencies: ["TakeonKit"], resources: [.copy("Fixtures")]),
    ]
)
