import Testing
import SwiftUI
@testable import Landnam

/// The ambient road rover drives a lane on the road: clear of the dock at every point of its loop, in every layout.
/// (Draw order is covered by the Hub's ZStack: traffic is declared before every structure and HUD control.)
@MainActor
struct TrafficLaneTests {
    private static let layouts: [(name: String, size: CGSize, insets: EdgeInsets)] = [
        ("phone portrait", CGSize(width: 402, height: 874), EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0)),
        ("small phone portrait", CGSize(width: 375, height: 667), EdgeInsets(top: 20, leading: 0, bottom: 0, trailing: 0)),
        ("phone landscape", CGSize(width: 874, height: 402), EdgeInsets(top: 0, leading: 62, bottom: 21, trailing: 62)),
        ("tablet landscape", CGSize(width: 1180, height: 820), EdgeInsets(top: 24, leading: 0, bottom: 20, trailing: 0)),
        ("desktop", CGSize(width: 1000, height: 680), EdgeInsets()),
    ]

    @Test func theLaneNeverReachesTheDock() {
        for l in Self.layouts {
            for hasPlaced in [false, true] {
                let layout = BaseLayout(size: l.size, insets: l.insets, zones: .standard, hasPlaced: hasPlaced)
                for step in 0...48 {
                    let frame = layout.roverFrame(phase: CGFloat(step) / 48)
                    #expect(frame.maxY <= layout.dockRect.minY, "\(l.name) placed=\(hasPlaced) step \(step): rover \(frame) vs dock \(layout.dockRect)")
                    #expect(!frame.intersects(layout.dockRect), "\(l.name) placed=\(hasPlaced) step \(step)")
                }
            }
        }
    }

    @Test func theRoverRidesTheRoadsLowerHalf() {
        for l in Self.layouts {
            let layout = BaseLayout(size: l.size, insets: l.insets, zones: .standard)
            let frame = layout.roverFrame(phase: 0.5)
            #expect(frame.maxY >= layout.roadY, "\(l.name): wheels above the road centre line")
            #expect(frame.maxY <= layout.roadY + 11, "\(l.name): wheels below the road's lower edge")
        }
    }

    @Test func theRoverEntersAndLeavesOffScreen() {
        for l in Self.layouts {
            let layout = BaseLayout(size: l.size, insets: l.insets, zones: .standard)
            #expect(layout.roverFrame(phase: 0).maxX <= 0, "\(l.name): visible at the start of the loop")
            #expect(layout.roverFrame(phase: 1).minX >= l.size.width, "\(l.name): visible at the end of the loop")
        }
    }
}
