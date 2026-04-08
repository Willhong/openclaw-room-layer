# OpenClaw Room Layer Plugin MVP

## Goal

Build a **hybrid room layer** on top of existing session-native OpenClaw behavior.

We do **not** replace agent/account sessions.
Instead, we add a plugin that:

- derives a stable `roomKey` from Discord channel/thread events
- records a shared room event log
- tracks room participants
- injects recent room context into participant prompts
- exposes room-oriented read APIs for dashboard/debugging

## Why this approach

Current OpenClaw Discord behavior is session-native:
- `agent:main:discord:channel:<channelId>`
- `agent:spark:discord:channel:<channelId>`

That means each agent sees its own session context.

The desired behavior is:
- one shared room context
- many participant runtimes
- controlled speaking policy

The hybrid room layer keeps current sessions for execution but adds a shared room memory/log above them.

## MVP scope

### In scope
1. Discord-only first version
2. Channel + thread -> `roomKey`
3. Shared room event log stored by plugin
4. Participant membership map
5. Recent room context injection before prompt build
6. HTTP read endpoints for room inspection

### Out of scope (for first pass)
1. Replacing OpenClaw core session model
2. Cross-platform room abstraction beyond Discord
3. Full dashboard integration
4. Automatic room-native dispatch replacement
5. Perfect dedupe across every edge case

## Core model

### Room
- `roomKey`: `discord:channel:<id>` or `discord:thread:<id>`
- `provider`: `discord`
- `scope`: `channel` | `thread`
- `targetId`: raw Discord id
- `participants`: agent ids
- `policy`: representative / mention-only / panel-mode etc.

### RoomEvent
- `roomKey`
- `providerMessageId`
- `authorType`: `human | agent | system`
- `authorId`
- `authorLabel`
- `text`
- `timestamp`
- `sourceSessionKey`
- `participantAgentId?`

### Session relation
- sessions remain the execution boundary
- room log becomes the shared context boundary

## Candidate hook points

These need validation during implementation, but current likely seams are:

1. `onConversationBindingResolved`
   - map inbound conversation/session to a stable `roomKey`

2. `before_prompt_build`
   - prepend recent room context for participant agents

3. `message_sending`
   - observe outgoing agent messages and append room events

4. HTTP routes via `registerHttpRoute`
   - `/api/rooms`
   - `/api/rooms/:roomKey`
   - `/api/rooms/:roomKey/events`

## Storage plan

Use plugin-owned state under its own directory.

Suggested files:
- `data/rooms/index.json`
- `data/rooms/<safe-room-key>.jsonl`

### JSONL event log advantages
- append-only
- easy debugging
- straightforward replay
- resilient against partial corruption

## Prompt injection strategy

For each participant agent in a shared room, prepend compact room context:

- room label / room key
- recent human messages
- recent participant replies
- speaking policy reminder

Keep it short to avoid token blow-up.
Initial target: last 10-20 meaningful room events with simple summarization later.

## Speaking policy (plugin-level support)

The plugin should support room metadata/policies but not fully own all speaking logic on day 1.

Initial model:
- representative agent id
- mention-only participant list
- panel mode opt-in

The workspace/team docs continue to enforce higher-level behavior.

## First implementation milestones

### Milestone 1 — Scaffolding
- plugin package
- manifest
- config schema
- design doc

### Milestone 2 — Room key derivation
- helper functions for Discord room key generation
- safe file name encoding

### Milestone 3 — Room event persistence
- append events
- list recent events
- basic dedupe by `providerMessageId + authorId + roomKey`

### Milestone 4 — Prompt context injection
- inject compact shared room context in `before_prompt_build`

### Milestone 5 — Debug routes
- add HTTP read routes for rooms/events

## Open questions

1. Best hook source for inbound human messages?
2. Best source of canonical provider message id in hook payloads?
3. Can room participant membership be inferred from bindings only, or should plugin config declare it explicitly?
4. Should policy live in plugin config, shared docs, or both?
5. How much of room dispatch can remain document-driven vs plugin-driven?

## Recommended first coding target

Implement **read-only shared room memory** first:
- derive room keys
- append events
- expose read routes
- inject recent room context

Do **not** change dispatch semantics yet.

This gets shared context working before trying to make room-native control logic more ambitious.
