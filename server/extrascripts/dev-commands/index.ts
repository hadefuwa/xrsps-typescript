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

}
