export type RoomProvider = "discord";
export type RoomScope = "channel" | "thread";
export type RoomAuthorType = "human" | "agent" | "system";

export type RoomKey = `${RoomProvider}:${RoomScope}:${string}`;

export interface RoomRef {
  roomKey: RoomKey;
  provider: RoomProvider;
  scope: RoomScope;
  targetId: string;
}

export interface RoomParticipant {
  agentId: string;
  label?: string;
  accountId?: string | null;
}

export interface RoomEvent {
  roomKey: RoomKey;
  providerMessageId?: string;
  authorType: RoomAuthorType;
  authorId: string;
  authorLabel?: string;
  text: string;
  timestamp: string;
  sourceSessionKey?: string;
  participantAgentId?: string;
}
