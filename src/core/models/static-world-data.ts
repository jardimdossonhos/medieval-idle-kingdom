import type { RegionDefinition, StrategicRoute } from "./world";
import type { RegionId, ReligionId } from "./types";

export interface ReligionBonuses {
  economyMult: number;
  stabilityMult: number;
  militaryMoraleMult: number;
  missionaryPower: number;
  authorityGrowth: number;
  toleranceBaseline: number;
  warZeal: number;
}

export interface ReligionDefinition {
  id: ReligionId;
  name: string;
  color: string;
  bonuses: ReligionBonuses;
}

export interface StaticWorldData {
  mapId: string;
  definitions: Record<RegionId, RegionDefinition>;
  neighborsByRegionId: Record<RegionId, RegionId[]>;
  routes: StrategicRoute[];
  religions: Record<ReligionId, ReligionDefinition>;
}
