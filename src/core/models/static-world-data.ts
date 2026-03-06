import type { RegionDefinition, StrategicRoute } from "./world";
import type { RegionId } from "./types";

export interface StaticWorldData {
  mapId: string;
  definitions: Record<RegionId, RegionDefinition>;
  neighborsByRegionId: Record<RegionId, RegionId[]>;
  routes: StrategicRoute[];
}
