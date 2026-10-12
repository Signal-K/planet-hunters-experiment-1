import SwiftUI
import LandnamCore

/// Step coach strip (mirrors web FlightPlan): "MINING OPS · STEP 1/3", the current objective and, when the
/// step lives on another screen, a button that goes there. Sits in layout flow above the dock, never over a control.
struct CoachStrip: View {
    @Environment(GameStore.self) private var store
    let coach: FlightPlan.Coach

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(coach.kicker).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.teal)
                Text(coach.objective).font(AppFont.body(14, "SemiBold")).foregroundStyle(Theme.ink)
                    .lineLimit(2).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            if let go = coach.go {
                Button { store.go(go.screen) } label: {
                    Text(go.label).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.ink)
                        .padding(.horizontal, 12).frame(minHeight: 44)
                        .background(Theme.paper).overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 8)
        .frame(maxWidth: .infinity, minHeight: 56)
        .background(Theme.hudPanel)
        .overlay(alignment: .top) { Rectangle().fill(Theme.hudInk).frame(height: 1) }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(coach.kicker). \(coach.objective). \(coach.radio)")
    }
}

/// Hangar: fit one module in each ship stage, then confirm. Confirming completes the part training try.
struct HangarModulesPanel: View {
    @Environment(GameStore.self) private var store
    @State private var picks: [String: String] = [:]

    var body: some View {
        let fitted = store.player.shipCustomizerParts
        Panel(accent: Theme.teal) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Ship modules").font(AppFont.display(16))
                ForEach(FlightPlan.moduleKinds, id: \.self) { kind in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(kind.uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.textDim)
                        HStack(spacing: 8) {
                            ForEach(FlightPlan.modules[kind] ?? [], id: \.id) { m in
                                let on = (picks[kind] ?? fitted[kind]) == m.id
                                Button { picks[kind] = m.id } label: {
                                    Text(m.name).font(AppFont.body(14, "SemiBold")).foregroundStyle(on ? Theme.paper : Theme.ink)
                                        .frame(maxWidth: .infinity, minHeight: 44).padding(.horizontal, 6)
                                        .background(on ? Theme.ink : Theme.paper)
                                        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("\(kind) \(m.name)\(on ? ", selected" : "")")
                            }
                        }
                    }
                }
                PrimaryButton(title: "Confirm modules", enabled: FlightPlan.moduleKinds.allSatisfy { (picks[$0] ?? fitted[$0]) != nil }) {
                    store.fitHangarModules(Dictionary(uniqueKeysWithValues: FlightPlan.moduleKinds.compactMap { k in (picks[k] ?? fitted[k]).map { (k, $0) } }))
                }
            }
        }
    }
}
