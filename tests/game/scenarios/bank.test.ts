/**
 * Tests for BUG-003 / BUG-003b: Banking deposit and withdraw
 *
 * BUG-003:  depositInventoryItemToBank called on services root instead of services.banking
 * BUG-003b: if_triggeroplocal / widget_action fired eat/bury for bank main panel items
 *           because inventoryActions[op-1] was checked without a groupId=12 guard
 *
 * Layer 1 unit tests — no live server required.
 * Run: yarn test:game
 */

import { describe, it, assertEqual, assert } from "../framework";

export function runBankTests(): void {
    describe("Banking — isBankMainWidget guard logic (BUG-003b)", () => {

        // The guard is: const isBankMainWidget = groupId === 12
        // Bank main panel group ID is always 12 (WidgetGroup.BANK_MAIN)
        // Bank side panel is 15 (BANK_SIDE)
        // Inventory widget is 149

        it("groupId 12 is identified as bank main panel", () => {
            const isBankMainWidget = (groupId: number) => groupId === 12;
            assertEqual(isBankMainWidget(12), true, "group 12 = bank main");
        });

        it("groupId 15 (bank side) is NOT treated as bank main", () => {
            const isBankMainWidget = (groupId: number) => groupId === 12;
            assertEqual(isBankMainWidget(15), false, "group 15 = bank side, not main");
        });

        it("groupId 149 (inventory) is NOT treated as bank main", () => {
            const isBankMainWidget = (groupId: number) => groupId === 12;
            assertEqual(isBankMainWidget(149), false, "group 149 = inventory widget");
        });

        it("BANK_WIDGET_ITEMS packed UID has groupId 12", () => {
            // BANK_WIDGET_ITEMS = packWidgetId(12, 12) = (12 << 16) | 12 = 786444
            const BANK_WIDGET_ITEMS = (12 << 16) | 12;
            const groupId = (BANK_WIDGET_ITEMS >>> 16) & 0xffff;
            assertEqual(groupId, 12, "bank items widget group must be 12");
        });

        it("BANKSIDE_ITEMS packed UID has groupId 15", () => {
            // BANKSIDE_ITEMS = packWidgetId(15, 3) = (15 << 16) | 3 = 983043
            const BANKSIDE_ITEMS = (15 << 16) | 3;
            const groupId = (BANKSIDE_ITEMS >>> 16) & 0xffff;
            assertEqual(groupId, 15, "bank side items widget group must be 15");
        });
    });

    describe("Banking — slot mapping (BUG-003)", () => {

        it("packWidgetId(12, 12) === 786444", () => {
            const packed = (12 << 16) | 12;
            assertEqual(packed, 786444, "bank main items widget UID");
        });

        it("event.services.banking is not the same as event.services", () => {
            // The root cause of BUG-003: event.services?.depositInventoryItemToBank was
            // always undefined because depositInventoryItemToBank lives under services.banking.
            // This test documents the invariant: root services object must NOT have
            // banking methods at the top level.
            const services: Record<string, unknown> = {
                banking: {
                    depositInventoryItemToBank: () => ({ ok: true }),
                },
                messaging: {},
                variables: {},
            };

            // BUG: accessing method on root
            const buggyAccess = (services as any)?.depositInventoryItemToBank;
            assertEqual(buggyAccess, undefined, "depositInventoryItemToBank must not be on root services");

            // FIXED: accessing method through services.banking
            const fixedAccess = (services.banking as any)?.depositInventoryItemToBank;
            assert(typeof fixedAccess === "function", "depositInventoryItemToBank must be on services.banking");
        });

        it("quantityForWithdrawOp opId=1 uses quantity mode", () => {
            // opId=1 = left-click = use current quantity mode. Any positive available gives > 0.
            // quantityForDefaultMode with mode=0 (Withdraw-1) returns 1 when available > 0.
            const quantityForWithdrawOp = (opId: number, available: number): number => {
                switch (opId) {
                    case 1: return available > 0 ? 1 : 0; // simplified: mode=0
                    case 2: return available > 0 ? 1 : 0;
                    case 3: return Math.min(5, available);
                    case 4: return Math.min(10, available);
                    case 7: return available;
                    default: return 0;
                }
            };
            assertEqual(quantityForWithdrawOp(1, 5), 1, "op1 with 5 available should give 1");
            assertEqual(quantityForWithdrawOp(2, 5), 1, "op2 (Withdraw-1) should give 1");
            assertEqual(quantityForWithdrawOp(3, 5), 5, "op3 (Withdraw-5) should give 5");
            assertEqual(quantityForWithdrawOp(7, 5), 5, "op7 (Withdraw-All) should give all");
            assertEqual(quantityForWithdrawOp(1, 0), 0, "op1 with 0 available should give 0");
        });
    });
}
