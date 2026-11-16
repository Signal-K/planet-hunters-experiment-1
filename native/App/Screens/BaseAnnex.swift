import SwiftUI
import LandnamCore

/// SSL-844 (SSL-843 parity): small structures stand on fixed annex slots at the Base's west end
/// (`shared/layout/base-site.json` `annexSlots`). Anything owned without a slot waits in the Unplaced tray; tapping
/// it lights the free slots, tapping one places it, free. Web: `components/game/hub/AnnexStructures.tsx`.

/// World kit colours (web `--ln-world-*`).
private enum Kit {
    static let hullLit: Color = Theme.hex(0xFAF7F0)
    static let outline: Color = Theme.hex(0x16293B)
    static let trimBlue: Color = Theme.hex(0x2F6FA8)
    static let glass: Color = Theme.hex(0x9FD6E4)
}

/// Line-art ground telescope: an observatory dome on a drum, the tube out of the slit (web `GroundTelescopeArt`,
/// viewBox 44 × 68, bottom-aligned).
struct GroundTelescopeArt: View {
    var body: some View {
        Canvas { ctx, size in
            let s: CGFloat = min(size.width / 44, size.height / 68)
            let ox: CGFloat = (size.width - 44 * s) / 2
            let oy: CGFloat = size.height - 68 * s
            var c = ctx
            c.translateBy(x: ox, y: oy)
            c.scaleBy(x: s, y: s)
            Self.tube(&c)
            Self.dome(&c)
            Self.drum(&c)
        }
        .accessibilityHidden(true)
    }

    private static func box(_ c: inout GraphicsContext, _ r: CGRect, fill: Color, line: CGFloat, corner: CGFloat = 0) {
        let path: Path = corner > 0 ? Path(roundedRect: r, cornerRadius: corner) : Path(r)
        c.fill(path, with: .color(fill))
        if line > 0 { c.stroke(path, with: .color(Kit.outline), lineWidth: line) }
    }

    private static func tube(_ c: inout GraphicsContext) {
        var t: GraphicsContext = c
        t.translateBy(x: 26, y: 26)
        t.rotate(by: .degrees(-38))
        t.translateBy(x: -26, y: -26)
        box(&t, CGRect(x: 24, y: 8, width: 7, height: 24), fill: Kit.hullLit, line: 1.6, corner: 1)
        box(&t, CGRect(x: 23, y: 7, width: 9, height: 4), fill: Kit.trimBlue, line: 1.4, corner: 1)
    }

    private static func dome(_ c: inout GraphicsContext) {
        var dome = Path()
        dome.move(to: CGPoint(x: 7, y: 36))
        dome.addArc(center: CGPoint(x: 22, y: 36), radius: 15, startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false)
        dome.closeSubpath()
        c.fill(dome, with: .color(Kit.hullLit))
        c.stroke(dome, with: .color(Kit.outline), style: StrokeStyle(lineWidth: 1.8, lineJoin: .round))
        var slit = Path()
        slit.move(to: CGPoint(x: 21, y: 21.2))
        slit.addLine(to: CGPoint(x: 21, y: 36))
        slit.addLine(to: CGPoint(x: 26, y: 36))
        slit.addLine(to: CGPoint(x: 26, y: 21.6))
        c.fill(slit, with: .color(Kit.outline))
    }

    private static func drum(_ c: inout GraphicsContext) {
        box(&c, CGRect(x: 6, y: 36, width: 32, height: 24), fill: Kit.hullLit, line: 1.8)
        box(&c, CGRect(x: 6, y: 40, width: 32, height: 4), fill: Kit.trimBlue, line: 1.2)
        box(&c, CGRect(x: 17, y: 48, width: 10, height: 12), fill: Kit.outline, line: 0)
        box(&c, CGRect(x: 9, y: 48, width: 5, height: 4), fill: Kit.glass, line: 1)
        box(&c, CGRect(x: 30, y: 48, width: 5, height: 4), fill: Kit.glass, line: 1)
        box(&c, CGRect(x: 2, y: 60, width: 40, height: 6), fill: Kit.hullLit, line: 1.8)
    }
}

/// The art for an annex kind, or nothing for a kind with none yet.
struct AnnexArt: View {
    let kind: String
    var body: some View {
        if ControlStation.isGroundTelescope(kind) { GroundTelescopeArt() } else { Color.clear }
    }
}

/// The annex row on the Base's ground: each slot shows the structure standing on it, an empty pad, or (while a tray
/// item is being placed) a Place marker. Positions are in world points, inside the camera container.
struct BaseAnnexLayer: View {
    let map: BaseSiteMap
    let world: BaseWorld
    let standing: [Int: String]
    let placing: String?
    let showsNames: Bool
    let quiet: Bool
    let onPlace: (BaseSiteMap.AnnexSlot) -> Void
    let onOpen: (String) -> Void

    var body: some View {
        ForEach(map.annexSlotList) { slot in
            slotView(slot)
        }
    }

    @ViewBuilder private func slotView(_ slot: BaseSiteMap.AnnexSlot) -> some View {
        if let kind = standing[slot.plot] {
            structure(kind, slot: slot)
            if showsNames { nameTag(kind, slot: slot) }
        } else if let placing {
            marker(slot, placing: placing)
        } else if !quiet {
            pad(slot)
        }
    }

    private func label(_ kind: String) -> String { map.annexKind(kind)?.label ?? kind }

    private func structure(_ kind: String, slot: BaseSiteMap.AnnexSlot) -> some View {
        let px: CGFloat = world.px
        let size = map.annexKind(kind)
        let width: CGFloat = CGFloat(size?.body ?? 20) * px
        let height: CGFloat = CGFloat(size?.height ?? 30) * px
        return Button { onOpen(kind) } label: {
            AnnexArt(kind: kind)
                .frame(width: width, height: height)
                .frame(minWidth: 44, minHeight: 44, alignment: .bottom)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: CGFloat(slot.x) * px, y: world.ground + px - max(height, 44) / 2)
        .accessibilityLabel(label(kind))
        .accessibilityIdentifier("annex-\(kind)")
    }

    private func nameTag(_ kind: String, slot: BaseSiteMap.AnnexSlot) -> some View {
        Text((map.annexKind(kind)?.short ?? kind).uppercased())
            .font(AppFont.display(14)).tracking(1.1)
            .foregroundStyle(Theme.hudInk)
            .padding(.horizontal, 10).padding(.vertical, 2)
            .background(Capsule().fill(Theme.hudPanel))
            .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 1))
            .fixedSize()
            .position(x: CGFloat(slot.x) * world.px, y: world.ground + 14)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    private func pad(_ slot: BaseSiteMap.AnnexSlot) -> some View {
        let px: CGFloat = world.px
        return RoundedRectangle(cornerRadius: 3)
            .fill(Kit.outline.opacity(0.18))
            .overlay(RoundedRectangle(cornerRadius: 3).stroke(Kit.outline.opacity(0.35), lineWidth: 1))
            .frame(width: CGFloat(slot.half * 2) * px, height: 3 * px)
            .position(x: CGFloat(slot.x) * px, y: world.ground + 1.5 * px)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    /// A compact Place marker over the free slot (web `SiteMarker compact`).
    private func marker(_ slot: BaseSiteMap.AnnexSlot, placing: String) -> some View {
        let px: CGFloat = world.px
        let width: CGFloat = max(44, CGFloat(slot.half * 2) * px)
        return Button { onPlace(slot) } label: {
            VStack(spacing: 6) {
                HStack(spacing: 6) {
                    Text("+").font(AppFont.display(16)).foregroundStyle(Theme.hudPanel)
                        .frame(width: 22, height: 22).background(Circle().fill(Theme.blue))
                    Text("PLACE").font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.hudInk)
                }
                .padding(.horizontal, 12).padding(.vertical, 6).frame(minHeight: 44)
                .background(Capsule().fill(Theme.hudPanel))
                .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 2))
                RoundedRectangle(cornerRadius: 4)
                    .fill(Theme.hudPanel.opacity(0.3))
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudPanel, style: StrokeStyle(lineWidth: 2, dash: [6, 4])))
                    .frame(width: width, height: 6 * px)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .position(x: CGFloat(slot.x) * px, y: world.ground - 40 - 3 * px)
        .accessibilityLabel("Place \(label(placing)) on the \(slot.label)")
        .accessibilityIdentifier("annex-place-\(slot.id)")
    }
}

/// The Unplaced tray: structures the player owns that are not standing on the Base yet (web `UnplacedTray`).
struct UnplacedTray: View {
    let map: BaseSiteMap
    let kinds: [String]
    let placing: String?
    let onPick: (String) -> Void
    let onCancel: () -> Void

    var body: some View {
        if !kinds.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text(placing == nil ? "UNPLACED" : "TAP A LIT SLOT")
                    .font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.hudInk)
                HStack(spacing: 6) {
                    ForEach(kinds, id: \.self) { kind in item(kind) }
                    if placing != nil { cancel }
                }
            }
            .padding(8)
            .background(RoundedRectangle(cornerRadius: 12).fill(Theme.hudPanel))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.hudInk, lineWidth: 2))
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Unplaced structures")
            .accessibilityIdentifier("unplaced-tray")
        }
    }

    private func item(_ kind: String) -> some View {
        let picked: Bool = placing == kind
        return Button { picked ? onCancel() : onPick(kind) } label: {
            VStack(spacing: 2) {
                AnnexArt(kind: kind).frame(width: 30, height: 40)
                Text(map.annexKind(kind)?.short ?? kind).font(AppFont.display(14)).foregroundStyle(Theme.hudInk)
            }
            .frame(minWidth: 56, minHeight: 56)
            .background(RoundedRectangle(cornerRadius: 8).fill(picked ? Theme.blue.opacity(0.25) : Color.clear))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.hudInk, lineWidth: picked ? 2 : 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(map.annexKind(kind)?.label ?? kind)
        .accessibilityAddTraits(picked ? .isSelected : [])
        .accessibilityIdentifier("unplaced-\(kind)")
    }

    private var cancel: some View {
        Button(action: onCancel) {
            Text("Cancel").font(AppFont.display(14)).foregroundStyle(Theme.hudInk)
                .frame(minWidth: 56, minHeight: 56)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.hudInk, lineWidth: 1))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("unplaced-cancel")
    }
}
