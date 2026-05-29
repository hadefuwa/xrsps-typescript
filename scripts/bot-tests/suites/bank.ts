/**
 * Bank test suite.
 * Tests deposit-all and slot-withdraw via the live server.
 */

import type { TestSuite, BotContext } from "../runner";

const ITEM_SHRIMP = 315;
const ITEM_SHARK = 385;
const BANK_MODAL_INDICATOR_VARP = 548;
const BANK_CHEST_26711 = 26711;
const BANK_CHEST_26711_TILE = { x: 3130, y: 3632, level: 0 };
const BANK_CHEST_26711_STAGING_TILE = { x: 3129, y: 3632, level: 0 };

async function openBank(ctx: BotContext): Promise<void> {
    await ctx.cmd("::openbank");
}

export const bankSuite: TestSuite = {
    name: "bank",
    tests: [
        {
            name: "open-bank-chest-26711",
            async setup(ctx) {
                await ctx.cmd("::clearinv");
                await ctx.cmd(
                    `::tele ${BANK_CHEST_26711_STAGING_TILE.x} ${BANK_CHEST_26711_STAGING_TILE.y} ${BANK_CHEST_26711_STAGING_TILE.level}`
                );
                // Wait for the region and scene locs to load before clicking the chest.
                await new Promise(r => setTimeout(r, 3000));
            },
            async run(ctx) {
                const startVarp = await ctx.getVarp(BANK_MODAL_INDICATOR_VARP);
                if (startVarp !== 0) {
                    throw new Error(`Expected bank modal varp ${BANK_MODAL_INDICATOR_VARP} to start closed, got ${startVarp}`);
                }

                await ctx.menuLocInteract(BANK_CHEST_26711, BANK_CHEST_26711_TILE, 0, "Use");

                const opened = await ctx.waitForVarp(BANK_MODAL_INDICATOR_VARP, 1, 10_000);
                if (!opened) {
                    const pos = await ctx.getPos();
                    const currentVarp = await ctx.getVarp(BANK_MODAL_INDICATOR_VARP);
                    throw new Error(
                        `Bank chest ${BANK_CHEST_26711} did not open bank within 10s; varp=${currentVarp} pos=(${pos?.x ?? "?"},${pos?.y ?? "?"},${pos?.level ?? "?"})`
                    );
                }
            },
        },

        {
            name: "deposit-all",
            async setup(ctx) {
                await ctx.cmd("::clearinv");
                await ctx.cmd(`::give ${ITEM_SHRIMP} 10`);
            },
            async run(ctx) {
                await openBank(ctx);

                // Deposit everything
                await ctx.page.evaluate(() => (window as any).xrspsTest?.depositAll?.());
                await new Promise(r => setTimeout(r, 600));

                // Inventory must be empty
                const shrimp = await ctx.countItem(ITEM_SHRIMP);
                if (shrimp !== 0) throw new Error(`Expected 0 shrimp in inv, got ${shrimp}`);

                // Bank must contain shrimp
                const bank = await ctx.getBank();
                const entry = bank.find(s => s.itemId === ITEM_SHRIMP);
                if (!entry) throw new Error("Shrimp not found in bank after deposit");
                if (entry.qty < 10) throw new Error(`Expected >=10 shrimp in bank, got ${entry.qty}`);
            },
        },

        {
            name: "withdraw-one",
            async setup(ctx) {
                // Ensure bank has shrimp (previous test leaves it there; run independently)
                await ctx.cmd("::clearinv");
                await ctx.cmd(`::give ${ITEM_SHRIMP} 5`);
                await openBank(ctx);
                await ctx.page.evaluate(() => (window as any).xrspsTest?.depositAll?.());
                await new Promise(r => setTimeout(r, 600));
                await ctx.cmd("::clearinv");
            },
            async run(ctx) {
                await openBank(ctx);

                const bank = await ctx.getBank();
                const slot = bank.find(s => s.itemId === ITEM_SHRIMP);
                if (!slot) throw new Error("No shrimp in bank to withdraw");

                await ctx.page.evaluate((s) => (window as any).xrspsTest?.withdrawFromSlot?.(s, 1), slot.slot);
                await new Promise(r => setTimeout(r, 600));

                const qty = await ctx.countItem(ITEM_SHRIMP);
                if (qty !== 1) throw new Error(`Expected 1 shrimp after withdraw, got ${qty}`);
            },
        },

        {
            name: "deposit-withdraw-multi-item",
            async setup(ctx) {
                await ctx.cmd("::clearinv");
                await ctx.cmd(`::give ${ITEM_SHRIMP} 5`);
                await ctx.cmd(`::give ${ITEM_SHARK} 3`);
            },
            async run(ctx) {
                await openBank(ctx);
                await ctx.page.evaluate(() => (window as any).xrspsTest?.depositAll?.());
                await new Promise(r => setTimeout(r, 800));

                const shrimp = await ctx.countItem(ITEM_SHRIMP);
                const shark = await ctx.countItem(ITEM_SHARK);
                if (shrimp !== 0) throw new Error(`shrimp in inv after deposit: ${shrimp}`);
                if (shark !== 0) throw new Error(`shark in inv after deposit: ${shark}`);

                const bank = await ctx.getBank();
                const shrimpEntry = bank.find(s => s.itemId === ITEM_SHRIMP);
                const sharkEntry = bank.find(s => s.itemId === ITEM_SHARK);
                if (!shrimpEntry) throw new Error("No shrimp in bank");
                if (!sharkEntry) throw new Error("No shark in bank");
            },
        },
    ],
};
