# Code Layers

Understanding where to look is half the battle. Everything in xrsps-typescript lives in one of four layers.

## The four layers

```
┌─────────────────────────────────────────────────┐
│  server/gamemodes/{id}/     CONTENT LAYER        │
│  Skills, NPC scripts, combat formulas, loot      │
├─────────────────────────────────────────────────┤
│  server/src/                SERVER ENGINE        │
│  Tick loop, networking, player sync, pathfinding │
├─────────────────────────────────────────────────┤
│  src/rs/ + src/shared/      SHARED ENGINE        │
│  Cache loaders, CS2 VM, protocol constants       │
├─────────────────────────────────────────────────┤
│  src/client/ + src/ui/      BROWSER CLIENT       │
│  WebGL rendering, login UI, widget handling      │
└─────────────────────────────────────────────────┘
```

**Rule of thumb:** if a feature is missing (no NPC dialogue, no quest), the fix is almost always in the **content layer**. If something crashes or behaves wrong mechanically, it's the **server engine**. If it looks wrong or a button doesn't work, it's the **browser client**.

---

## Content layer — `server/gamemodes/`

This is where you spend 90% of your time adding content.

```
server/gamemodes/vanilla/
  skills/
    consumables/    food, potions — heal values, item IDs, eat handler
    fishing/        fishing spots, fish types, XP
    mining/         rock types, ore IDs, XP
    prayer/         bone XP, altar handlers
    smithing/       bars, items, XP
    ... (woodcutting, firemaking, fletching, herblore, crafting, thieving)
  combat/
    CombatFormulas.ts     damage roll calculations
    SpecialAttackRegistry.ts
    SpellXpData.ts
  scripts/
    content/
      defaultTalk.ts      fallback "not implemented" NPC dialogue
      romeo.ts            example of a fully scripted NPC
      doors.ts            door open/close interactions
      climbing.ts         stair/ladder traversal
  widgets/               widget button handlers (combat style, prayer, spellbook)
  index.ts               registers everything — start here when exploring
```

**Key pattern — registering a handler:**
```ts
// NPC dialogue
registry.registerNpcAction(NPC_TYPE_ID, 'talk-to', ({ player, npc, services }) => {
    services.dialog.openDialog(player, {
        kind: 'npc',
        npcId: npc.typeId,
        lines: ['Hello, adventurer!'],
    });
});

// Item action (eat, drink, bury, etc.)
registry.registerItemAction(ITEM_ID, ({ player, services }) => {
    services.skill.addXp(player, Skill.PRAYER, 45);
    services.inventory.removeItem(player, ITEM_ID, 1);
}, 'bury');

// Location (rock, tree, door, fishing spot)
registry.registerLocAction(LOC_ID, 'mine', ({ player, loc, services }) => {
    // mining logic
});
```

---

## Server engine — `server/src/`

Don't touch this unless you're fixing a mechanical bug.

| File/Dir | What it does |
|---|---|
| `server/src/index.ts` | Boot sequence — reads config, starts everything |
| `server/src/game/ticker.ts` | 600ms tick loop — all game systems subscribe here |
| `server/src/network/wsServer.ts` | WebSocket server, one connection per player |
| `server/src/network/LoginHandshakeService.ts` | Login validation, player spawn, handshake |
| `server/src/network/handlers/` | One file per client→server packet type |
| `server/src/game/services/InterfaceManager.ts` | Widget open/close, close-on-movement |
| `server/src/widgets/WidgetManager.ts` | Per-player widget state tracking |
| `server/src/game/state/PlayerSkillSystem.ts` | XP, levels, healing |
| `server/src/game/services/MovementService.ts` | Pathfinding, teleports, walk commands |
| `server/src/config/index.ts` | Server config — reads `server/config.json` + env vars |

**When a packet arrives:**
1. `wsServer.ts` receives raw bytes
2. `ClientBinaryDecoder` decodes to a typed message
3. `MessageRouter` dispatches to the right handler in `network/handlers/`
4. Handler calls services on `GameContext`
5. Services update `PlayerState`
6. Next tick, `PlayerSyncSession` encodes state changes and sends to client

---

## Shared engine — `src/rs/` and `src/shared/`

The OSRS cache parsers and protocol definitions. Both client and server import from here.

| Dir | What it does |
|---|---|
| `src/rs/cache/` | Reads `.dat2` cache files |
| `src/rs/config/` | Loads NPC types, item types, loc types from cache |
| `src/rs/cs2/` | CS2 RuneScript VM — executes cache widget scripts |
| `src/rs/scene/` | Scene builder — turns map data into mesh geometry |
| `src/rs/map/` | Map region loading, collision flags |
| `src/shared/packets/` | Binary protocol packet IDs |
| `src/shared/vars.ts` | All VARP and VARBIT constants |

---

## Browser client — `src/client/` and `src/ui/`

| File | What it does |
|---|---|
| `src/client/OsrsClient.ts` | Main game client — 9000+ lines, most game logic lives here |
| `src/client/OsrsClientApp.tsx` | React root — cache loading, worker pools, mounts OsrsClient |
| `src/client/login/LoginRenderer.ts` | Login screen rendering and server list |
| `src/client/login/LoginState.ts` | Login screen state (username, server, etc.) |
| `src/network/ServerConnection.ts` | WebSocket singleton, reconnect logic |
| `src/client/webgl/` | WebGL renderers for players, NPCs, ground items, projectiles |

::: warning OsrsClient.ts is a god object
It's 9000+ lines. Use Ctrl+F. Everything the client does (widget actions, inventory clicks, camera, right-click menus) is in here. It will get refactored eventually.
:::

---

## Widget system — how interfaces work

Interfaces in OSRS are driven by **CS2 scripts** in the cache. xrsps-typescript runs the real CS2 VM, so most widget behaviour is automatic.

**What the server controls:**
- Which widgets are open (via `InterfaceManager.open()`)
- Widget component text, visibility, config via `queueWidgetEvent`
- Varps/varbits that CS2 scripts react to

**What's in the cache (read-only):**
- Widget layout — positions, sizes, sprites
- CS2 scripts that drive widget logic

**Widget types:**
| Type | `modal` flag | Description |
|---|---|---|
| 0 | `true` | Full-screen modal (bank, smithing interface) |
| 1 | `false` | Overlay — permanent HUD (inventory, minimap) — never auto-closes |
| 3 | `false` | Sidemodal — closeable side panel |

::: info Fixed bug
Prior to this fork, `closeModalInterfaces()` in `WidgetManager.ts` only closed type 0 (modal) entries. Type 3 (sidemodal) interfaces could not be closed. Fixed by adding `|| entry.type === 3` to the filter condition.
See [Known Bugs](/dev/known-bugs) for details.
:::
