import { describe, expect, it } from "vitest";
import { AUTO_SLOT_COUNT, createAutoSlotId, nextAutoSlot } from "../src/infrastructure/persistence/save-slots";

describe("save slot rotation", () => {
  it("bounds and rotates auto slots", () => {
    expect(createAutoSlotId(0)).toBe("auto-1");
    expect(createAutoSlotId(4)).toBe("auto-5");
    expect(createAutoSlotId(5)).toBe("auto-1");

    let index = 0;
    for (let i = 0; i < AUTO_SLOT_COUNT * 2; i += 1) {
      index = nextAutoSlot(index);
    }

    expect(index).toBe(0);
  });
});