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

## BUG-002 — Eating food does nothing

**Status:** Fixed in commit `6aa96a2`  
**Severity:** High — food is a core mechanic  
**GitHub Issue:** [#2](https://github.com/hadefuwa/xrsps-typescript/issues/2)

### Symptom
Right-clicking food in the inventory and selecting "Eat" does nothing. No heal, no animation, no message. No server logs appear.

### Root cause
Right-clicking "Eat" in the inventory sends an `if_triggeroplocal` packet — NOT `inventory_use` as originally assumed. The `if_triggeroplocal` handler in `binaryMessageHandlers.ts` was routing directly to `handleWidgetActionMessage` (the dialog/widget handler) without first checking inventory item actions.

The `widget_action` handler already had the correct inventory routing at lines 90–108: it reads `inventoryActions` from the OSRS cache for the item, resolves the action name by op index, and calls `queueItemAction`. The `if_triggeroplocal` handler was missing this exact check.

**File:** `server/src/network/handlers/binaryMessageHandlers.ts` — `createIfTriggerOpLocalHandler`

### Fix
Added the same inventory action routing to `createIfTriggerOpLocalHandler` that already existed in `createWidgetActionHandler`:

```ts
// New code in createIfTriggerOpLocalHandler:
if (itemId !== undefined && itemId > 0 && hasValidSlot) {
    const actions = services.getObjType(itemId)?.inventoryActions;
    if (actions) {
        const resolved = actions[opcodeParam - 1];
        if (resolved) {
            if (scriptRuntime.queueItemAction({ tick, player, itemId, slot, option: resolved.toLowerCase() })) return;
        }
    }
    if (scriptRuntime.queueItemAction({ tick, player, itemId, slot })) return;
}
// then falls through to handleWidgetActionMessage
```

### Why the fix works
`if_triggeroplocal` carries `opcodeParam` (1 = first right-click option). The fix looks up the item's `inventoryActions` from the cache (e.g. `["Eat", "Examine"]` for shrimp), resolves op 1 → `"eat"`, and passes it to `queueItemAction` which finds the registered food handler. This is the same path that was already working for `widget_action` packets.

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

## Reporting new bugs

When you find a bug, open a [GitHub Issue](https://github.com/hadefuwa/xrsps-typescript/issues/new) with:
- What you did
- What you expected  
- What actually happened
- The relevant file and line number if you found it

Then add it to this page with the fix once resolved.
