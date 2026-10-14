import SwiftUI
import LandnamCore

/// Program tab of the mission board (mirrors the web Program roadmap): numbered steps, what each unlocks, and what it needs.
/// Steps come from the Archive pathway, so the order and the done state are the same ones the Archive shows.
struct ProgramRoadmap: View {
    @Environment(GameStore.self) private var store
    var onOpen: (String) -> Void

    var body: some View {
        let entries = Archive.entries(catalog: store.catalog, player: store.player, now: store.now)
        let nodes = Archive.pathway(player: store.player, entries: entries)
        let next = nodes.firstIndex { !$0.done }
        let doneCount = nodes.filter(\.done).count
        VStack(alignment: .leading, spacing: 12) {
            summary(done: doneCount, total: nodes.count)
            ForEach(Array(nodes.enumerated()), id: \.element.id) { i, node in
                let entry = node.entryId.flatMap { id in entries.first { $0.id == id } }
                step(index: i, node: node, entry: entry, isNext: i == next, last: i == nodes.count - 1)
            }
        }
    }

    private func summary(done: Int, total: Int) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("YOUR SPACE PROGRAM").font(AppFont.display(18, "ExtraBold")).tracking(1.2)
            Text("\(done) of \(total) steps complete").font(AppFont.body(14, "SemiBold")).foregroundStyle(Theme.textDim)
            meter(Double(done) / Double(max(total, 1)))
        }
        .padding(14).frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink, lineWidth: 2))
    }

    private func meter(_ fraction: Double) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.paper2)
                Capsule().fill(Theme.teal).frame(width: max(0, geo.size.width * fraction))
            }
        }
        .frame(height: 14).overlay(Capsule().stroke(Theme.ink, lineWidth: 2))
    }

    private func step(index: Int, node: Archive.PathNode, entry: ArchiveEntry?, isNext: Bool, last: Bool) -> some View {
        let state = node.done ? "DONE" : isNext ? "NEXT UP" : "LATER"
        let unlocks = entry?.rewards.first ?? node.detail
        let needs = entry?.requirements.first { !$0.met }
        return HStack(alignment: .top, spacing: 10) {
            VStack(spacing: 0) {
                ZStack {
                    Circle().fill(node.done ? Theme.teal : isNext ? Theme.blue : Theme.paper)
                    Circle().stroke(Theme.ink, lineWidth: 2)
                    if node.done { Image(systemName: "checkmark").font(.system(size: 16, weight: .heavy)).foregroundStyle(Theme.paper) }
                    else { Text("\(index + 1)").font(AppFont.display(14, "ExtraBold")).foregroundStyle(isNext ? Theme.paper : Theme.ink) }
                }.frame(width: 34, height: 34)
                if !last { Rectangle().fill(node.done ? Theme.teal : Theme.hairline).frame(width: 4).frame(minHeight: 40) }
            }
            Button { if let id = node.entryId { onOpen(id) } } label: {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(state)").font(AppFont.display(14, "ExtraBold")).tracking(1.2).foregroundStyle(Theme.textDim)
                    Text(node.title).font(AppFont.display(18, "ExtraBold")).multilineTextAlignment(.leading)
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("UNLOCKS").font(AppFont.display(14, "ExtraBold")).tracking(1)
                        Text(unlocks).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    }
                    if !node.done, let needs {
                        HStack(spacing: 6) {
                            Image(systemName: "lock.fill").font(.system(size: 14))
                            Text("Needs: \(needs.label) · \(needs.detail)").font(AppFont.body(14, "SemiBold"))
                        }.foregroundStyle(Theme.ink)
                    }
                }
                .foregroundStyle(Theme.ink)
                .padding(12).frame(maxWidth: .infinity, minHeight: 88, alignment: .leading)
                .background(node.done ? Theme.teal.opacity(0.1) : Theme.paper, in: RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(isNext ? Theme.blue : Theme.ink, lineWidth: isNext ? 3 : 2))
                .opacity(node.done || isNext ? 1 : 0.8)
            }.buttonStyle(.plain)
            .accessibilityLabel("\(node.title), \(node.done ? "done" : isNext ? "next step" : "later")")
        }
    }
}
