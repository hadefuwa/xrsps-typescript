/**
 * Dev commands — safe chat commands for development/testing.
 * No HTTP servers, no async tick callbacks, no crashable code.
 */

import type { IScriptRegistry, ScriptServices } from "../../src/game/scripts/types";

// Items to restore if a player loses their inventory during testing
const RESTORE_ITEMS: Array<{ itemId: number; quantity: number }> = [
    { itemId: 841,   quantity: 1  },  // shortbow
    { itemId: 25766, quantity: 1  },  // leagues item
    { itemId: 995,   quantity: 200 }, // coins (bonus)
    { itemId: 559,   quantity: 2  },  // mind rune
    { itemId: 1925,  quantity: 1  },  // bucket
    { itemId: 558,   quantity: 10 },  // mind rune
    { itemId: 1470,  quantity: 1  },  // magic staff
    { itemId: 556,   quantity: 20 },  // air rune
    { itemId: 557,   quantity: 4  },  // water rune
    { itemId: 555,   quantity: 6  },  // earth rune
    { itemId: 315,   quantity: 5  },  // shrimp x5 (extra for testing)
    { itemId: 385,   quantity: 5  },  // shark x5 (extra for testing)
    { itemId: 303,   quantity: 1  },  // fishing rod
    { itemId: 882,   quantity: 25 },  // bronze arrows
    { itemId: 1931,  quantity: 1  },  // pot
    { itemId: 1205,  quantity: 1  },  // bronze dagger
    { itemId: 1351,  quantity: 1  },  // bronze axe
    { itemId: 772,   quantity: 1  },  // ball of wool
    { itemId: 526,   quantity: 1  },  // bones
    { itemId: 2309,  quantity: 1  },  // bread
    { itemId: 438,   quantity: 2  },  // coal
    { itemId: 436,   quantity: 4  },  // iron ore
];

export function register(registry: IScriptRegistry, services: ScriptServices): void {

    // ::restoreitems — clear inventory and give back standard item set
    registry.registerCommand("restoreitems", (event) => {
        const player = event.player;
        // Clear all 28 slots first
        for (let i = 0; i < 28; i++) {
            services.inventory.setInventorySlot(player, i, -1, 0);
        }
        let added = 0;
        for (const { itemId, quantity } of RESTORE_ITEMS) {
            const result = services.inventory.addItemToInventory(player, itemId, quantity);
            if (result) added++;
        }
        services.inventory.snapshotInventory(player);
        return `Inventory cleared and ${added} item stacks restored.`;
    });

    // ::bot — mark yourself as a test subject (for future test API use)
    registry.registerCommand("bot", (event) => {
        return `[dev] ${event.player.name} registered as test bot. HP: ${event.player.skillSystem.getHitpointsCurrent()}/${event.player.skillSystem.getHitpointsMax()}`;
    });

    // ::heal — restore HP to full
    registry.registerCommand("heal", (event) => {
        const player = event.player;
        const max = player.skillSystem.getHitpointsMax();
        player.skillSystem.applyHitpointsHeal(max);
        return `HP restored to ${player.skillSystem.getHitpointsCurrent()}/${max}`;
    });

    // ::openbank — open the bank interface directly (useful for bot tests)
    registry.registerCommand("openbank", (event) => {
        services.banking?.openBank?.(event.player, { mode: "bank" });
        return "[dev] bank opened";
    });

    // ::testbank — closed-loop bank deposit+withdraw test. Returns PASS/FAIL.
    registry.registerCommand("testbank", (event) => {
        const player = event.player;

        // 1. Clear inventory and give 5 shrimp
        for (let i = 0; i < 28; i++) {
            services.inventory.setInventorySlot(player, i, -1, 0);
        }
        services.inventory.addItemToInventory(player, 315, 5);
        services.inventory.snapshotInventory(player);

        // 2. Deposit all inventory to bank
        const deposited = services.banking?.depositInventoryToBank?.(player);
        if (!deposited) return "TESTBANK FAIL: depositInventoryToBank returned false";

        // 3. Check bank slot 0 has shrimp (315)
        const bankEntry = services.banking?.getBankEntryAtClientSlot?.(player, 0);
        if (!bankEntry || bankEntry.itemId !== 315) {
            return `TESTBANK FAIL: bank slot 0 = ${bankEntry?.itemId ?? "empty"} (expected 315)`;
        }
        if (bankEntry.quantity < 5) {
            return `TESTBANK FAIL: bank has ${bankEntry.quantity} shrimp (expected 5)`;
        }

        // 4. Verify inventory is now empty (no shrimp)
        const invAfterDeposit = services.inventory.getInventoryItems(player);
        if (invAfterDeposit.some(s => s?.itemId === 315)) {
            return "TESTBANK FAIL: shrimp still in inventory after deposit";
        }

        // 5. Withdraw 1 shrimp from bank slot 0
        const withdrawal = services.banking?.withdrawFromBankSlot?.(player, 0, 1, { noted: false });
        if (!withdrawal?.ok) {
            return `TESTBANK FAIL: withdraw failed: ${withdrawal?.message ?? "no result"}`;
        }

        // 6. Verify inventory now has 1 shrimp
        const invAfterWithdraw = services.inventory.getInventoryItems(player);
        const shrimpInInv = invAfterWithdraw.filter(s => s?.itemId === 315).length;
        if (shrimpInInv !== 1) {
            return `TESTBANK FAIL: inventory has ${shrimpInInv} shrimp after withdraw (expected 1)`;
        }

        // 7. Verify bank now has 4 shrimp
        const bankAfter = services.banking?.getBankEntryAtClientSlot?.(player, 0);
        if (!bankAfter || bankAfter.quantity !== 4) {
            return `TESTBANK FAIL: bank has ${bankAfter?.quantity ?? 0} shrimp after withdraw (expected 4)`;
        }

        return "TESTBANK PASS: deposit and withdraw both work";
    });

}
