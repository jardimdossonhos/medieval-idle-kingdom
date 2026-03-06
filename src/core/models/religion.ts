import { ReligiousPolicy } from "./enums";
import type { KingdomId, ReligionId, TimestampMs } from "./types";

export interface ReligionState {
  stateFaith: ReligionId;
  policy: ReligiousPolicy;
  authority: number;
  cohesion: number;
  conversionPressure: number;
  tolerance: number;
  missionaryBudget: number;
  externalInfluenceIn: Partial<Record<KingdomId, number>>;
  holyWarCooldownUntil: TimestampMs;
}
