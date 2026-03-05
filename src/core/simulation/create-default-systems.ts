import type { INpcDecisionService } from "../contracts/services";
import type { SimulationSystem } from "./tick-pipeline";
import { createDiplomacySystem } from "./systems/diplomacy-system";
import { createEconomySystem } from "./systems/economy-system";
import { createEventLogSystem } from "./systems/event-log-system";
import { createNpcDecisionSystem } from "./systems/npc-decision-system";
import { createPopulationSystem } from "./systems/population-system";
import { createTechnologySystem } from "./systems/technology-system";
import { createVictorySystem } from "./systems/victory-system";

export function createDefaultSimulationSystems(npcDecisionService: INpcDecisionService): SimulationSystem[] {
  return [
    createEconomySystem(),
    createPopulationSystem(),
    createTechnologySystem(),
    createDiplomacySystem(),
    createNpcDecisionSystem(npcDecisionService),
    createVictorySystem(),
    createEventLogSystem()
  ];
}
