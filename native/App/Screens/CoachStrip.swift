import SwiftUI
import LandnamCore

/// Step coach strip (mirrors web FlightPlan): "MINING OPS · STEP 1/6", the current objective and, when the
/// step lives on another screen, a button that goes there. Sits in layout flow above the dock, never over a control.
struct CoachStrip: View {
    @Environment(GameStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let coach: FlightPlan.Coach
    @State private var copyStep: String?

    private var hidden: Bool { store.player.flightPlan.hidden }
    private var compactStep: String {
        coach.kicker.components(separatedBy: "·").last?.trimmingCharacters(in: .whitespaces) ?? "TRAINING"
    }

    @ViewBuilder
    var body: some View {
        if hidden {
            HStack {
                Spacer(minLength: 0)
                Button { store.setFlightPlanHidden(false) } label: {
                    Text("OPS · \(compactStep)")
                        .font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.ink)
                        .padding(.horizontal, 12).frame(minHeight: 44)
                        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Show Ops guidance, \(compactStep)")
            }
        } else {
            HStack(spacing: 8) {
                opsBadge(isDone: copyStep != nil)
                VStack(alignment: .leading, spacing: 2) {
                    Text(copyStep ?? coach.kicker).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.teal)
                    Text(copyStep == nil ? coach.objective : "+1 stitch · \(coach.objective)").font(AppFont.body(14, "SemiBold")).foregroundStyle(Theme.ink)
                        .lineLimit(2).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                if let go = coach.go {
                    Button { store.go(go.screen) } label: {
                        Text(go.label).font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.ink)
                            .padding(.horizontal, 10).frame(minHeight: 44)
                            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                }
                Button { store.setFlightPlanHidden(true) } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Theme.ink)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Hide Ops guidance")
            }
            .padding(6)
            .frame(maxWidth: .infinity, minHeight: 56)
            .background(Theme.hudPanel.opacity(0.96), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.hudInk, lineWidth: 2))
            .shadow(color: Theme.hudInk.opacity(0.24), radius: 0, x: 0, y: 4)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("\(coach.kicker). \(coach.objective). \(coach.radio)")
            .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: coach.kicker)
            .onChange(of: coach.kicker) { old, _ in
                guard let part = old.components(separatedBy: "STEP ").last,
                      let step = part.split(separator: "/").first else { return }
                let next = "Copy · Step \(step) done"
                copyStep = next
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    if copyStep == next { copyStep = nil }
                }
            }
        }
    }
}

extension CoachStrip {
    /// Ops call-sign badge (mirrors web .ops-badge): square pixel tile with three signal bars.
    func opsBadge(isDone: Bool) -> some View {
        HStack(spacing: 4) {
            Text("OPS").font(AppFont.display(14)).tracking(1.2).foregroundStyle(isDone ? Theme.teal : Theme.ink)
            HStack(alignment: .bottom, spacing: 2) {
                ForEach([6, 10, 14], id: \.self) { h in Rectangle().fill(isDone ? Theme.teal : Theme.teal).frame(width: 3, height: CGFloat(h)) }
            }
        }
        .padding(.horizontal, 8).frame(minHeight: 44)
        .background(Theme.paper).overlay(Rectangle().stroke(isDone ? Theme.teal : Theme.ink, lineWidth: 2))
        .accessibilityHidden(true)
    }
}

/// Hangar build config (mirrors web ShipInteriorPreview): the pad rocket sprite as a blueprint, one stage at a time
/// with progress dots, full-width part cards and Next pinned at the bottom. The last stage's primary is Confirm,
/// which completes the part training try.
struct HangarModulesPanel: View {
    @Environment(GameStore.self) private var store
    @State private var picks: [String: String] = [:]
    @State private var step = 0
    var onClose: (() -> Void)?

    private static let stageNames = ["engine": "Engine", "booster": "Boosters", "cockpit": "Cockpit", "payload": "Payload"]

    var body: some View {
        GeometryReader { geo in
            let wide = geo.size.width > geo.size.height
            VStack(spacing: 0) {
                if onClose != nil { SetHeader(back: onClose) }
                if wide {
                    HStack(alignment: .top, spacing: SetStyle.gap) {
                        blueprint.frame(width: geo.size.width * 0.3)
                        controls
                    }.padding(.horizontal, 16).padding(.top, 16)
                } else {
                    VStack(spacing: 16) {
                        blueprint.frame(height: geo.size.height * 0.4)
                        controls
                    }.padding(.horizontal, 16).padding(.top, 16).setColumn()
                }
                footer.setColumn(wide: wide)
            }
        }
        .background(SetStyle.bg.ignoresSafeArea())
        .foregroundStyle(SetStyle.ink)
    }

    private var kinds: [String] { FlightPlan.moduleKinds }
    private var kind: String { kinds[step] }
    private func pick(_ k: String) -> String? { picks[k] ?? store.player.shipCustomizerParts[k] }
    private var allFitted: Bool { kinds.allSatisfy { pick($0) != nil } }
    private var isLast: Bool { step == kinds.count - 1 }

    /// The same pad rocket sprite the base and flight scenes use, drawn grey on a pale blue sheet.
    private var blueprint: some View {
        Art.view("base/kit/pad-rocket.png").resizable().interpolation(.none).scaledToFit()
            .grayscale(1).brightness(0.1).opacity(0.72)
            .padding(16)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.mix(0.14), in: RoundedRectangle(cornerRadius: SetStyle.radius))
            .overlay(RoundedRectangle(cornerRadius: SetStyle.radius).stroke(SetStyle.ink, lineWidth: SetStyle.border))
            .accessibilityHidden(true)
    }

    private var controls: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                Button { step = max(0, step - 1) } label: {
                    Image(systemName: "chevron.left").font(.system(size: 18, weight: .heavy))
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }.buttonStyle(.plain).disabled(step == 0).opacity(step == 0 ? 0.35 : 1).accessibilityLabel("Previous stage")
                Text("\(Self.stageNames[kind] ?? kind) \(step + 1)/\(kinds.count)".uppercased())
                    .font(AppFont.display(14)).tracking(14 * 0.14)
                Spacer(minLength: 0)
                HStack(spacing: 8) {
                    ForEach(Array(kinds.enumerated()), id: \.offset) { i, k in
                        Rectangle().fill(i == step ? SetStyle.ink : (pick(k) != nil ? SetStyle.muted : SetStyle.card))
                            .frame(width: 12, height: 12).overlay(Rectangle().stroke(SetStyle.ink, lineWidth: 2))
                    }
                }.accessibilityHidden(true)
            }
            VStack(spacing: 16) {
                ForEach(FlightPlan.modules[kind] ?? [], id: \.id) { m in
                    let on = pick(kind) == m.id
                    Button { picks[kind] = m.id } label: {
                        SetRowText(title: m.name, status: on ? "Installed" : "Tap to fit", titleColor: on ? SetStyle.card : SetStyle.ink, statusColor: on ? SetStyle.card : SetStyle.muted)
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            .padding(SetStyle.pad)
                            .background(on ? SetStyle.ink : SetStyle.card, in: RoundedRectangle(cornerRadius: SetStyle.radius))
                            .overlay(RoundedRectangle(cornerRadius: SetStyle.radius).stroke(SetStyle.ink, lineWidth: SetStyle.border))
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(kind) \(m.name)\(on ? ", selected" : "")")
                }
            }
            Spacer(minLength: 0)
        }.frame(maxHeight: .infinity, alignment: .top)
    }

    private var footer: some View {
        SetButton(title: isLast ? "Confirm" : "Next", solid: true, enabled: isLast ? allFitted : true, fill: true) {
            if isLast {
                store.fitHangarModules(Dictionary(uniqueKeysWithValues: kinds.compactMap { k in pick(k).map { (k, $0) } }))
                onClose?()
            } else { step += 1 }
        }
        .padding(16)
    }
}


/// Where the coach floats. Landscape phones have a free band between the gear/clock and the francs chips, so it sits there
/// instead of covering Back, target and stat cards below the chips; portrait keeps the strip under the chip row.
struct CoachPlacement: View {
    let coach: FlightPlan.Coach
    var body: some View {
        GeometryReader { geo in
            let landscapePhone = geo.size.height < 500 && geo.size.width > 640
            CoachStrip(coach: coach)
                .frame(maxWidth: landscapePhone ? min(430, geo.size.width - 520) : 560)
                .padding(.horizontal, 8)
                .padding(.top, landscapePhone ? 8 : 68)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .allowsHitTesting(true)
    }
}
