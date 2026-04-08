import type { RoomKey, RoomRef } from "./types.js";

export function discordChannelRoomKey(channelId: string): RoomKey {
  return `discord:channel:${channelId}`;
}

export function discordThreadRoomKey(threadId: string): RoomKey {
  return `discord:thread:${threadId}`;
}

export function createDiscordRoomRef(input: {
  scope: "channel" | "thread";
  targetId: string;
}): RoomRef {
  const roomKey =
    input.scope === "thread"
      ? discordThreadRoomKey(input.targetId)
      : discordChannelRoomKey(input.targetId);

  return {
    roomKey,
    provider: "discord",
    scope: input.scope,
    targetId: input.targetId,
  };
}

export function safeRoomFileName(roomKey: string): string {
  return roomKey.replace(/[^a-zA-Z0-9:_-]/g, "_").replace(/[:]/g, "__");
}
