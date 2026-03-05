import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/application/boot/create-initial-state";
import { buildSaveSummary } from "../src/application/save/build-save-summary";

describe("buildSaveSummary", () => {
  it("creates a valid summary", () => {
    const state = createInitialState();
    state.meta.tick = 12;

    const summary = buildSaveSummary("manual-1", state, 1_700_000_000_000);

    expect(summary.slotId).toBe("manual-1");
    expect(summary.tick).toBe(12);
    expect(summary.playerKingdomName).toBe("Coroa da Ibéria");
    expect(summary.territoryCount).toBeGreaterThan(0);
  });
});