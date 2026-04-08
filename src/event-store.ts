import fs from "node:fs/promises";
import { getRoomStorePaths } from "./fs-store.js";
import type { RoomEvent, RoomParticipant, RoomRef } from "./types.js";

export interface StoredRoomEvent extends RoomEvent {
  eventKey: string;
  observedAt: string;
}

export interface RoomIndexEntry extends RoomRef {
  participants: RoomParticipant[];
  lastEventAt?: string;
  eventCount: number;
}

export type RoomIndex = Record<string, RoomIndexEntry>;

const roomLocks = new Map<string, Promise<unknown>>();

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function eventKeyFor(event: RoomEvent): string {
  if (event.providerMessageId) {
    return [
      event.roomKey,
      event.authorType,
      event.authorId,
      event.providerMessageId,
    ].join("|");
  }

  return [
    event.roomKey,
    event.authorType,
    event.authorId,
    event.timestamp,
    normalizeText(event.text).slice(0, 200),
  ].join("|");
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function withRoomLock<T>(roomKey: string, fn: () => Promise<T>): Promise<T> {
  const previous = roomLocks.get(roomKey) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chain = previous.then(() => gate);
  roomLocks.set(roomKey, chain);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (roomLocks.get(roomKey) === chain) {
      roomLocks.delete(roomKey);
    }
  }
}

async function readIndex(rootDir: string): Promise<RoomIndex> {
  const { indexFile, roomsDir } = getRoomStorePaths(rootDir, "index");
  await ensureDir(roomsDir);
  try {
    const raw = await fs.readFile(indexFile, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return {};
    throw error;
  }
}

async function writeIndex(rootDir: string, index: RoomIndex): Promise<void> {
  const { indexFile, roomsDir } = getRoomStorePaths(rootDir, "index");
  await ensureDir(roomsDir);
  await fs.writeFile(indexFile, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export async function listRooms(rootDir: string): Promise<RoomIndexEntry[]> {
  const index = await readIndex(rootDir);
  return Object.values(index).sort((a, b) => {
    const at = a.lastEventAt ? Date.parse(a.lastEventAt) : 0;
    const bt = b.lastEventAt ? Date.parse(b.lastEventAt) : 0;
    return bt - at;
  });
}

export async function getRoom(rootDir: string, roomKey: string): Promise<RoomIndexEntry | null> {
  const index = await readIndex(rootDir);
  return index[roomKey] ?? null;
}

export async function listRoomEvents(
  rootDir: string,
  roomKey: string,
  opts?: { limit?: number },
): Promise<StoredRoomEvent[]> {
  const { roomFile, roomsDir } = getRoomStorePaths(rootDir, roomKey);
  await ensureDir(roomsDir);
  let raw = "";
  try {
    raw = await fs.readFile(roomFile, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return [];
    throw error;
  }

  const deduped = new Map<string, StoredRoomEvent>();
  for (const line of raw.split(/\n+/).map((entry) => entry.trim()).filter(Boolean)) {
    const event = JSON.parse(line) as StoredRoomEvent;
    if (!deduped.has(event.eventKey)) deduped.set(event.eventKey, event);
  }

  const events = Array.from(deduped.values()).sort((a, b) => {
    const at = Date.parse(a.timestamp || a.observedAt || 0 as unknown as string);
    const bt = Date.parse(b.timestamp || b.observedAt || 0 as unknown as string);
    return at - bt;
  });

  const limit = opts?.limit ?? 50;
  return limit > 0 ? events.slice(-limit) : events;
}

async function hasEvent(rootDir: string, roomKey: string, eventKey: string): Promise<boolean> {
  const events = await listRoomEvents(rootDir, roomKey, { limit: 0 });
  return events.some((entry) => entry.eventKey === eventKey);
}

function mergeParticipants(
  current: RoomParticipant[],
  next?: RoomParticipant,
): RoomParticipant[] {
  if (!next?.agentId) return current;
  const existing = current.find((item) => item.agentId === next.agentId);
  if (!existing) return [...current, next];
  return current.map((item) =>
    item.agentId !== next.agentId
      ? item
      : {
          ...item,
          ...next,
          label: next.label ?? item.label,
          accountId: next.accountId ?? item.accountId,
        },
  );
}

export async function appendRoomEvent(
  rootDir: string,
  room: RoomRef,
  event: RoomEvent,
  opts?: { participant?: RoomParticipant },
): Promise<{ appended: boolean; event: StoredRoomEvent }> {
  return withRoomLock(room.roomKey, async () => {
    const { roomFile, roomsDir } = getRoomStorePaths(rootDir, room.roomKey);
    await ensureDir(roomsDir);

    const eventKey = eventKeyFor(event);
    const stored: StoredRoomEvent = {
      ...event,
      eventKey,
      observedAt: new Date().toISOString(),
    };

    if (await hasEvent(rootDir, room.roomKey, eventKey)) {
      return { appended: false, event: stored };
    }

    await fs.appendFile(roomFile, `${JSON.stringify(stored)}\n`, "utf8");

    const index = await readIndex(rootDir);
    const previous = index[room.roomKey];
    index[room.roomKey] = {
      ...room,
      participants: mergeParticipants(previous?.participants ?? [], opts?.participant),
      lastEventAt: event.timestamp,
      eventCount: (previous?.eventCount ?? 0) + 1,
    };
    await writeIndex(rootDir, index);

    return { appended: true, event: stored };
  });
}

export async function ensureRoomParticipant(
  rootDir: string,
  room: RoomRef,
  participant: RoomParticipant,
): Promise<void> {
  await withRoomLock(room.roomKey, async () => {
    const index = await readIndex(rootDir);
    const previous = index[room.roomKey];
    index[room.roomKey] = {
      ...room,
      participants: mergeParticipants(previous?.participants ?? [], participant),
      lastEventAt: previous?.lastEventAt,
      eventCount: previous?.eventCount ?? 0,
    };
    await writeIndex(rootDir, index);
  });
}
