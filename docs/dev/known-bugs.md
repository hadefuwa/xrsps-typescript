# Known Bugs

Confirmed bugs with reproduction steps, root cause, and fix. Check [GitHub Issues](https://github.com/hadefuwa/xrsps-typescript/issues) for current status.

---

## BUG-001 — Interfaces won't close when clicking X

**Status:** Fixed in this fork  
**Severity:** High — affects every closeable interface in the game  
**GitHub Issue:** [#1](https://github.com/hadefuwa/xrsps-typescript/issues/1)

### Symptom
Any interface that opens (quest journal, settings, skill guides, etc.) cannot be closed by clicking the X button. The interface stays open permanently.

### Root cause
`WidgetManager.closeModalInterfaces()` filtered by `entry.modal === true`. The `modal` flag is only `true` for type 0 (full-screen blocking modals). Type 3 (sidemodal) interfaces have `modal: false` and were silently skipped.

When the player clicks X:
1. Client sends `if_close` packet to server
2. Server calls `closeInterruptibleInterfaces()` → `closeModalInterfaces()`  
3. Filter skips type 3 entries — nothing closes
4. Server resends interface as open on next tick
5. Interface stays open

**File:** `server/src/widgets/WidgetManager.ts` line ~403

### Fix
```ts
// Before
(entry) => entry.modal && ...

// After  
(entry) => (entry.modal || entry.type === 3) && ...
```

---

## BUG-002 — Eating food (four-layer fix)

**Status:** Fixed across commits `6aa96a2`, `5255d1b`, `7191ca5`, `8154377`  
**Severity:** High — food is a core mechanic  
**GitHub Issue:** [#20](https://github.com/hadefuwa/xrsps-typescript/issues/20)  
**Verified:** Bot test (`yarn bot:login`) confirmed PASS

### Symptom
Right-clicking food and selecting "Eat" did nothing initially. After partial fixes: item disappeared but healing didn't happen; then healing happened but item stayed; then item removed but HP went above max.

### Root cause — Layer 1: Wrong packet handler
Right-clicking "Eat" sends `if_triggeroplocal` NOT `inventory_use`. The `if_triggeroplocal` handler routed to `handleWidgetActionMessage` without checking inventory item actions. The `widget_action` handler already had this routing — it was just missing from `if_triggeroplocal`.

**Fix:** `server/src/network/handlers/binaryMessageHandlers.ts` — `createIfTriggerOpLocalHandler`
```ts
// Immediately consume + snapshot so item vanishes on click
services.getInventoryService().consumeItem(player, slotVal ?? 0);
services.getInventoryService().sendInventorySnapshotImmediate(ctx.ws, player);
```

### Root cause — Layer 2: Item never consumed / heal never ran
`executeScriptedConsumeAction` always re-invoked the food handler (which re-scheduled another action) instead of calling `data.apply()` — the closure containing the actual heal/animation/sound. The item was never consumed because `consumeItem` was only in the unreachable fallback path.

**Fix:** `server/src/game/actions/handlers/InventoryActionHandler.ts`
```ts
if (data.apply) {
    this.svc.inventoryService.consumeItem(player, slotIndex); // consume if not already done
    data.apply();  // run heal + animation + sound
    this.svc.inventoryService.snapshotInventoryImmediate(player);
    return { ok: true, cooldownTicks: 3, ... };
}
```

### Root cause — Layer 3: 600ms delay on item removal
`snapshotInventoryImmediate` called `snapshotInventory` → `broadcastScheduler.queueInventorySnapshot` — queued for the next tick, not truly immediate.

**Fix:** `server/src/game/services/InventoryService.ts`
```ts
snapshotInventoryImmediate(player: PlayerState): void {
    const sock = this.svc.players?.getSocketByPlayerId(player.id);
    if (sock) this.sendInventorySnapshotImmediate(sock, player); // withDirectSendBypass
}
```

### Root cause — Layer 4: HP going above max
`applyHitpointsHeal` always called `ensureHitpointsTempMax` — the anglerfish overheal mechanic — for ALL food. Shrimp was boosting the effective HP max just like anglerfish.

**Fix:** `server/src/game/state/PlayerSkillSystem.ts` + `server/gamemodes/vanilla/skills/consumables/index.ts`
```ts
// applyHitpointsHeal: add allowOverheal=false param
this.setHitpointsCurrent(Math.min(target, this.getHitpointsMax())); // cap at max

// consumables: only anglerfish opts in
const allowOverheal = def.healResolver === computeAnglerfishHeal;
player.skillSystem.applyHitpointsHeal(healAmount, allowOverheal);
```

### How it was found
Each layer was discovered using the closed-loop bot test (`yarn bot:login`). The bot logs exactly what's happening at each step — no guessing required.

---

## BUG-003 — Depositing items from bank inventory panel does nothing

**Status:** Fixed in commit `8d06c1c`  
**Severity:** High — core bank deposit flow broken for item-by-item deposits  
**GitHub Issue:** [#13](https://github.com/hadefuwa/xrsps-typescript/issues/13)

### Symptom
Opening the bank works. Clicking items in the inventory side panel (left-click or right-click Deposit-X) does nothing — items stay in inventory and the bank does not update.

### Root cause
`registerBanksideWidgets` in `server/gamemodes/vanilla/banking/bankWidgets.ts` line 348 called `event.services?.depositInventoryItemToBank?.()`. `depositInventoryItemToBank` is not a property of `ScriptServices` — it lives under `ScriptServices.banking` (a `BankingServices` sub-object). Because the property doesn't exist on `event.services` directly, optional chaining `?.()` short-circuits to `undefined` on every invocation, silently doing nothing.

The bug only affects the `registerBanksideWidgets` deposit handler. The "Deposit Inventory" button (`BANK_WIDGET_DEPOSIT_INV`) and withdraw handlers were unaffected — they correctly use `services.banking?.depositInventoryToBank` and `services.banking!.withdrawFromBankSlot!` respectively.

**File:** `server/gamemodes/vanilla/banking/bankWidgets.ts` line 348

### Fix
```ts
// Before
const result = event.services?.depositInventoryItemToBank?.(

// After
const result = event.services.banking?.depositInventoryItemToBank?.(
```

### Why the fix works
`BankingServices` is registered as `ScriptServices.banking` (optional, gamemode-contributed). Calling `event.services.banking?.depositInventoryItemToBank?.()` correctly traverses into the banking sub-service before calling the method.

### Related systems
Any future widget action handlers that call banking/shopping/production methods should always go through `event.services.banking?.`, `event.services.shopping?.`, etc. — never call methods directly on `event.services` unless they are top-level `ScriptServices` members (messaging, variables, skills, inventory, etc.).

---

## BUG-004 — `::sail` leaves player stuck underground; `::spawn` doesn't escape it

**Status:** Fixed (save file patched; `::spawn` hardened)  
**Severity:** High — player permanently stuck; logout does not recover  
**GitHub Issue:** [#18](https://github.com/hadefuwa/xrsps-typescript/issues/18)

### Symptom
After typing `::sail` in chat, the player appears underground and cannot move. Typing `::spawn` also appears underground at the new Lumbridge coordinates. Logging out and back in does not fix it — the player re-loads at the sailing dock position still inside the overlay.

### Root cause
`::sail` calls `sendDockedBoatArrival` ([pandemonium.ts:769](../../server/gamemodes/vanilla/skills/sailing/pandemonium.ts#L769)) which does two things:

1. Sets `player.worldViewId = SAILING_WORLD_ENTITY_INDEX (3426)` — this tells the server encoder to anchor the player's position to the sailing world entity, so the client renders the sailing ship overlay geometry instead of the real overworld terrain.
2. Sends the world entity (overlay) to the client via `services.sailing?.sendWorldEntity(...)`.

`::spawn` ([chatHandler.ts:463](../../server/src/network/handlers/chatHandler.ts#L463)) called `services.teleportPlayer(sender, 3222, 3218, 0)` which changes the player's tile coordinates but **does not** clear `player.worldViewId`, so the client continues rendering the sailing overlay at whatever coordinates the player is moved to → they appear underground everywhere.

Because `player.worldViewId` is an in-memory field, it resets on server restart. But the **saved position** (3054, 3193) is inside the sailing dock area — on next login the player loads there, and if any startup path re-sends the world entity the overlay reactivates.

**Files:**
- `server/gamemodes/vanilla/skills/sailing/pandemonium.ts` line 774 — sets `worldViewId`
- `server/src/network/handlers/chatHandler.ts` line 463 — `::spawn` missing sailing cleanup

### Fix

```ts
// Before — chatHandler.ts ::spawn
services.teleportPlayer(sender, 3222, 3218, 0);

// After — clears sailing overlay then teleports
const SAILING_VARBITS_TO_CLEAR = [19136, 19137, 19122, 19104, 19151, 19153, 19176, 19175, 19118];
for (const varbitId of SAILING_VARBITS_TO_CLEAR) {
    sender.varps.setVarbitValue(varbitId, 0);
    services.queueVarbit(sender.id, varbitId, 0);
}
services.disposeSailingInstance?.(sender);
services.removeWorldEntity?.(sender.id, 3426 /* SAILING_WORLD_ENTITY_INDEX */);
sender.worldViewId = 0;
services.teleportPlayer(sender, 3222, 3218, 0);
```

Stuck accounts also had their saved position reset to Lumbridge (3222, 3218, 0) directly in `server/data/gamemodes/leagues-v/player-state.json`.

### Why the fix works
`removeWorldEntity` sends a packet to the client to tear down the sailing overlay, and resetting `player.worldViewId = 0` stops the server from anchoring future position updates to the world entity. The varbit clears hide the sailing HUD panels. Together these restore the client to normal overworld rendering before the teleport lands.

### Related systems
Any other command or system that calls `teleportPlayer` to escape an instanced/world-entity context (sailing, future dungeon instances, etc.) must also clear `worldViewId` and call `removeWorldEntity` / `disposeSailingInstance` first. The same pattern applies to any future `::home` or `::tele` admin commands.

---

## Reporting new bugs

When you find a bug, open a [GitHub Issue](https://github.com/hadefuwa/xrsps-typescript/issues/new) with:
- What you did
- What you expected  
- What actually happened
- The relevant file and line number if you found it

Then add it to this page with the fix once resolved.
