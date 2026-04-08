import fs from "node:fs/promises";
import path from "node:path";
import { safeRoomFileName } from "./room-key.js";

function checkpointFile(rootDir: string, sessionKey: string, roomKey: string): string {
  return path.join(
    rootDir,
    "state",
    `${safeRoomFileName(sessionKey)}__${safeRoomFileName(roomKey)}.json`,
  );
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function hasCheckpoint(
  rootDir: string,
  sessionKey: string,
  roomKey: string,
): Promise<boolean> {
  const file = checkpointFile(rootDir, sessionKey, roomKey);
  try {
    await fs.access(file);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return false;
    throw error;
  }
}

export async function getLastSeenEventKey(
  rootDir: string,
  sessionKey: string,
  roomKey: string,
): Promise<string | null> {
  const file = checkpointFile(rootDir, sessionKey, roomKey);
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as { lastSeenEventKey?: unknown };
    return typeof parsed.lastSeenEventKey === "string" && parsed.lastSeenEventKey.trim()
      ? parsed.lastSeenEventKey
      : null;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function setLastSeenEventKey(
  rootDir: string,
  sessionKey: string,
  roomKey: string,
  eventKey: string,
): Promise<void> {
  const file = checkpointFile(rootDir, sessionKey, roomKey);
  await ensureDir(path.dirname(file));
  await fs.writeFile(
    file,
    `${JSON.stringify({ sessionKey, roomKey, lastSeenEventKey: eventKey, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}
