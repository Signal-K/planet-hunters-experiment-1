import SwiftUI
import LandnamCore

/// Real rendered prefab. Host screens provide mission commands; shared declarations own local geometry and art.
struct LaunchpadPrefab: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let phase: PadPhase
    let progress: Double
    let width: CGFloat
    let height: CGFloat
    let onChooseMission: () -> Void
    @State private var serviceOffset: CGFloat = -4

    var body: some View {
        let parts = LaunchpadParts(width: width, height: height)
        let apron = parts.part("apron")
        let control = parts.part("launch-control")
        let service = parts.part("service-motion")
        ZStack(alignment: .topLeading) {
            Art.view(apron.object.nativeAsset!).resizable().interpolation(.none)
                .prefabFrame(apron.frame)
            Art.view(service.object.nativeAsset!).resizable().interpolation(.none)
                .prefabFrame(service.frame)
                .offset(x: serviceOffset, y: serviceOffset * -0.18)
            PadBuild(phase: phase, p: progress, w: width, h: height)
            Button { if control.object.action == "choose-mission" { onChooseMission() } } label: { Color.clear }
                .buttonStyle(.plain)
                .frame(width: max(44, control.frame.w), height: max(44, control.frame.h))
                .position(x: control.frame.x + max(44, control.frame.w) / 2, y: control.frame.y + max(44, control.frame.h) / 2)
                .accessibilityLabel("Choose a mission")
                .accessibilityIdentifier("launchpad-status-card")
        }
        .frame(width: width, height: height)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 2.8).repeatForever(autoreverses: true)) {
                serviceOffset = 5
            }
        }
    }
}

private struct LaunchpadParts {
    let objects: [ResolvedSceneObject]
    init(width: Double, height: Double) {
        objects = AuthoredSceneGraph.resolve(AuthoredSceneGraph.scene("launchpad")!, width: width, height: height, prefabRoot: "launchpad-complex")
    }
    func part(_ id: String) -> ResolvedSceneObject {
        guard let part = objects.first(where: { $0.object.id == id && $0.object.layout == "shared" }) else {
            preconditionFailure("Missing shared launchpad part \(id)")
        }
        return part
    }
}

private extension View {
    func prefabFrame(_ frame: SceneRect) -> some View {
        self.frame(width: frame.w, height: frame.h).position(x: frame.x + frame.w / 2, y: frame.y + frame.h / 2)
    }
}

/// Only animation progress changes per frame; mission state and persistence remain in GameStore.
struct PadBuild: View, @preconcurrency Animatable {
    var phase: PadPhase
    var p: Double
    var w: CGFloat
    var h: CGFloat
    var animatableData: Double {
        get { p }
        set { p = newValue }
    }

    var body: some View {
        let parts = LaunchpadParts(width: w, height: h)
        let rocket = parts.part("staged-rocket")
        let scaffold = parts.part("assembly-scaffold")
        let building = phase == .building
        let opacity = building ? min(1, p / 0.12) * (p > 0.82 ? max(0, (1 - p) / 0.18) : 1) : 0
        ZStack(alignment: .topLeading) {
            if phase != .idle {
                Image(rocket.object.nativeAsset!).resizable().interpolation(.none).scaledToFit()
                    .frame(width: rocket.frame.w, height: rocket.frame.h)
                    .modifier(DesignGhost(on: phase == .design))
                    .mask(alignment: .bottom) { Rectangle().frame(height: rocket.frame.h * (building ? p : 1)) }
                    .position(x: rocket.frame.x + rocket.frame.w / 2, y: rocket.frame.y + rocket.frame.h / 2)
            }
            Art.view(scaffold.object.nativeAsset!).resizable().interpolation(.none)
                .prefabFrame(scaffold.frame).opacity(opacity)
            if building && p > 0.08 && p < 0.92 {
                Rectangle().fill(Theme.paper).frame(width: 28, height: 6)
                    .shadow(color: Theme.blue, radius: 6)
                    .position(x: rocket.frame.x + rocket.frame.w / 2, y: rocket.frame.y + rocket.frame.h * (1 - p))
            }
        }
        .frame(width: w, height: h)
        .allowsHitTesting(false)
    }
}

private struct DesignGhost: ViewModifier {
    var on: Bool
    func body(content: Content) -> some View {
        if on { content.grayscale(1).brightness(0.3).opacity(0.5).shadow(color: Theme.blue, radius: 3) } else { content }
    }
}
