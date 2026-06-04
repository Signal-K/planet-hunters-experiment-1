import { createMissionLog, pocketbase } from "./pocketbase";
import { getState, updateManyFromReact } from "./syncState";
import { runOnGodotThread, appController } from "./godot";

export interface MiningResult {
  minerals: Record<string, number>;
  score: number;
  target_id?: string;
}

/**
 * MissionService handles the lifecycle of mining missions and
 * their persistence to the Landnam PocketBase backend.
 */
export class MissionService {
  private static isListening = false;

  /**
   * Start listening for mission events from Godot.
   */
  static startListening() {
    if (this.isListening) return;
    this.isListening = true;

    // We poll for completion signals from Godot AppController
    // This is a bridge until we have full event emitters.
    setInterval(() => {
      this.checkForMissionCompletion();
    }, 2000);
  }

  private static async checkForMissionCompletion() {
    const result = await runOnGodotThread(() => {
      "worklet";
      const controller = appController() as any;
      if (!controller || !controller.get_last_mining_result) {
        return null;
      }
      
      const lastResult = controller.get_last_mining_result();
      if (lastResult && !lastResult.synced) {
        controller.mark_mining_result_synced();
        return lastResult;
      }
      return null;
    });

    if (result) {
      await this.processMiningResult(result);
    }
  }

  private static async processMiningResult(result: MiningResult) {
    const state = getState();
    const { data: { session } } = await pocketbase.auth.getSession();

    // 1. Calculate payout (Simplified for Release Today)
    const payout = result.score * 1000;
    const newBalance = state.francBalance + payout;
    const newXp = state.experienceXp + Math.floor(result.score / 10);

    // 2. Update local and cloud sync state
    await updateManyFromReact({
      francBalance: newBalance,
      experienceXp: newXp
    });

    if (session?.token) {
      await createMissionLog({
        action: 'mining_complete',
        payout_francs: payout,
        cargo_secured: result.minerals,
        target_id: result.target_id,
      });
    }

    console.log(`[MissionService] Mission complete! Payout: ${payout} F | XP Gained: ${newXp - state.experienceXp}`);
  }
}
