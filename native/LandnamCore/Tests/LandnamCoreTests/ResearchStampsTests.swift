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
        let server = CommunityResearch(month: "2026-10", others: 500, goal: 1000, bonusPct: 3, reachedAt: nil, bonusUntil: nil)
        XCTAssertEqual(ResearchStampRules.communityBar(own: 10, server: server).fill, 0.51, accuracy: 0.001)
        XCTAssertFalse(ResearchStampRules.communityBar(own: 10, server: server).reached)
        var full = server; full.others = 995; full.reachedAt = t
        XCTAssertTrue(ResearchStampRules.communityBar(own: 10, server: full).reached)
        XCTAssertEqual(ResearchStampRules.communityBar(own: 4).total, 4)
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

    func testResearchInkConversionKeepsTheResearchWeekRecord() throws {
        var p = Player()
        p.researchFragments = 25
        ResearchFragments.record(&p, id: "community-research-2026-10-19", title: "Explorer week of 2026-10-19", fragments: 25, badgeId: "community-research-2026-10-19")
        XCTAssertEqual(ResearchFragments.convertAvailable(&p), 2)
        XCTAssertEqual(p.researchFragments, 5)
        XCTAssertEqual(p.researchUniversalFragments, 2)
        XCTAssertEqual(p.researchFragmentHistory, [.init(id: "community-research-2026-10-19", title: "Explorer week of 2026-10-19", fragmentsEarned: 25, badgeId: "community-research-2026-10-19")])
        let back = try JSONDecoder().decode(Player.self, from: JSONEncoder().encode(p))
        XCTAssertEqual(back.researchUniversalFragments, 2)
        XCTAssertEqual(back.researchFragmentHistory, p.researchFragmentHistory)
    }

    /// SSL-674: collecting a survey flight to a discovered world stamps the day; a client job does not.
    func testDiscoverySurveyDebriefStampsDiscoveryMission() {
        var s = GameState(); s.screen = .debrief; s.missionId = "exo-survey-exo-subject-42"; s.targetId = "exo-subject-42"; s.lastCargo = [:]
        let done = Loop.debriefDone(s, payout: 0, affinity: 0, catalog: Catalog(), now: t)
        XCTAssertEqual(done.player.researchStamps.days[ResearchStampRules.dayKey(t)], [.discoveryMission])
        var other = s; other.missionId = Catalog().missions.first?.id; other.targetId = "moon"
        XCTAssertEqual(Loop.debriefDone(other, payout: 0, affinity: 0, catalog: Catalog(), now: t).player.researchStamps.days[ResearchStampRules.dayKey(t)], [.contractRun])
        XCTAssertEqual(ResearchStampRules.tasks(hasDiscovery: false).count, 3)
        XCTAssertEqual(ResearchStampRules.tasks(hasDiscovery: true).last?.kind, .discoveryMission)
    }

    /// Research stamps remain a union when a save is merged from another device.
    func testCloudMergeKeepsStampsFromBothDevices() {
        var local = GameState(); local.player.missionsDone = 3; local.updatedAt = 1
        local.player.researchStamps.days["2026-10-20"] = [.classification]
        var remote = local; remote.updatedAt = 2
        remote.player.researchStamps.days = ["2026-10-20": [.event], "2026-10-21": [.survey]]
        remote.player.researchUniversalFragments = 2
        remote.player.researchFragmentHistory = [.init(id: "community-research-2026-10-19", title: "Explorer week of 2026-10-19", fragmentsEarned: 25, badgeId: "community-research-2026-10-19")]
        local.player.researchFragmentHistory = [.init(id: "orionids-2026", title: "Orionids shower", fragmentsEarned: 20)]
        let merged = CloudMerge.merge(local: local, remote: remote)
        XCTAssertEqual(merged.player.researchStamps.days["2026-10-20"], [.classification, .event])
        XCTAssertEqual(merged.player.researchStamps.days["2026-10-21"], [.survey])
        XCTAssertEqual(merged.player.researchUniversalFragments, 2)
        XCTAssertEqual(merged.player.researchFragmentHistory.map(\.id), ["orionids-2026", "community-research-2026-10-19"])
        // A remote further along still keeps the local stamps.
        var ahead = remote; ahead.player.missionsDone = 9; ahead.player.researchStamps.days = [:]
        XCTAssertEqual(CloudMerge.merge(local: local, remote: ahead).player.researchStamps.days["2026-10-20"], [.classification])
    }

    func testResearchPathLocksForUtcWeekAndResetsOnMonday() {
        let choice = ResearchPathChoice(week: ResearchPathRules.weekKey(t), path: .trader)
        XCTAssertEqual(ResearchPathRules.pathThisWeek(choice, now: t), .trader)
        XCTAssertNil(ResearchPathRules.pathThisWeek(choice, now: t + 7 * day))
        XCTAssertEqual(ResearchPathRules.steps(.trader).count, 5)
    }

    func testTraderRewardsAreClaimedOncePerWeek() {
        var player = Player()
        player.researchPath = ResearchPathChoice(week: ResearchPathRules.weekKey(t), path: .trader)
        let step = ResearchPathRules.steps(.trader)[1]
        let progress = (have: 1, need: 1)
        XCTAssertTrue(ResearchPathRules.claim(&player, step: step, progress: progress, now: t))
        XCTAssertEqual(player.researchFragments, 5)
        XCTAssertFalse(ResearchPathRules.claim(&player, step: step, progress: progress, now: t))
        XCTAssertEqual(player.researchPath?.claimedSteps, [2])
    }
}
