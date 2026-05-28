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

**Status:** Unconfirmed — likely a case mismatch  
**Severity:** High — food is a core mechanic  
**GitHub Issue:** [#2](https://github.com/hadefuwa/xrsps-typescript/issues/2)

### Symptom
Right-clicking food in the inventory and selecting "Eat" does nothing. No heal, no animation, no message.

### Suspected root cause
The server registers food item handlers with option `"eat"` (lowercase):
```ts
// server/gamemodes/vanilla/skills/consumables/index.ts
const option = def.option ?? "eat";
registry.registerItemAction(def.itemId, handler, option);
```

The OSRS cache sends item options as they appear in the cache data — likely `"Eat"` with a capital E. If `registerItemAction` does a case-sensitive match, the handler never fires.

**File to check:** `server/src/game/scripts/ScriptRegistry.ts` — how does `registerItemAction` match the option string?

### Suspected fix
Either normalise the option to lowercase when registering, or normalise the incoming packet option before dispatch:
```ts
// In ScriptRegistry or the item action handler dispatch
option.toLowerCase()
```

---

## Reporting new bugs

When you find a bug, open a [GitHub Issue](https://github.com/hadefuwa/xrsps-typescript/issues/new) with:
- What you did
- What you expected  
- What actually happened
- The relevant file and line number if you found it

Then add it to this page with the fix once resolved.
