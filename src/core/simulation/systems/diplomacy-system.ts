import { DiplomaticRelation } from "../../models/enums";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, getOwnedRegionIds, getPlayerKingdom, roundTo } from "./utils";

export function createDiplomacySystem(): SimulationSystem {
  return {
    id: "diplomacy",
    run(context): void {
      const state = context.nextState;
      const player = getPlayerKingdom(state);
      const playerTerritoryShare = getOwnedRegionIds(state, player.id).length / Math.max(1, Object.keys(state.world.regions).length);

      for (const kingdom of Object.values(state.kingdoms)) {
        for (const relation of Object.values(kingdom.diplomacy.relations)) {
          relation.score.trust = roundTo(clamp(relation.score.trust - relation.grievance * 0.01 + 0.002, 0, 1));
          relation.score.rivalry = roundTo(clamp(relation.score.rivalry + relation.score.borderTension * 0.005, 0, 1));

          if (relation.status === DiplomaticRelation.Allied) {
            relation.score.trust = roundTo(clamp(relation.score.trust + 0.01, 0, 1));
          }

          if (relation.status === DiplomaticRelation.Hostile) {
            relation.grievance = roundTo(clamp(relation.grievance + 0.01, 0, 1));
          }
        }

        if (!kingdom.isPlayer) {
          kingdom.diplomacy.coalitionThreat = roundTo(clamp(playerTerritoryShare * 0.9 + kingdom.diplomacy.warExhaustion * 0.1, 0, 1));
        }
      }
    }
  };
}
