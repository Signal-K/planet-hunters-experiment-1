// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "TakeonKit",
    platforms: [.macOS(.v14), .iOS(.v17)],
    products: [.library(name: "TakeonKit", targets: ["TakeonKit"])],
    targets: [
        .target(name: "TakeonKit"),
        .testTarget(name: "TakeonKitTests", dependencies: ["TakeonKit"]),
    ]
)
