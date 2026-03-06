import { TechnologyDomain } from "../../models/enums";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, roundTo } from "./utils";

const RESEARCH_COST_PER_NODE = 100;

function nextResearchFor(kingdomId: string, domain: TechnologyDomain, tick: number): string {
  const tier = 1 + Math.floor(Math.max(0, tick) / 20);
  return `tech_${domain}_${kingdomId}_t${tier}`;
}

export function createTechnologySystem(): SimulationSystem {
  return {
    id: "technology",
    run(context): void {
      for (const kingdomId of Object.keys(context.nextState.kingdoms).sort()) {
        const kingdom = context.nextState.kingdoms[kingdomId];
        const budgetTechFactor = kingdom.economy.budgetPriority.technology / 20;
        const focusBoost = kingdom.technology.researchFocus === TechnologyDomain.Military ? 0.08 : 0.04;
        const researchDelta = kingdom.technology.researchRate * (0.5 + budgetTechFactor + focusBoost);

        kingdom.technology.accumulatedResearch = roundTo(kingdom.technology.accumulatedResearch + researchDelta);

        if (kingdom.technology.activeResearchId === null) {
          kingdom.technology.activeResearchId = nextResearchFor(kingdom.id, kingdom.technology.researchFocus, context.nextState.meta.tick);
        }

        if (kingdom.technology.accumulatedResearch >= RESEARCH_COST_PER_NODE && kingdom.technology.activeResearchId) {
          const completed = kingdom.technology.activeResearchId;

          if (!kingdom.technology.unlocked.includes(completed)) {
            kingdom.technology.unlocked.push(completed);
          }

          kingdom.technology.accumulatedResearch = roundTo(kingdom.technology.accumulatedResearch - RESEARCH_COST_PER_NODE);
          kingdom.technology.activeResearchId = nextResearchFor(
            kingdom.id,
            kingdom.technology.researchFocus,
            context.nextState.meta.tick + 1
          );
          kingdom.technology.researchRate = roundTo(clamp(kingdom.technology.researchRate + 0.02, 0.5, 3));

          if (kingdom.technology.researchFocus === TechnologyDomain.Military) {
            kingdom.military.militaryTechLevel = roundTo(clamp(kingdom.military.militaryTechLevel + 0.06, 1, 8));
          }

          context.events.push({
            id: createEventId("evt_research", context.nextState.meta.tick, context.events.length),
            type: "technology.completed",
            actorKingdomId: kingdom.id,
            payload: {
              technologyId: completed,
              unlockedCount: kingdom.technology.unlocked.length,
              focus: kingdom.technology.researchFocus
            },
            occurredAt: context.now
          });
        }
      }
    }
  };
}
