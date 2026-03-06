import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  CommandLogRepository,
  GameStateRepository,
  SaveRepository,
  SaveSlotId,
  SaveSnapshot,
  SaveSummary,
  SnapshotRepository
} from "../../core/contracts/game-ports";
import type { CommandLogEntry, SnapshotSummary, StateSnapshot } from "../../core/models/commands";
import type { GameState } from "../../core/models/game-state";
import {
  SAVE_SCHEMA_VERSION,
  isValidGameStateShape,
  normalizeCurrentStateEnvelope,
  normalizeSaveEnvelope,
  toSaveEnvelope,
  type CurrentStateEnvelope,
  type SaveEnvelope
} from "./save-schema";

const DB_NAME = "medieval-idle-kingdom";
const DB_VERSION = 2;
const CURRENT_STATE_KEY = "current";

type CommandIssuerType = CommandLogEntry["issuerType"];

type SnapshotReason = StateSnapshot["reason"];

interface CommandLogEnvelope {
  schemaVersion: number;
  storedAt: number;
  entry: CommandLogEntry;
}

interface StateSnapshotEnvelope {
  schemaVersion: number;
  storedAt: number;
  snapshot: StateSnapshot;
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
  command_log: {
    key: number;
    value: CommandLogEnvelope;
  };
  state_snapshots: {
    key: string;
    value: StateSnapshotEnvelope;
  };
}

function createCurrentEnvelope(state: GameState): CurrentStateEnvelope {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    storedAt: Date.now(),
    state
  };
}

function createCommandEnvelope(entry: CommandLogEntry): CommandLogEnvelope {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    storedAt: Date.now(),
    entry
  };
}

function createSnapshotEnvelope(snapshot: StateSnapshot): StateSnapshotEnvelope {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    storedAt: Date.now(),
    snapshot
  };
}

function isValidIssuerType(value: unknown): value is CommandIssuerType {
  return value === "player" || value === "npc" || value === "system";
}

function isValidCommandEntry(input: unknown): input is CommandLogEntry {
  if (!input || typeof input !== "object") {
    return false;
  }

  const entry = input as Partial<CommandLogEntry>;

  return (
    typeof entry.sequence === "number" &&
    Number.isInteger(entry.sequence) &&
    entry.sequence > 0 &&
    typeof entry.id === "string" &&
    isValidIssuerType(entry.issuerType) &&
    typeof entry.issuerId === "string" &&
    typeof entry.tick === "number" &&
    Number.isInteger(entry.tick) &&
    typeof entry.commandType === "string" &&
    !!entry.payload &&
    typeof entry.payload === "object" &&
    typeof entry.createdAt === "number" &&
    typeof entry.previousHash === "string" &&
    typeof entry.hash === "string"
  );
}

function isValidSnapshotReason(value: unknown): value is SnapshotReason {
  return value === "bootstrap" || value === "periodic" || value === "manual" || value === "safety" || value === "autosave";
}

function isValidStateSnapshot(input: unknown): input is StateSnapshot {
  if (!input || typeof input !== "object") {
    return false;
  }

  const snapshot = input as Partial<StateSnapshot>;

  return (
    typeof snapshot.id === "string" &&
    typeof snapshot.tick === "number" &&
    Number.isInteger(snapshot.tick) &&
    typeof snapshot.savedAt === "number" &&
    isValidSnapshotReason(snapshot.reason) &&
    typeof snapshot.commandSequence === "number" &&
    Number.isInteger(snapshot.commandSequence) &&
    snapshot.commandSequence >= 0 &&
    typeof snapshot.commandHash === "string" &&
    (typeof snapshot.stateHash === "undefined" || typeof snapshot.stateHash === "string") &&
    isValidGameStateShape(snapshot.state)
  );
}

function normalizeCommandEnvelope(input: unknown): CommandLogEnvelope | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const envelope = input as Partial<CommandLogEnvelope>;

  if (envelope.schemaVersion !== SAVE_SCHEMA_VERSION || typeof envelope.storedAt !== "number" || !isValidCommandEntry(envelope.entry)) {
    return null;
  }

  return envelope as CommandLogEnvelope;
}

function normalizeSnapshotEnvelope(input: unknown): StateSnapshotEnvelope | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const envelope = input as Partial<StateSnapshotEnvelope>;

  if (envelope.schemaVersion !== SAVE_SCHEMA_VERSION || typeof envelope.storedAt !== "number" || !isValidStateSnapshot(envelope.snapshot)) {
    return null;
  }

  return envelope as StateSnapshotEnvelope;
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

      if (!db.objectStoreNames.contains("command_log")) {
        db.createObjectStore("command_log");
      }

      if (!db.objectStoreNames.contains("state_snapshots")) {
        db.createObjectStore("state_snapshots");
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

    const normalized = normalizeCurrentStateEnvelope(envelope);

    if (!normalized) {
      await db.delete("current_state", CURRENT_STATE_KEY);
      return null;
    }

    if (envelope.schemaVersion !== normalized.schemaVersion) {
      await db.put("current_state", normalized, CURRENT_STATE_KEY);
    }

    return normalized.state;
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

    const normalized = normalizeSaveEnvelope(envelope);

    if (!normalized) {
      await db.delete("save_slots", slotId);
      return null;
    }

    if (envelope.schemaVersion !== normalized.schemaVersion) {
      await db.put("save_slots", normalized, slotId);
    }

    return normalized.snapshot;
  }

  async listSlots(): Promise<SaveSummary[]> {
    const db = await this.dbPromise;
    const transaction = db.transaction("save_slots", "readonly");
    const store = transaction.objectStore("save_slots");
    const keys = await store.getAllKeys();

    const summaries: SaveSummary[] = [];

    for (const key of keys) {
      const envelope = await store.get(key as SaveSlotId);
      const normalized = normalizeSaveEnvelope(envelope);

      if (!normalized) {
        continue;
      }

      summaries.push(normalized.snapshot.summary);
    }

    await transaction.done;

    return summaries.sort((a, b) => b.savedAt - a.savedAt);
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("save_slots", slotId);
  }
}

export class IndexedDbCommandLogRepository implements CommandLogRepository {
  constructor(private readonly dbPromise: Promise<IDBPDatabase<MedievalDbSchema>> = openGameDb()) {}

  async append(entries: CommandLogEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const db = await this.dbPromise;
    const tx = db.transaction("command_log", "readwrite");
    const store = tx.objectStore("command_log");

    for (const entry of entries) {
      await store.put(createCommandEnvelope(entry), entry.sequence);
    }

    await tx.done;
  }

  async latest(): Promise<CommandLogEntry | null> {
    const db = await this.dbPromise;
    const tx = db.transaction("command_log", "readonly");
    const store = tx.objectStore("command_log");
    const keys = await store.getAllKeys();

    if (keys.length === 0) {
      await tx.done;
      return null;
    }

    const latestSequence = Math.max(...keys.map((item) => Number(item)));
    const envelope = await store.get(latestSequence);
    await tx.done;

    return normalizeCommandEnvelope(envelope)?.entry ?? null;
  }

  async listAfter(sequence: number, limit = 200): Promise<CommandLogEntry[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("command_log", "readonly");
    const store = tx.objectStore("command_log");
    const keys = await store.getAllKeys();

    const sortedKeys = keys
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > sequence)
      .sort((left, right) => left - right)
      .slice(0, Math.max(1, limit));

    const entries: CommandLogEntry[] = [];

    for (const key of sortedKeys) {
      const envelope = await store.get(key);
      const normalized = normalizeCommandEnvelope(envelope);
      if (normalized) {
        entries.push(normalized.entry);
      }
    }

    await tx.done;
    return entries;
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear("command_log");
  }
}

export class IndexedDbSnapshotRepository implements SnapshotRepository {
  constructor(private readonly dbPromise: Promise<IDBPDatabase<MedievalDbSchema>> = openGameDb()) {}

  async save(snapshot: StateSnapshot): Promise<void> {
    const db = await this.dbPromise;
    await db.put("state_snapshots", createSnapshotEnvelope(snapshot), snapshot.id);
  }

  async latest(): Promise<StateSnapshot | null> {
    const summaries = await this.list(1);

    if (summaries.length === 0) {
      return null;
    }

    return this.load(summaries[0].id);
  }

  async load(snapshotId: string): Promise<StateSnapshot | null> {
    const db = await this.dbPromise;
    const envelope = await db.get("state_snapshots", snapshotId);
    return normalizeSnapshotEnvelope(envelope)?.snapshot ?? null;
  }

  async list(limit = 20): Promise<SnapshotSummary[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("state_snapshots", "readonly");
    const store = tx.objectStore("state_snapshots");
    const keys = await store.getAllKeys();

    const summaries: SnapshotSummary[] = [];

    for (const key of keys) {
      const envelope = await store.get(String(key));
      const normalized = normalizeSnapshotEnvelope(envelope);

      if (!normalized) {
        continue;
      }

      const snapshot = normalized.snapshot;
      summaries.push({
        id: snapshot.id,
        tick: snapshot.tick,
        savedAt: snapshot.savedAt,
        reason: snapshot.reason,
        commandSequence: snapshot.commandSequence,
        commandHash: snapshot.commandHash,
        stateHash: snapshot.stateHash
      });
    }

    await tx.done;

    return summaries
      .sort((left, right) => {
        if (right.savedAt !== left.savedAt) {
          return right.savedAt - left.savedAt;
        }

        return right.tick - left.tick;
      })
      .slice(0, Math.max(1, limit));
  }

  async delete(snapshotId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("state_snapshots", snapshotId);
  }
}
