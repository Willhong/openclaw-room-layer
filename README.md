# @willhong/openclaw-room-layer

Hybrid room layer plugin scaffold for OpenClaw.

## Purpose

This plugin is intended to add a shared room-memory layer on top of existing session-native OpenClaw behavior.

Initial target:
- Discord shared rooms
- multi-agent room event log
- shared context injection
- room-oriented debug/read APIs

## Current status

Basic runtime behavior is implemented:
- room event logging
- recent shared room context injection
- HTTP read routes
- Discord channel/thread exclusion for private rooms

## Files

- `ROOM_LAYER_PLUGIN_MVP.md` — design and milestone doc
- `openclaw.plugin.json` — plugin manifest + config schema
- `package.json` — package metadata
- `index.ts` — plugin entry scaffold

## Next implementation step

Add pure helpers for:
1. room key derivation
2. safe room file paths
3. append-only room event logs
4. recent event retrieval for prompt injection
