import path from "node:path";
import { safeRoomFileName } from "./room-key.js";

export interface RoomStorePaths {
  rootDir: string;
  roomsDir: string;
  stateDir: string;
  roomFile: string;
  indexFile: string;
}

export function getRoomStorePaths(rootDir: string, roomKey: string): RoomStorePaths {
  const roomsDir = path.join(rootDir, "rooms");
  const stateDir = path.join(rootDir, "state");
  return {
    rootDir,
    roomsDir,
    stateDir,
    roomFile: path.join(roomsDir, `${safeRoomFileName(roomKey)}.jsonl`),
    indexFile: path.join(roomsDir, "index.json"),
  };
}
