import type { StaticWorldData } from "../../core/models/static-world-data";
import type { RegionDefinition, StrategicRoute } from "../../core/models/world";
import { WORLD_DEFINITIONS_MAP_ID, WORLD_DEFINITIONS_V1 } from "./generated/world-definitions-v1";

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function buildRoutes(definitions: Record<string, RegionDefinition>): StrategicRoute[] {
  const routes: StrategicRoute[] = [];

  for (const regionId of Object.keys(definitions).sort()) {
    const definition = definitions[regionId];

    for (const neighborId of [...definition.neighbors].sort()) {
      if (regionId.localeCompare(neighborId) >= 0) {
        continue;
      }

      const neighbor = definitions[neighborId];
      if (!neighbor) {
        continue;
      }

      routes.push({
        id: `route_${regionId}_${neighborId}`,
        from: regionId,
        to: neighborId,
        routeType: definition.isCoastal && neighbor.isCoastal ? "sea" : "land",
        controlWeight: round(0.8 + ((definition.strategicValue + neighbor.strategicValue) / 20))
      });
    }
  }

  return routes;
}

export function createStaticWorldData(): StaticWorldData {
  const definitions: Record<string, RegionDefinition> = Object.fromEntries(
    [...WORLD_DEFINITIONS_V1]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((definition) => [definition.id, definition] as const)
  );

  const neighborsByRegionId: Record<string, string[]> = {};
  for (const regionId of Object.keys(definitions).sort()) {
    neighborsByRegionId[regionId] = [...definitions[regionId].neighbors].sort();
  }

  return {
    mapId: WORLD_DEFINITIONS_MAP_ID,
    definitions,
    neighborsByRegionId,
    routes: buildRoutes(definitions)
  };
}
