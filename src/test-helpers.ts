/**
 * Dev-only test helpers exposed on window.xrspsTest.
 * Allows Playwright bots to trigger game actions programmatically.
 * Only mounted when NODE_ENV !== 'production'.
 */

import { sendInventoryUse, sendBankDepositInventory, sendWidgetAction } from "./network/ServerConnection";
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
    /** Get bank contents as array of {slot, itemId, qty} — only non-empty slots */
    getBank(): Array<{ slot: number; itemId: number; qty: number }>;
    /** Send bank_deposit_inventory packet (deposits entire inventory) */
    depositAll(): boolean;
    /** Send widget_action withdraw packet for a bank slot. qty defaults to 1. */
    withdrawFromSlot(clientSlot: number, qty?: number): boolean;
}

export function mountTestHelpers(client: OsrsClient): void {
    if (process.env.NODE_ENV === "production") return;

    const helpers: XrspsTestHelpers = {
        eatItem(itemId: number): boolean {
            const slots = (client as any).inventory?.getSlots?.() ?? [];
            const slot = slots.findIndex((s: any) => s && s.itemId === itemId);
            if (slot < 0) return false;
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

        getBank(): Array<{ slot: number; itemId: number; qty: number }> {
            const slots = (client as any).bankInventory?.getSlots?.() ?? [];
            return slots
                .map((s: any, i: number) => s && s.itemId > 0 ? { slot: i, itemId: s.itemId, qty: s.quantity } : null)
                .filter(Boolean);
        },

        depositAll(): boolean {
            sendBankDepositInventory();
            return true;
        },

        withdrawFromSlot(clientSlot: number, qty = 1): boolean {
            // Read bank to get itemId at this slot (needed for widget_action)
            const bank = helpers.getBank();
            const entry = bank.find(s => s.slot === clientSlot);
            const BANK_MAIN_ITEMS_WIDGET = (12 << 16) | 12; // group=12, component=12
            sendWidgetAction({
                widgetId: BANK_MAIN_ITEMS_WIDGET,
                groupId: 12,
                childId: clientSlot,
                opId: qty === 1 ? 2 : qty === 5 ? 3 : qty === 10 ? 4 : 7,
                slot: clientSlot,
                itemId: entry?.itemId ?? 0,
            });
            return true;
        },

    };

    (window as any).xrspsTest = helpers;
    console.log("[test-helpers] window.xrspsTest mounted");
}
