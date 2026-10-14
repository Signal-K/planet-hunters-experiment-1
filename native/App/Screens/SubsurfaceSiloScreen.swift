import SwiftUI
import LandnamCore

/// The native counterpart to the web Hub's below-grade tray: the surface Silo
/// is the entry point, a short descent reveals its storage readout, and the
/// only exit returns to the unchanged Base scene.
struct SubsurfaceSiloScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var descended = false

    private var stored: Int { Market.storedUnits(store.player.stash) }
    private var capacity: Int { max(Economy.surfaceSiloCapacity, Market.storageCapacity(store.player)) }
    private var fill: Double { min(1, Double(stored) / Double(capacity)) }

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                SiloStrata()
                shaft(in: proxy.size)
                readout
                    .padding(16)
                    .padding(.top, 60)
                    .offset(y: descended ? 0 : -26)
                    .opacity(descended ? 1 : 0)
                Button { store.go(.hub) } label: {
                    Label("Base", systemImage: "arrow.up")
                        .font(AppFont.display(14, "Bold"))
                        .tracking(1.2)
                        .foregroundStyle(Theme.hudInk)
                        .frame(minWidth: 44, minHeight: 44)
                        .padding(.horizontal, 10)
                        .hudPanel(radius: 10)
                }
                .buttonStyle(.plain)
                .padding(16)
                .accessibilityLabel("Return to Base")
            }
        }
        .ignoresSafeArea()
        .onAppear {
            guard !reduceMotion else { descended = true; return }
            withAnimation(.easeOut(duration: 0.32).delay(0.16)) { descended = true }
        }
    }

    private func shaft(in size: CGSize) -> some View {
        VStack(spacing: 0) {
            Rectangle().fill(Theme.hudInk.opacity(0.72)).frame(height: 2)
            Rectangle().fill(Theme.paper.opacity(0.72)).frame(width: 46)
                .overlay(Rectangle().stroke(Theme.hudInk.opacity(0.72), lineWidth: 1))
            Spacer(minLength: 0)
        }
        .frame(width: 48, height: size.height)
        .frame(maxWidth: .infinity)
        .opacity(0.8)
        .accessibilityHidden(true)
    }

    private var readout: some View {
        VStack(alignment: .leading, spacing: 16) {
            Eyebrow(text: "Base · below grade")
            Text("Surface Silo").font(AppFont.display(28)).foregroundStyle(Theme.ink)
            Text("Storage is attached to the Base. Ore stays here until it is sold at the Exchange or spent on construction.")
                .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    Text("\(stored) / \(capacity) U").font(AppFont.mono(22)).foregroundStyle(Theme.ink)
                    Spacer()
                    Text("SILO 01").font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.textMuted)
                }
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Theme.paper2)
                        Capsule().fill(Theme.hudMint).frame(width: proxy.size.width * fill)
                    }
                    .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 1.5))
                }
                .frame(height: 14)
            }
            .padding(14)
            .hudPanel(radius: 10)
        }
        .padding(16)
        .background(Theme.paper.opacity(0.96), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.hudInk, lineWidth: 1.5))
        .shadow(color: Theme.blue.opacity(0.24), radius: 0, x: 5, y: 5)
        .frame(maxWidth: 520, alignment: .leading)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct SiloStrata: View {
    var body: some View {
        ZStack(alignment: .top) {
            Theme.bg
            VStack(spacing: 0) {
                Rectangle().fill(Theme.groundFar).frame(height: 50)
                Rectangle().fill(Theme.groundNear.opacity(0.72)).frame(height: 110)
                Rectangle().fill(Theme.paper2.opacity(0.86)).frame(height: 150)
                Spacer(minLength: 0)
            }
            VStack(spacing: 0) {
                ForEach(0..<9, id: \.self) { _ in
                    Rectangle().fill(Theme.hudInk.opacity(0.1)).frame(height: 1)
                    Spacer(minLength: 0)
                }
            }
            .padding(.top, 50)
            .padding(.bottom, 30)
        }
        .accessibilityHidden(true)
    }
}
