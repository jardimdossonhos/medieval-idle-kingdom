import type { EventLogEntry } from "../../models/events";
import type { SimulationSystem } from "../tick-pipeline";

function toLogEntry(type: string): Pick<EventLogEntry, "title" | "severity"> {
  switch (type) {
    case "economy.food_shortage":
      return { title: "Escassez de alimentos", severity: "warning" };
    case "population.unrest_warning":
      return { title: "Agitação regional", severity: "warning" };
    case "technology.completed":
      return { title: "Pesquisa concluída", severity: "info" };
    case "npc.decision":
      return { title: "Movimento diplomático estrangeiro", severity: "info" };
    case "victory.achieved":
      return { title: "Vitória alcançada", severity: "critical" };
    default:
      return { title: "Evento estratégico", severity: "info" };
  }
}

export function createEventLogSystem(maxEntries = 180): SimulationSystem {
  return {
    id: "event_log",
    run(context): void {
      if (context.events.length === 0) {
        return;
      }

      const newEntries: EventLogEntry[] = context.events.map((event) => {
        const descriptor = toLogEntry(event.type);

        return {
          id: event.id,
          title: descriptor.title,
          details: JSON.stringify(event.payload),
          severity: descriptor.severity,
          occurredAt: event.occurredAt
        };
      });

      context.nextState.events = [...newEntries, ...context.nextState.events].slice(0, maxEntries);
    }
  };
}
