# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
yarn install

# First-time setup (run once, in order)
yarn ensure-cache                    # Download OSRS cache from OpenRS2 (~1 GB)
yarn export-map-images               # Generate minimap tiles from cache
yarn server:build-collision          # Precompute collision cache (~5 min)

# Run (two terminals required)
yarn server:start                    # Terminal 1: game server on ws://0.0.0.0:43594
yarn start                           # Terminal 2: React client on http://localhost:3000

# Test
yarn test:game                       # Run all server-side game logic tests (no live server needed)

# Build
yarn build                           # Production client build
yarn server:build                    # Compile server TypeScript

# Cache export utilities
yarn export-textures
yarn export-items
yarn export-height-map

# Docs
yarn docs:dev
```

The `yarn start` and `yarn server:start` scripts both call `ensure-cache` automatically before starting.

## Architecture

### Monorepo layout

```
src/          Client (React + WebGL, targets browser ES modules)
server/       Server (Node.js, CommonJS)
src/rs/       OSRS engine — cache loaders, CS2 VM, scene builder, WebGL utils
src/shared/   Protocol constants shared by client and server
scripts/      One-off build scripts (cache export, collision build)
caches/       Downloaded OSRS cache files (dat2 format, gitignored)
public/       Static assets including pre-generated map images
```

Server's `tsconfig.json` includes `../src/rs/**` and `../src/shared/**` so both sides share the same cache-parsing and protocol code.

### Server

**Entry:** `server/src/index.ts`  
**Config:** `server/src/config/index.ts` — reads `server/config.json` plus env vars `HOST`, `PORT`, `TICK_MS`, `GAMEMODE`.

Boot sequence: cache env → collision service → NPC manager → gamemode → WebSocket server → ticker start.

**Game loop** (`server/src/game/ticker.ts`): EventEmitter tick scheduler, default 600 ms. All game systems subscribe to the `tick` event.

**Network** (`server/src/network/wsServer.ts`): `ws` library WebSocket server. Per-connection flow: `LoginHandshakeService` auth → `PlayerNetworkLayer` (message batching) → `GameContext` (service container) → `MessageRouter` (packet dispatch).

**Script system** (`server/src/game/scripts/ScriptRegistry.ts`): Registry pattern. Gamemodes register handlers for NPC/LOC interactions, item-on-item, widget actions, tick hooks, commands, region events.

**Gamemodes** (`server/gamemodes/{id}/index.ts`): Each exports `createGamemode()` returning a `GamemodeDefinition`. Active gamemode is set via `GAMEMODE` env / `config.json`. Currently: `vanilla`, `leagues-v`. Gamemodes own their loot tables, login varbits/varps, skill handlers, widget handlers, and combat formulas under `server/gamemodes/{id}/`.

**Persistence:** Player saves live in `server/data/players/`. `PlayerPersistence` handles load/save. Account stage (`accountStage`) tracks tutorial completion.

### Client

**Entry:** `src/index.tsx` → `OsrsClientApp` (React root) → `OsrsClient` (game client, also attached to `window.osrsClient`).

**Rendering:** PicoGL (WebGL 2) renderer. Scene built by `src/rs/scene/SceneBuilder.ts` from OSRS cache geometry. `src/client/webgl/` contains subsystem renderers (players, NPCs, locs, ground items, projectiles, textures).

**UI:** React components for overlays and sidebar; CS2 RuneScript VM (`src/rs/cs2/`) drives in-game widget logic driven directly from cache scripts. Widget events route through `GameContainer`.

**Network** (`src/network/ServerConnection.ts`): WebSocket singleton with reconnection logic. The active server URL is set at login time from the selected server list entry: `ws://{serverAddress}` or `wss://` if `secure`. The `DEFAULT_URL` fallback is only used before login.

**Server list** (`src/client/login/LoginRenderer.ts`): Fetched from `https://xrsps.com/servers.json` at startup; falls back to `FALLBACK_SERVERS` if unavailable. The selected entry's `address` field becomes the WebSocket target on login.

**Cache loading:** `scripts/ensure-cache.ts` downloads the cache named in `target.txt` from the OpenRS2 archive. The target format is `osrs-{revision}_{date}`. `CacheLoaderFactory` abstracts dat/dat2 formats.

### Network protocol

Binary protocol defined in `src/shared/packets/`. `encodeMessage`/`decodeMessage` handle ClientToServer / ServerToClient message unions. Key client→server types: `login`, `widget_action`, `npc_interact`, `loc_interact`, `inventory_*`, `spell_cast`, `chat_transmit`. Key server→client types: `tick`, `player_sync`, `npc_info`, `skill_update`, `varp_transmit`, `inventory_transmit`, `widget_event`, `combat_state`, `projectile`, `music`.

### LAN / dev proxy

The webpack dev server (`craco.config.js`) proxies WebSocket connections at path `/game-ws` to `ws://localhost:43594`. LAN clients should connect through `ws://{host}:3000/game-ws` to avoid needing firewall rules for port 43594.

### Key conventions

- Server tick is 600 ms; client render loop is independent (~20 ms).
- Player IDs 0–2047 match the OSRS client sync protocol limit.
- Map regions use XTEA-encrypted keys stored in `caches/{name}/keys.json`.
- Varbits and varps are synced to clients via `VariableService`; constants are in `src/shared/vars.ts`.
- `VARBIT_LEAGUE_TUTORIAL_COMPLETED` controls tutorial progression; `accountStage === 2` means tutorial finished.

## Feature coverage

This project was built top-down for **Leagues V** gameplay, not as a complete OSRS reimplementation. The engine infrastructure is solid; missing features are almost always a content registration gap (nothing added to `ScriptRegistry` for that system), not an engine limitation.

### What works

| Category | Status | Notes |
|---|---|---|
| Gathering skills | Full | Fishing, mining, woodcutting, firemaking all registered |
| Production skills | Full | Smithing, cooking, fletching, herblore, crafting, tanning |
| Consumables | Full | 70+ food/potion items with correct heal/boost/restore effects |
| Thieving | Full | Pickpocket (100+ NPC loot tables) and picklock |
| Banking | Full | Deposit, withdraw, collection box |
| Shops | Full | Buy/sell, restocking via varps |
| Doors & traversal | Full | 500+ intermap links, door open/close, ladders, stairs |
| Combat mechanics | Solid | Damage rolls, XP, prayer, poison, special attacks (limited) |
| Prayer | Solid | Bone burial, altar worship, restore items |
| Leagues V systems | Full | Tutorial, tasks, masteries, relics, XP/drop multipliers |

### What is missing or stubbed

| System | Status | Notes |
|---|---|---|
| Quests | None | Widget UI exists; zero quest logic registered |
| Agility | None | No course registrations; no run-energy penalty code |
| Runecrafting | None | No altar interactions |
| Slayer | None | No task system, no masters |
| Hunter | None | No trap placement/checking |
| Farming | None | No patch interactions |
| Construction | None | No PoH building |
| Boss scripts | ~0% | One placeholder file (`BossCombatScript.ts`); no real bosses |
| NPC dialogue | ~1% | Only Romeo (5037) and shop NPCs scripted; all others say "not implemented" |
| Grand Exchange | None | No offer system |
| Player trading | None | No trade request/confirmation flow |
| PvP combat | None | Returns `pvp_not_supported` error |
| NPC stat drains | Partial | Siphon/drain effects tracked but not applied to NPCs |

### How to add missing content

Every feature requires a handler registered in `server/gamemodes/{id}/index.ts` (or a shared file it imports). The pattern is always:

```ts
registry.registerNpcAction(NPC_ID, 'talk-to', handler)
registry.registerLocAction(LOC_ID, 'mine', handler)
registry.registerItemAction(ITEM_ID, 'eat', handler)
registry.registerSkillAction('skill.agility', handler)
```

Service interfaces for each skill type live in `server/src/game/scripts/serviceInterfaces.ts`. The engine will call registered handlers; if nothing is registered the interaction silently falls through to the generic fallback.
