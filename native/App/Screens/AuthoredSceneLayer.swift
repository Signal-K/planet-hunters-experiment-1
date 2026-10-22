import SwiftUI
import LandnamCore

/// Native production bridge for the shared authored draw list. It is deliberately
/// transparent while the existing SwiftUI art migrates object by object. Launch
/// with `-scene-graph-probes` to expose object rectangles to accessibility-driven
/// parity checks without maintaining a second native fixture catalog.
struct AuthoredSceneLayer: View {
    let sceneID: String

    private var exposesProbes: Bool {
        ProcessInfo.processInfo.arguments.contains("-scene-graph-probes")
    }

    var body: some View {
        GeometryReader { geometry in
            if let scene = AuthoredSceneGraph.scene(sceneID) {
                let objects = AuthoredSceneGraph.resolve(
                    scene,
                    width: geometry.size.width,
                    height: geometry.size.height
                )
                ForEach(objects, id: \.object.id) { object in
                    Color.clear
                        .frame(width: object.frame.w, height: object.frame.h)
                        .position(
                            x: object.frame.x + object.frame.w / 2,
                            y: object.frame.y + object.frame.h / 2
                        )
                        .accessibilityElement()
                        .accessibilityIdentifier("engine-object-\(object.object.id)")
                        .accessibilityValue("\(object.frame.x),\(object.frame.y),\(object.frame.w),\(object.frame.h)")
                        .accessibilityHidden(!exposesProbes)
                }
            }
        }
        .allowsHitTesting(false)
        .accessibilityIdentifier("engine-scene-\(sceneID)")
    }
}
