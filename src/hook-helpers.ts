import { createDiscordRoomRef } from "./room-key.js";
import type { RoomEvent, RoomRef } from "./types.js";

interface LooseMessageContext {
  channelId?: string;
  accountId?: string;
  conversationId?: string;
  userId?: string;
}

interface LooseMessageReceivedEvent {
  from: string;
  content: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

interface LooseBeforeMessageWriteEvent {
  message: unknown;
  sessionKey?: string;
  agentId?: string;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stripReplyTagPrefix(text: string): string {
  return text.replace(/^\s*\[\[[^\]]+\]\]\s*/u, "").trim();
}

function isNoReplyText(text: string): boolean {
  return stripReplyTagPrefix(text).trim() === "NO_REPLY";
}

function isSessionBootstrapText(text: string): boolean {
  const normalized = stripReplyTagPrefix(text).trim();
  if (!normalized) return false;

  return (
    normalized === "/new" ||
    normalized === "/reset" ||
    normalized.startsWith("A new session was started via /new or /reset.") ||
    normalized.includes("Run your Session Startup sequence")
  );
}

function parseDiscordConversationRef(conversationId?: string): RoomRef | null {
  const value = asString(conversationId);
  if (!value) return null;
  if (value.startsWith("thread:")) {
    return createDiscordRoomRef({ scope: "thread", targetId: value.slice("thread:".length) });
  }
  if (value.startsWith("channel:")) {
    return createDiscordRoomRef({ scope: "channel", targetId: value.slice("channel:".length) });
  }
  if (/^\d+$/.test(value)) {
    return createDiscordRoomRef({ scope: "channel", targetId: value });
  }
  return null;
}

export function roomRefFromSessionKey(sessionKey?: string): RoomRef | null {
  const value = asString(sessionKey);
  if (!value) return null;
  const match = value.match(/:discord:(channel|thread):([^:]+)$/);
  if (!match) return null;
  return createDiscordRoomRef({
    scope: match[1] as "channel" | "thread",
    targetId: match[2],
  });
}

export function roomRefFromMessageContext(
  ctx: LooseMessageContext,
  metadata?: Record<string, unknown>,
): RoomRef | null {
  const threadId = asString(metadata?.threadId ?? metadata?.thread_id);
  if (threadId) return createDiscordRoomRef({ scope: "thread", targetId: threadId });

  const channelId = asString(metadata?.channelId ?? metadata?.channel_id);
  if (channelId) return createDiscordRoomRef({ scope: "channel", targetId: channelId });

  return parseDiscordConversationRef(ctx.conversationId);
}

export function extractProviderMessageId(metadata?: Record<string, unknown>): string | undefined {
  return asString(
    metadata?.messageId ?? metadata?.message_id ?? metadata?.id ?? metadata?.eventId,
  );
}

export function extractContextUserId(ctx: LooseMessageContext): string | undefined {
  return asString(ctx.userId);
}

function extractHumanAuthorId(event: LooseMessageReceivedEvent): string {
  return (
    asString(
      event.metadata?.senderId ??
        event.metadata?.sender_id ??
        event.metadata?.userId ??
        event.metadata?.user_id ??
        event.metadata?.authorId ??
        event.metadata?.author_id ??
        event.metadata?.messageAuthorId ??
        event.metadata?.message_author_id,
    ) ?? event.from
  );
}

function extractHumanAuthorLabel(event: LooseMessageReceivedEvent): string | undefined {
  return asString(
    event.metadata?.senderName ??
      event.metadata?.sender_name ??
      event.metadata?.displayName ??
      event.metadata?.display_name ??
      event.metadata?.username ??
      event.metadata?.user_name ??
      event.metadata?.name,
  );
}

export function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  const parts = content
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const type = (entry as { type?: unknown }).type;
      if (type !== "text") return "";
      const text = (entry as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean);
  return parts.join("\n").trim();
}

export function roomEventFromInbound(
  room: RoomRef,
  event: LooseMessageReceivedEvent,
): RoomEvent | null {
  const text = event.content?.trim();
  if (!text) return null;
  if (isSessionBootstrapText(text)) return null;
  return {
    roomKey: room.roomKey,
    providerMessageId: extractProviderMessageId(event.metadata),
    authorType: "human",
    authorId: extractHumanAuthorId(event),
    authorLabel: extractHumanAuthorLabel(event),
    text,
    timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
  };
}

export function roomEventFromTranscriptWrite(
  room: RoomRef,
  agentId: string | undefined,
  sessionKey: string | undefined,
  event: LooseBeforeMessageWriteEvent,
): RoomEvent | null {
  const message = event.message as {
    role?: unknown;
    content?: unknown;
    timestamp?: unknown;
    provider?: unknown;
    model?: unknown;
  };

  if (message.role !== "assistant") return null;
  if (message.provider === "openclaw" && message.model === "delivery-mirror") return null;

  const rawText = extractTextContent(message.content);
  if (!rawText) return null;
  if (isNoReplyText(rawText)) return null;
  const text = stripReplyTagPrefix(rawText);

  return {
    roomKey: room.roomKey,
    authorType: "agent",
    authorId: agentId ?? "unknown-agent",
    authorLabel: agentId ?? "unknown-agent",
    text,
    timestamp:
      typeof message.timestamp === "number"
        ? new Date(message.timestamp).toISOString()
        : new Date().toISOString(),
    sourceSessionKey: sessionKey,
    participantAgentId: agentId,
  };
}
