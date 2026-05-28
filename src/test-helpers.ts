/**
 * Dev-only test helpers exposed on window.xrspsTest.
 * Allows Playwright bots to trigger game actions programmatically.
 * Only mounted when NODE_ENV !== 'production'.
 */

import { sendInventoryUse } from "./network/ServerConnection";
import type { OsrsClient } from "./client/OsrsClient";

export interface XrspsTestHelpers {
    /** Eat food at the given inventory slot */
    eatItem(itemId: number): boolean;
    /** Get current HP */
    getHp(): { current: number; max: number } | null;
    /** Get inventory as array of {slot, itemId, qty} */
    getInventory(): Array<{ slot: number; itemId: number; qty: number }>;
    /** Find first slot containing itemId */
    findItem(itemId: number): number;
}

export function mountTestHelpers(client: OsrsClient): void {
    if (process.env.NODE_ENV === "production") return;

    const helpers: XrspsTestHelpers = {
        eatItem(itemId: number): boolean {
            const slots = (client as any).inventory?.getSlots?.() ?? [];
            const slot = slots.findIndex((s: any) => s && s.itemId === itemId);
            if (slot < 0) return false;
            // Use the same packet the real client sends (if_triggeroplocal via sendInventoryUse)
            // "Eat" is op 1 for food items in OSRS cache inventoryActions
            sendInventoryUse(slot, itemId, 1, "Eat");
            return true;
        },

        getHp(): { current: number; max: number } | null {
            const varManager = (client as any).varManager;
            if (!varManager) return null;
            const current = varManager.getVarp?.(199) ?? -1;
            return { current, max: -1 };
        },

        getInventory(): Array<{ slot: number; itemId: number; qty: number }> {
            const slots = (client as any).inventory?.getSlots?.() ?? [];
            return slots
                .map((s: any, i: number) => s ? { slot: i, itemId: s.itemId, qty: s.quantity } : null)
                .filter(Boolean);
        },

        findItem(itemId: number): number {
            const slots = (client as any).inventory?.getSlots?.() ?? [];
            return slots.findIndex((s: any) => s && s.itemId === itemId);
        },
    };

    (window as any).xrspsTest = helpers;
    console.log("[test-helpers] window.xrspsTest mounted");
}
