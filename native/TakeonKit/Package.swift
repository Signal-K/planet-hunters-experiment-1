// swift-tools-version: 6.0
import Foundation
import PackageDescription

// Takeon.xcframework is the gomobile build of the Go runtime
// (takeon-go `go/scripts/build.sh ios`). It is ~30 MB of build output, so it is
// not committed: run scripts/sync-xcframework.sh to copy it into Frameworks/.
// Without it the package still builds with the Null engine only, so nothing in
// Landnam changes until the Go runtime is wired in.
let frameworkPath = "Frameworks/Takeon.xcframework"
let manifestDir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().path
let hasGoRuntime = FileManager.default.fileExists(atPath: manifestDir + "/" + frameworkPath)

var targets: [Target] = [
    .target(name: "TakeonKit", dependencies: hasGoRuntime ? ["Takeon"] : []),
    .testTarget(
        name: "TakeonKitTests",
        dependencies: ["TakeonKit"],
        resources: [.copy("Fixtures")]
    ),
]
if hasGoRuntime {
    targets.append(.binaryTarget(name: "Takeon", path: frameworkPath))
}

let package = Package(
    name: "TakeonKit",
    platforms: [.macOS(.v14), .iOS(.v17)],
    products: [.library(name: "TakeonKit", targets: ["TakeonKit"])],
    targets: targets
)
