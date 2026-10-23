import XCTest
@testable import LandnamCore

final class ResearchStampsTests: XCTestCase {
    private let day: Double = 86_400_000
    // 2026-10-22 12:00 UTC
    private let t: Double = 1_792_670_400_000

    func testStampsADayOncePerKind() {
        var p = Player()
        ResearchStampRules.add(&p, .survey, at: t)
        XCTAssertEqual(p.researchStamps.days, ["2026-10-22": [.survey]])
        let before = p.researchStamps
        ResearchStampRules.add(&p, .survey, at: t + 1000)
        XCTAssertEqual(p.researchStamps, before)
        ResearchStampRules.add(&p, .event, at: t)
        XCTAssertEqual(p.researchStamps.days["2026-10-22"], [.survey, .event])
    }

    func testDropsBadDaysAndKindsOnLoad() throws {
        let json = #"{"2026-10-22":["survey","nope"],"bad":["survey"],"2026-10-21":"x"}"#
        let s = try JSONDecoder().decode(ResearchStamps.self, from: Data(json.utf8))
        XCTAssertEqual(s.days, ["2026-10-22": [.survey]])
        XCTAssertEqual(try JSONDecoder().decode(ResearchStamps.self, from: Data("[]".utf8)).days, [:])
    }

    func testMergesPerDayAsUnion() {
        let m = ResearchStampRules.merge(ResearchStamps(["2026-10-22": [.survey]]), ResearchStamps(["2026-10-22": [.event], "2026-10-21": [.survey]]))
        XCTAssertEqual(m.days, ["2026-10-22": [.survey, .event], "2026-10-21": [.survey]])
    }

    func testSoftStreak() {
        let y = ResearchStampRules.dayKey(t - day), y2 = ResearchStampRules.dayKey(t - 2 * day)
        var s = ResearchStamps([y: [.survey], y2: [.survey]])
        XCTAssertEqual(ResearchStampRules.streak(s, now: t), 2)
        s.days[ResearchStampRules.dayKey(t)] = [.event]
        XCTAssertEqual(ResearchStampRules.streak(s, now: t), 3)
        XCTAssertEqual(ResearchStampRules.streak(ResearchStamps([ResearchStampRules.dayKey(t - 3 * day): [.survey]]), now: t), 0)
    }

    func testOctober2026StartsThursdayWithMondayWeeks() {
        let weeks = ResearchStampRules.monthGrid(year: 2026, month: 10, stamps: ResearchStamps(["2026-10-22": [.survey]]), now: t)
        XCTAssertEqual(weeks[0].prefix(3).map { $0 == nil }, [true, true, true])
        XCTAssertEqual(weeks[0][3]?.day, 1)
        XCTAssertEqual(weeks.flatMap { $0 }.compactMap { $0 }.count, 31)
        XCTAssertEqual(weeks.flatMap { $0 }.compactMap { $0 }.first { $0.today }?.day, 22)
        XCTAssertTrue(weeks.allSatisfy { $0.count == 7 })
    }

    func testMonthCountAndCommunityBar() {
        XCTAssertEqual(ResearchStampRules.stampsIn(ResearchStamps(["2026-10-01": [.survey, .event], "2026-09-30": [.survey]]), year: 2026, month: 10), 2)
        XCTAssertEqual(ResearchStampRules.communityBar(own: 10, others: 500).fill, 0.51, accuracy: 0.001)
        XCTAssertTrue(ResearchStampRules.communityBar(own: 10, others: 995).reached)
    }

    func testSaveRoundTripKeepsWebStamps() throws {
        let json = #"{"researchStamps":{"2026-10-22":["classification","event"]}}"#
        let p = try JSONDecoder().decode(Player.self, from: Data(json.utf8))
        XCTAssertEqual(p.researchStamps.days["2026-10-22"], [.classification, .event])
        let out = try JSONEncoder().encode(p)
        let back = try JSONDecoder().decode(Player.self, from: out)
        XCTAssertEqual(back.researchStamps, p.researchStamps)
    }

    func testLaunchCatchStampsOnlyWhenFragmentsAreCaught() {
        var p = Player()
        OrionidsRun.applyLaunchCatch(&p, at: t) 
        XCTAssertEqual(p.researchStamps.days.count, OrionidsRun.fragmentsCaughtOnLaunch(at: t) > 0 ? 1 : 0)
    }
}
