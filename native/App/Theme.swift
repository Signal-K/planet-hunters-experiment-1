import SwiftUI

/// Light "blueprint" direction. No dark default.
enum Theme {
    static let paper = Color(red: 0.95, green: 0.97, blue: 0.99)
    static let ink = Color(red: 0.08, green: 0.16, blue: 0.30)
    static let line = Color(red: 0.20, green: 0.40, blue: 0.70)
    static let accent = Color(red: 0.90, green: 0.45, blue: 0.10)
    static let panel = Color.white
}

struct Panel<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.line.opacity(0.5), lineWidth: 1))
    }
}

struct PrimaryButton: View {
    let title: String
    var enabled = true
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(.headline).frame(maxWidth: .infinity).padding(.vertical, 12)
        }
        .buttonStyle(.borderedProminent).tint(Theme.accent).disabled(!enabled)
    }
}

struct ScreenFrame<Content: View>: View {
    let title: String
    var back: (() -> Void)?
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    if let back { Button("Hub", action: back) }
                    Text(title).font(.title2.bold()).foregroundStyle(Theme.ink)
                }
                content
            }
            .padding(16).frame(maxWidth: 720, alignment: .leading).frame(maxWidth: .infinity)
        }
        .background(Theme.paper.ignoresSafeArea())
        .foregroundStyle(Theme.ink)
    }
}
