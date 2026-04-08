# @willhong/openclaw-room-layer

Hybrid room layer plugin for OpenClaw.

## Purpose

This plugin adds a shared room-memory layer on top of existing session-native OpenClaw behavior.

Current target:
- Discord shared rooms
- multi-agent room event log
- shared context injection
- room-oriented debug/read APIs

## Current state

Implemented today:
- Discord channel/thread to stable `roomKey` derivation
- append-only room event logging in plugin-owned storage
- basic event dedupe
- participant tracking based on active room/session usage
- recent shared room context injection in `before_prompt_build`
- HTTP read routes for room and event inspection
- Discord include lists for channel/thread scoping
- runtime `data/` excluded from the published repo

Not implemented yet:
- room-native dispatch replacement
- plugin-enforced speaking policy engine
- full room roster/policy management API
- dashboard UI integration
- cross-platform room abstraction beyond Discord
- perfect dedupe across all edge cases

## What this plugin is right now

This is a **shared room memory MVP**, not a full room runtime.

That means:
- OpenClaw sessions still remain the execution boundary
- the plugin adds a shared room log and shared prompt context above those sessions
- higher-level speaking behavior is still mostly enforced by workspace/team rules, not by plugin code alone

## Files

- `ROOM_LAYER_PLUGIN_MVP.md` — design notes, scope, milestones
- `openclaw.plugin.json` — plugin manifest and config schema
- `package.json` — package metadata
- `index.ts` — plugin entry
- `src/` — room keying, persistence, hook helpers, checkpoints

## Next likely steps

1. Add explicit room policy and roster metadata
2. Tighten event dedupe and hook validation
3. Add room management endpoints, not just read endpoints
4. Add dashboard integration
5. Decide how much room dispatch should move from docs into plugin logic
