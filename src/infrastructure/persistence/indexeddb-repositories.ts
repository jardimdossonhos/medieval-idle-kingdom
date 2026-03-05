import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { GameStateRepository, SaveRepository, SaveSlotId, SaveSnapshot, SaveSummary } from "../../core/contracts/game-ports";
import type { GameState } from "../../core/models/game-state";
import { SAVE_SCHEMA_VERSION, isValidEnvelope, isValidGameStateShape, toSaveEnvelope, type SaveEnvelope } from "./save-schema";

const DB_NAME = "medieval-idle-kingdom";
const DB_VERSION = 1;
const CURRENT_STATE_KEY = "current";

interface CurrentStateEnvelope {
  schemaVersion: number;
  storedAt: number;
  state: GameState;
}

interface MedievalDbSchema extends DBSchema {
  current_state: {
    key: string;
    value: CurrentStateEnvelope;
  };
  save_slots: {
    key: SaveSlotId;
    value: SaveEnvelope;
  };
}

function createCurrentEnvelope(state: GameState): CurrentStateEnvelope {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    storedAt: Date.now(),
    state
  };
}

function isValidCurrentEnvelope(input: unknown): input is CurrentStateEnvelope {
  if (!input || typeof input !== "object") {
    return false;
  }

  const envelope = input as Partial<CurrentStateEnvelope>;
  return envelope.schemaVersion === SAVE_SCHEMA_VERSION && typeof envelope.storedAt === "number" && isValidGameStateShape(envelope.state);
}

async function openGameDb(): Promise<IDBPDatabase<MedievalDbSchema>> {
  return openDB<MedievalDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("current_state")) {
        db.createObjectStore("current_state");
      }

      if (!db.objectStoreNames.contains("save_slots")) {
        db.createObjectStore("save_slots");
      }
    }
  });
}

export class IndexedDbGameStateRepository implements GameStateRepository {
  constructor(private readonly dbPromise: Promise<IDBPDatabase<MedievalDbSchema>> = openGameDb()) {}

  async loadCurrent(): Promise<GameState | null> {
    const db = await this.dbPromise;
    const envelope = await db.get("current_state", CURRENT_STATE_KEY);

    if (!envelope) {
      return null;
    }

    if (!isValidCurrentEnvelope(envelope)) {
      await db.delete("current_state", CURRENT_STATE_KEY);
      return null;
    }

    return envelope.state;
  }

  async saveCurrent(state: GameState): Promise<void> {
    const db = await this.dbPromise;
    await db.put("current_state", createCurrentEnvelope(state), CURRENT_STATE_KEY);
  }

  async clearCurrent(): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("current_state", CURRENT_STATE_KEY);
  }
}

export class IndexedDbSaveRepository implements SaveRepository {
  constructor(private readonly dbPromise: Promise<IDBPDatabase<MedievalDbSchema>> = openGameDb()) {}

  async saveToSlot(snapshot: SaveSnapshot): Promise<void> {
    const db = await this.dbPromise;
    const envelope = toSaveEnvelope(snapshot);
    await db.put("save_slots", envelope, snapshot.summary.slotId);
  }

  async loadFromSlot(slotId: SaveSlotId): Promise<SaveSnapshot | null> {
    const db = await this.dbPromise;
    const envelope = await db.get("save_slots", slotId);

    if (!envelope) {
      return null;
    }

    if (!isValidEnvelope(envelope)) {
      await db.delete("save_slots", slotId);
      return null;
    }

    return envelope.snapshot;
  }

  async listSlots(): Promise<SaveSummary[]> {
    const db = await this.dbPromise;
    const transaction = db.transaction("save_slots", "readonly");
    const store = transaction.objectStore("save_slots");
    const keys = await store.getAllKeys();

    const summaries: SaveSummary[] = [];

    for (const key of keys) {
      const envelope = await store.get(key as SaveSlotId);
      if (!envelope || !isValidEnvelope(envelope)) {
        continue;
      }

      summaries.push(envelope.snapshot.summary);
    }

    await transaction.done;

    return summaries.sort((a, b) => b.savedAt - a.savedAt);
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("save_slots", slotId);
  }
}
