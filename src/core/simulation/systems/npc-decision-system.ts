import type { INpcDecisionService } from "../../contracts/services";
import type { SimulationSystem } from "../tick-pipeline";
import { createEventId } from "./utils";

export function createNpcDecisionSystem(decisionService: INpcDecisionService): SimulationSystem {
  return {
    id: "npc_decision",
    run(context): void {
      const state = context.nextState;

      for (const kingdom of Object.values(state.kingdoms)) {
        if (kingdom.isPlayer || !kingdom.npc) {
          continue;
        }

        const decisions = decisionService.decide(state, kingdom.id);

        for (const decision of decisions) {
          context.events.push({
            id: createEventId("evt_npc", state.meta.tick),
            type: "npc.decision",
            actorKingdomId: decision.actorKingdomId,
            targetKingdomId: decision.targetKingdomId,
            payload: {
              actionType: decision.actionType,
              priority: decision.priority,
              targetRegionId: decision.targetRegionId,
              ...decision.payload
            },
            occurredAt: context.now
          });
        }
      }
    }
  };
}
