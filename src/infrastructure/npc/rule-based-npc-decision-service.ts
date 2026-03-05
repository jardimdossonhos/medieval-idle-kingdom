import { NpcArchetype } from "../../core/models/enums";
import type { INpcDecisionService, NpcDecision } from "../../core/contracts/services";
import type { GameState } from "../../core/models/game-state";

function armyStrengthFor(state: GameState, kingdomId: string): number {
  const kingdom = state.kingdoms[kingdomId];
  if (!kingdom) {
    return 0;
  }

  return kingdom.military.armies.reduce((total, army) => total + army.manpower * army.quality, 0);
}

export class RuleBasedNpcDecisionService implements INpcDecisionService {
  decide(state: GameState, actorKingdomId: string): NpcDecision[] {
    const actor = state.kingdoms[actorKingdomId];
    if (!actor || actor.isPlayer || !actor.npc) {
      return [];
    }

    if (state.meta.tick % 6 !== 0) {
      return [];
    }

    const player = Object.values(state.kingdoms).find((kingdom) => kingdom.isPlayer);
    if (!player) {
      return [];
    }

    const relation = actor.diplomacy.relations[player.id];
    if (!relation) {
      return [];
    }

    const actorStrength = armyStrengthFor(state, actor.id);
    const playerStrength = Math.max(1, armyStrengthFor(state, player.id));
    const strengthRatio = actorStrength / playerStrength;

    const decisions: NpcDecision[] = [];

    if (
      actor.npc.personality.archetype === NpcArchetype.Expansionist &&
      relation.score.rivalry > 0.35 &&
      strengthRatio > 1.05
    ) {
      decisions.push({
        actorKingdomId,
        actionType: "pressao_fronteirica",
        priority: 0.75,
        targetKingdomId: player.id,
        payload: {
          rationale: "expansionismo_oportunista",
          strengthRatio
        }
      });
    }

    if (relation.score.trust > 0.62 && actor.npc.personality.archetype === NpcArchetype.Diplomatic) {
      decisions.push({
        actorKingdomId,
        actionType: "oferta_alianca",
        priority: 0.6,
        targetKingdomId: player.id,
        payload: {
          rationale: "convergencia_diplomatica"
        }
      });
    }

    return decisions;
  }
}
