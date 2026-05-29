# AI Agent Testing Guide

This guide is written for AI agents (Claude, etc.) working on this codebase. It explains how to write and run automated tests that verify fixes actually work before closing issues.

---

## The closed-loop workflow

Every bug fix should follow this cycle:

```
1. Find the bug
2. Write a failing test that proves it
3. Fix the bug
4. Run the test → confirm PASS
5. Commit, push, close the issue
```

Never close an issue without a passing test. "I think it's fixed" is not enough.

---

## Two test layers

### Layer 1 — Unit tests (fast, no server needed)

```bash
yarn test:game
```

Tests server logic directly by importing TypeScript files. No WebSocket, no browser, no server process required. Results in ~1 second.

**When to use:** Testing server-side logic like widget state, varbit handling, skill calculations, action scheduling.

**Where they live:** `tests/game/scenarios/*.test.ts`

**How to add one:**
```ts
// tests/game/scenarios/my-fix.test.ts
import { PlayerWidgetManager } from "../../../server/src/widgets/WidgetManager";
import { assert, describe, it } from "../framework";

export function runMyFixTests(): void {
    describe("My fix (BUG-XXX)", () => {
        it("describes the expected behaviour", () => {
            // Arrange
            const widgets = new PlayerWidgetManager();
            // Act
            widgets.open(640, { type: 3 });
            widgets.closeModalInterfaces();
            // Assert
            assert(!widgets.isOpen(640), "sidemodal should close");
        });
    });
}
```

Then register it in `tests/game/run.ts`:
```ts
import { runMyFixTests } from "./scenarios/my-fix.test";
runMyFixTests();
```

---

### Layer 2 — Bot tests (full-stack, needs live server)

```bash
yarn bot:login [username] [password]
# e.g.
yarn bot:login Pnda ummah123
```

Opens a real Chromium browser, logs into the game, runs assertions via `window.xrspsTest`, and reports PASS/FAIL.

**When to use:** Testing the full client→server→client round-trip. Anything involving packets, inventory updates, HP changes, item consumption.

**Prerequisites:**
- Server running: `yarn server:start`
- Client running: `yarn start`
- Chromium installed: `npx playwright install chromium`

---

## The `window.xrspsTest` API

Once logged in, the bot can read and interact with game state via:

```ts
// Read inventory — returns [{slot, itemId, qty}, ...]
window.xrspsTest.getInventory()

// Find first slot with itemId, returns slot index or -1
window.xrspsTest.findItem(itemId)

// Send inventory_use "Eat" packet for itemId
window.xrspsTest.eatItem(itemId)  // returns true if packet sent

// Read HP (limited — current varp only)
window.xrspsTest.getHp()
```

**Source:** `src/test-helpers.ts` — add new helpers here when needed.

---

## Writing a bot test

In `scripts/bot-login.ts`, add assertions after `::bot` and `::restoreitems`:

```ts
// --- YOUR TEST STARTS HERE ---

// 1. Read state before action
const countBefore = (await page.evaluate(() =>
    (window as any).xrspsTest?.getInventory()
        .filter((s: any) => s.itemId === 315).length ?? 0
));

// 2. Perform the action
const sent = await page.evaluate(() => (window as any).xrspsTest?.eatItem(315));
console.log(`[bot] eatItem sent=${sent}`);

// 3. Wait for the game state to change (don't use fixed waits)
let passed = false;
try {
    await page.waitForFunction(
        (before: number) => {
            const count = (window as any).xrspsTest?.getInventory()
                .filter((s: any) => s.itemId === 315).length ?? before;
            return count < before;
        },
        { timeout: 8000 },
        countBefore,
    );
    passed = true;
} catch { passed = false; }

// 4. Report
const countAfter = (await page.evaluate(() =>
    (window as any).xrspsTest?.getInventory()
        .filter((s: any) => s.itemId === 315).length ?? -1
));
console.log(`[bot] ${passed ? "PASS" : "FAIL"}: items before=${countBefore} after=${countAfter}`);
```

**Key rules:**
- Use `waitForFunction` not `waitMs` — poll until the state changes, don't guess a wait time
- Always read state BEFORE the action, then compare AFTER
- Use item counts or specific slot checks, not "does any item exist"

---

## Reading server logs

When a bot test fails, server logs tell you where the packet goes. The server runs in a `cmd.exe` window. To capture logs to a file:

```powershell
Start-Process cmd.exe -ArgumentList "/c cd /d c:\...\xrsps-typescript && yarn server:start > c:\tmp\srv.log 2>&1"
```

Then read:
```bash
cat c:/tmp/srv.log | grep "eat-debug\|inventory_use\|if_triggerop" | tail -20
```

Add temporary `logger.info` calls to trace a packet's path through the server. Remove them once the bug is fixed.

---

## Dev commands (in-game chat)

Type these in the bot's Chromium window or your own browser:

| Command | Effect |
|---|---|
| `::bot` | Register as test subject (confirms HP in chat) |
| `::restoreitems` | Clear inventory + restore standard item set (includes food) |
| `::heal` | Restore HP to full |
| `::itemspawner` | Open item spawner UI |
| `::spawn` | Teleport to Lumbridge |
| `::tele x y` | Teleport to exact tile |
| `::pos` | Print current coordinates |
| `::item <id>` | Add specific item by ID |

**Source:** `server/extrascripts/dev-commands/index.ts`

---

## Common test patterns

### Test: item is consumed after action
```ts
const countBefore = inv.filter(s => s.itemId === ITEM_ID).length;
await page.evaluate(() => window.xrspsTest.eatItem(ITEM_ID));
await page.waitForFunction(
    (n) => window.xrspsTest.getInventory().filter(s => s.itemId === ITEM_ID).length < n,
    { timeout: 8000 }, countBefore
);
// PASS if count decreased
```

### Test: HP stays within max after healing
```ts
// Damage player first via server-side test command
// Then eat food, check HP <= max
```

### Test: interface closes
```ts
// Open interface, send if_close, check widget state via server-side unit test
// (widget state is server-side only, use yarn test:game for this)
```

---

## The packet tracing pattern

When "nothing happens" after a click:

1. Add `logger.info` to `handleInventoryUseMessage` and `createIfTriggerOpLocalHandler`
2. Perform the action
3. Check server logs for which handler received the packet
4. Trace from there to where it breaks

The most common patterns found so far:
- **Right-click menu actions** → `if_triggeroplocal` (NOT `inventory_use`)
- **Widget button clicks** → `widget_action` or `if_triggeroplocal`
- **Ground item clicks** → `ground_item_action`
- **NPC clicks** → `npc_interact`

---

## What `yarn bot:login` does step by step

1. Opens Chromium via Playwright
2. Navigates to `http://localhost:3000`
3. Reads `window.osrsClient.loginRenderer` to get exact button coordinates
4. Clicks **Existing User** at the calculated canvas position
5. Types username + Tab + password + Enter
6. Waits 12 seconds for the world to load
7. Sends `::bot` in chat → registers as test subject
8. Sends `::restoreitems` → clears inventory + gives standard item set
9. Runs eat test → reports PASS/FAIL
10. Leaves browser open (Ctrl+C to quit)

**Source:** `scripts/bot-login.ts`

---

## Extending the test suite

When you fix a bug:

1. **Add a unit test** in `tests/game/scenarios/` if the fix is server-side logic
2. **Add a bot assertion** in `scripts/bot-login.ts` if the fix requires a packet round-trip
3. **Document it** in `docs/dev/known-bugs.md` following the BUG-002 format
4. **Create and close a GitHub issue** with the fix documented

The `known-bugs.md` format that works:
- Symptom (what the user sees)
- Root cause with exact file + line
- Before/after code diff
- Why the fix works
- Verified: bot test result or unit test name
