# @willhong/openclaw-room-layer

A room-oriented memory layer for OpenClaw.

## Why this project exists

OpenClaw already has strong session-native behavior, but multi-agent conversations often need something slightly different: a shared room view that sits above individual agent sessions.

This project was created to make room-based collaboration easier to reason about.

Instead of trying to replace OpenClaw's existing execution model, it adds a lightweight room layer that can:
- derive a stable room identity from provider conversations
- keep a shared event log for that room
- let multiple agent sessions reference the same recent room history
- expose room state for debugging and inspection

In short, the goal is to make multi-agent rooms feel more coherent without rewriting the core runtime.

## What it can do today

Current capabilities include:
- derive stable Discord room keys from channels and threads
- store append-only room event logs in plugin-owned storage
- perform basic event deduplication
- track participating agents as they interact with a room
- inject recent shared room context during prompt build
- expose HTTP read routes for room and event inspection
- limit behavior to selected Discord channels/threads through config

## What this enables

With the current implementation, different agent sessions can share a lightweight room memory layer.

That makes it easier to:
- preserve recent room context across participants
- inspect what happened in a shared room
- prototype multi-agent collaboration patterns
- build room-aware tooling on top of OpenClaw

## Current scope

This project currently focuses on a practical MVP:
- Discord-first room support
- shared room memory and event logging
- prompt-time shared context injection
- debug-oriented inspection routes

It does **not** yet try to fully replace session dispatch or become a full room-native runtime.

## Project structure

- `ROOM_LAYER_PLUGIN_MVP.md` — design notes, scope, milestones
- `openclaw.plugin.json` — plugin manifest and config schema
- `package.json` — package metadata
- `index.ts` — plugin entry
- `src/` — room keying, persistence, hook helpers, checkpoints

## Status

The repository currently represents a working shared-room-memory MVP for OpenClaw.

It is most useful for experimentation, debugging, and early room-aware multi-agent workflows.
