import SwiftUI
import LandnamCore

/// The pathway view: the road through the game, plus every mission, spacecraft, structure, instrument and
/// Space Week event with what unlocks it. Pick one for a plain overview of what to do.
struct ArchiveScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var focus: String? = nil
    @State private var selected: String?
    @State private var filter: ArchiveEntry.Category?

    var body: some View {
        let entries = Archive.entries(catalog: store.catalog, player: store.player, now: store.now)
        VStack(spacing: 0) {
            header(entries)
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let id = selected, let entry = entries.first(where: { $0.id == id }) {
                        ArchiveDetail(entry: entry, onGo: go)
                    } else {
                        chips
                        if filter == nil { pathway(entries) } else { list(entries.filter { $0.category == filter }) }
                    }
                }
                .padding(16).frame(maxWidth: 720, alignment: .leading).frame(maxWidth: .infinity)
            }
        }
        .background(Theme.bg.ignoresSafeArea()).foregroundStyle(Theme.ink)
        .onAppear { if selected == nil { selected = focus } }
    }

    private func header(_ entries: [ArchiveEntry]) -> some View {
        HStack(spacing: 12) {
            Button { if selected != nil { selected = nil } else { dismiss() } } label: {
                Text(selected != nil ? "‹ ARCHIVE" : "‹ BACK").font(AppFont.display(14)).tracking(1.6).foregroundStyle(Theme.bluePress)
                    .frame(minWidth: 44, minHeight: 44, alignment: .leading).contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityLabel(selected != nil ? "Back to archive" : "Close archive")
            Text("Archive").font(AppFont.display(23))
            Spacer()
        }
        .padding(.horizontal, 16).padding(.top, 8)
    }

    private var chips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip("PATHWAY", filter == nil) { filter = nil }
                ForEach(ArchiveEntry.Category.allCases, id: \.self) { c in chip(c.rawValue.uppercased(), filter == c) { filter = c } }
            }.padding(.bottom, 4)
        }
    }

    private func chip(_ title: String, _ on: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(AppFont.display(14)).tracking(1.2).padding(.horizontal, 14).frame(minHeight: 44)
                .foregroundStyle(on ? Color.white : Theme.ink)
                .background(on ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1.5))
        }.buttonStyle(.plain).accessibilityLabel(title).accessibilityAddTraits(on ? .isSelected : [])
    }

    // MARK: pathway

    private func pathway(_ entries: [ArchiveEntry]) -> some View {
        let nodes = Archive.pathway(player: store.player, entries: entries)
        let next = nodes.firstIndex { !$0.done }
        return VStack(alignment: .leading, spacing: 8) {
            Eyebrow(text: "The road through the game")
            Text("Tap a step to see what it takes.").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
            ForEach(Array(nodes.enumerated()), id: \.element.id) { i, node in
                Button { if let id = node.entryId { selected = id } } label: {
                    HStack(alignment: .top, spacing: 12) {
                        VStack(spacing: 0) {
                            marker(done: node.done, next: i == next)
                            if i < nodes.count - 1 { Rectangle().fill(node.done ? Theme.teal : Theme.hairline).frame(width: 3).frame(minHeight: 28) }
                        }.frame(width: 44)
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(node.title.uppercased()).font(AppFont.display(14, "Bold")).tracking(1.2)
                                if i == next { Text("NEXT").font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.bluePress) }
                            }
                            Text(node.detail).font(AppFont.body(14)).foregroundStyle(Theme.textDim).fixedSize(horizontal: false, vertical: true)
                        }
                        Spacer(minLength: 0)
                    }
                    .frame(minHeight: 44).contentShape(Rectangle())
                }.buttonStyle(.plain)
                .accessibilityLabel("\(node.title), \(node.done ? "done" : i == next ? "next step" : "later")")
            }
        }
    }

    @ViewBuilder private func marker(done: Bool, next: Bool) -> some View {
        if done { Image(systemName: "checkmark.circle.fill").font(.system(size: 24)).foregroundStyle(Theme.teal) }
        else if next { Image(systemName: "arrowtriangle.right.circle.fill").font(.system(size: 24)).foregroundStyle(Theme.blue) }
        else { Image(systemName: "circle").font(.system(size: 24)).foregroundStyle(Theme.textMuted) }
    }

    // MARK: list

    private func list(_ entries: [ArchiveEntry]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(entries) { e in
                Button { selected = e.id } label: {
                    HStack(spacing: 12) {
                        StatusMark(status: e.status)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(e.title).font(AppFont.display(16)).multilineTextAlignment(.leading)
                            Text(e.subtitle).font(AppFont.body(14)).foregroundStyle(Theme.textDim).multilineTextAlignment(.leading)
                        }
                        Spacer(minLength: 0)
                        Text(e.status.rawValue.uppercased()).font(AppFont.display(14)).tracking(1.0).foregroundStyle(StatusMark.color(e.status))
                    }
                    .padding(12).frame(minHeight: 44).frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.paper, in: RoundedRectangle(cornerRadius: 9))
                    .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.border, lineWidth: 1.5))
                }.buttonStyle(.plain).accessibilityLabel("\(e.title), \(e.status.rawValue)")
            }
        }
    }

    private func go(_ entry: ArchiveEntry) {
        guard entry.missionId != nil else { return }
        dismiss()
        store.go(entry.category == .program || entry.category == .instruments ? .launchpad : .missions)
    }
}

/// Status = shape + colour + label (never colour alone).
struct StatusMark: View {
    let status: ArchiveEntry.Status
    static func color(_ s: ArchiveEntry.Status) -> Color {
        switch s { case .done: return Theme.teal; case .available, .live: return Theme.blue; case .locked, .ended: return Theme.textMuted; case .upcoming: return Theme.bluePress }
    }
    static func symbol(_ s: ArchiveEntry.Status) -> String {
        switch s {
        case .done: return "checkmark.circle.fill"; case .available: return "play.circle"; case .locked: return "lock.fill"
        case .live: return "dot.radiowaves.left.and.right"; case .upcoming: return "clock"; case .ended: return "xmark.circle"
        }
    }
    var body: some View {
        Image(systemName: Self.symbol(status)).font(.system(size: 20, weight: .semibold)).foregroundStyle(Self.color(status)).frame(width: 28)
    }
}

private struct ArchiveDetail: View {
    let entry: ArchiveEntry
    let onGo: (ArchiveEntry) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Eyebrow(text: entry.category.rawValue)
                Text(entry.title).font(AppFont.display(28)).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 8) {
                    StatusMark(status: entry.status)
                    Text(entry.status.rawValue.uppercased()).font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(StatusMark.color(entry.status))
                    Text("· \(entry.subtitle)").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                }
            }
            Text(entry.summary).font(AppFont.body(16)).fixedSize(horizontal: false, vertical: true)
            section("What you need") {
                ForEach(entry.requirements) { r in
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: r.met ? "checkmark.circle.fill" : "circle").font(.system(size: 20)).foregroundStyle(r.met ? Theme.teal : Theme.textMuted)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(r.label.uppercased()).font(AppFont.display(14, "Bold")).tracking(1.0)
                            Text(r.detail).font(AppFont.body(14)).foregroundStyle(Theme.textDim).fixedSize(horizontal: false, vertical: true)
                        }
                    }.accessibilityElement(children: .combine).accessibilityLabel("\(r.label), \(r.met ? "met" : "not yet"). \(r.detail)")
                }
            }
            section("How to do it") {
                ForEach(Array(entry.steps.enumerated()), id: \.offset) { i, step in
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(i + 1)").font(AppFont.display(14, "Bold")).frame(width: 28, height: 28)
                            .background(Theme.paper2, in: Circle()).overlay(Circle().stroke(Theme.border, lineWidth: 1.5))
                        Text(step).font(AppFont.body(16)).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            if !entry.rewards.isEmpty {
                section("You get") {
                    ForEach(entry.rewards, id: \.self) { Text($0).font(AppFont.body(16)).fixedSize(horizontal: false, vertical: true) }
                }
            }
            if entry.missionId != nil, entry.status == .available {
                PrimaryButton(title: entry.category == .program || entry.category == .instruments ? "Go to the Launchpad" : "Go to the mission board") { onGo(entry) }
            }
        }
    }

    private func section<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        Panel(accent: Theme.teal) {
            VStack(alignment: .leading, spacing: 12) {
                Eyebrow(text: title)
                content()
            }
        }
    }
}
