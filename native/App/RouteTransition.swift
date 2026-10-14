import Foundation
import SwiftUI
import LandnamCore

/// Mirrors the web scene handoff: cover the previous surface with the light
/// blueprint field, swap at full cover, then reveal the destination.
struct RouteTransition<Content: View>: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let screen: Screen
    @ViewBuilder let content: (Screen) -> Content

    @State private var displayed: Screen
    @State private var veilOpacity = 0.0
    @State private var transitionID = UUID()

    init(screen: Screen, @ViewBuilder content: @escaping (Screen) -> Content) {
        self.screen = screen
        self.content = content
        _displayed = State(initialValue: screen)
    }

    var body: some View {
        ZStack {
            content(displayed)
            Theme.bg
                .ignoresSafeArea()
                .opacity(veilOpacity)
                .allowsHitTesting(veilOpacity > 0)
        }
        .onChange(of: screen) { _, next in
            guard next != displayed else { return }
            let id = UUID()
            transitionID = id
            if reduceMotion {
                displayed = next
                return
            }
            withAnimation(.easeIn(duration: 0.18)) { veilOpacity = 1 }
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(180))
                guard transitionID == id else { return }
                displayed = next
                withAnimation(.easeOut(duration: 0.20)) { veilOpacity = 0 }
            }
        }
    }
}
