import Testing
import Foundation
@testable import LandnamCore

@Suite struct CloudSyncTests {
    @Test func savesCoalesceToOneWebShapedUpsert() async throws {
        let store = MemoryOutboxStore()
        let outbox = Outbox(store: store, execute: { _ in .offline })
        let sync = CloudSync(outbox: outbox)
        var s = GameState()
        await sync.save(s)  // no user yet: ignored
        #expect(await outbox.pending().isEmpty)
        await sync.setUser("abc123def456ghi")
        s.player.missionsDone = 1; await sync.save(s)
        s.player.missionsDone = 2; await sync.save(s)
        let p = await outbox.pending()
        #expect(p.count == 1)
        guard case .upsert(let c, let id, let f, let d) = p[0].op else { Issue.record("not upsert"); return }
        #expect(c == "game_states" && id == "abc123def456ghi" && f == "user = \"abc123def456ghi\"")
        #expect(d["missions_done"] == .number(2))
        guard case .object(let st)? = d["state"], case .object(let pl)? = st["player"] else { Issue.record("shape"); return }
        #expect(pl["missionsDone"] == .number(2))
    }

    @Test func milestonesScale() {
        var p = Player(); p.missionsDone = 5
        let a = Milestones.achievements(for: p)
        #expect(a[GameCenterID.firstLaunch] == 100 && a[GameCenterID.tenMissions] == 50)
    }
}
