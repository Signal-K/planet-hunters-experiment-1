// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "LandnamCore",
    platforms: [.macOS(.v14), .iOS(.v17)],
    products: [.library(name: "LandnamCore", targets: ["LandnamCore"])],
    targets: [
        .target(name: "LandnamCore"),
        .testTarget(name: "LandnamCoreTests", dependencies: ["LandnamCore"]),
    ]
)
