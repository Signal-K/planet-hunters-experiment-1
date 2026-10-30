import SwiftUI
import LandnamCore

/// The shared HUD inbox. Friend requests are the first kind; its typed data
/// source intentionally leaves room for autonomous mission and scan events.
struct NotificationTray: View {
    @Environment(Services.self) private var services: Services?
    let onClose: () -> Void
    @State private var items: [PlayerNotification] = []
    @State private var status: String?
    @State private var loading = true

    var body: some View {
        ZStack {
            Theme.bg.opacity(0.72).ignoresSafeArea()
            VStack(alignment: .leading, spacing: 14) {
                HStack { Text("NOTIFICATIONS").font(AppFont.display(18)).tracking(1.2); Spacer(); Button("CLOSE", action: onClose).trayButton() }
                if loading { ProgressView().frame(maxWidth: .infinity, minHeight: 120) }
                else if let status { Text(status).font(AppFont.body(14)).foregroundStyle(Theme.hudInk) }
                else if items.isEmpty { Text("No new notifications.").font(AppFont.body(14)).foregroundStyle(Theme.textMuted) }
                else { ForEach(items) { item in notification(item) } }
            }
            .padding(20).frame(maxWidth: 480, alignment: .leading).background(Theme.hudPanel, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.hudInk, lineWidth: 2)).padding(16)
        }
        .task { await reload() }.accessibilityIdentifier("notification-tray")
    }

    private func notification(_ item: PlayerNotification) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(item.title.uppercased()).font(AppFont.display(14)).tracking(1)
            Text(item.body).font(AppFont.body(14)).foregroundStyle(Theme.textMuted)
            if item.kind == "friend_request", let friendshipId = item.action.friendshipId {
                HStack { Button("ACCEPT") { Task { await respond(friendshipId, accept: true) } }.trayButton(); Button("DECLINE") { Task { await respond(friendshipId, accept: false) } }.trayButton() }
            }
        }.padding(14).frame(maxWidth: .infinity, alignment: .leading).background(Theme.bg.opacity(0.25), in: RoundedRectangle(cornerRadius: 10)).overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.hudInk.opacity(0.22), lineWidth: 1))
    }

    private func reload() async {
        loading = true; defer { loading = false }
        guard let api = services?.notificationsAPI() else { status = "Notifications are unavailable right now."; return }
        do { items = try await api.list(); status = nil } catch { status = error.localizedDescription }
    }

    private func respond(_ friendshipId: String, accept: Bool) async {
        guard let api = services?.friendsAPI() else { status = "Friends are unavailable right now. Sign in again if this keeps happening."; return }
        do { try await api.respond(to: friendshipId, accept: accept); await reload() } catch { status = error.localizedDescription }
    }
}

private extension View {
    func trayButton() -> some View { font(AppFont.display(12)).tracking(0.7).foregroundStyle(Theme.hudInk).padding(.horizontal, 10).frame(minHeight: 44).background(Theme.accent.opacity(0.24), in: RoundedRectangle(cornerRadius: 7)).overlay(RoundedRectangle(cornerRadius: 7).stroke(Theme.hudInk, lineWidth: 1)).buttonStyle(.plain) }
}
