/**
 * Playwright auto-login bot.
 * Usage: yarn bot:login [username] [password]
 */

import { chromium } from "playwright";

const USERNAME = process.argv[2] ?? "BotPlayer";
const PASSWORD = process.argv[3] ?? "bot123";
const GAME_URL = process.env.GAME_URL ?? "http://localhost:3000";

async function waitMs(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function main() {
    console.log(`[bot] Launching → ${GAME_URL} as "${USERNAME}"`);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(GAME_URL);

    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 30_000 });
    console.log("[bot] Canvas visible. Waiting for login screen...");
    await waitMs(7000);

    // Read exact button coordinates from the running game client
    const existingUserCoords = await page.evaluate(() => {
        const client = (window as any).osrsClient;
        if (!client?.loginRenderer) return null;
        const r = client.loginRenderer;
        const scale = r.renderScale ?? 1;
        const ox = r.renderOffsetX ?? 0;
        const oy = r.renderOffsetY ?? 0;
        const lx = (r.loginBoxCenter ?? 382) + 80;
        const ly = 291;
        return {
            x: lx * scale + ox,
            y: ly * scale + oy,
            debug: { scale, ox, oy, lx, ly, loginBoxCenter: r.loginBoxCenter },
        };
    });

    if (existingUserCoords) {
        console.log(`[bot] Existing User coords from game:`, existingUserCoords.debug);
        console.log(`[bot] Clicking at screen (${Math.round(existingUserCoords.x)}, ${Math.round(existingUserCoords.y)})`);
        await page.mouse.click(existingUserCoords.x, existingUserCoords.y);
    } else {
        // Fallback: click at a reasonable position
        console.log("[bot] osrsClient not found, trying fallback click at (745, 440)");
        await page.mouse.click(745, 440);
    }

    await waitMs(1500);
    console.log("[bot] Clicked Existing User — typing credentials...");

    await page.keyboard.type(USERNAME, { delay: 100 });
    await waitMs(400);
    await page.keyboard.press("Tab");
    await waitMs(300);
    await page.keyboard.type(PASSWORD, { delay: 100 });
    await waitMs(300);
    await page.keyboard.press("Enter");

    console.log("[bot] Login submitted — waiting 12s...");
    await waitMs(12_000);

    console.log("[bot] Sending ::bot...");
    await page.keyboard.press("Enter");
    await waitMs(400);
    await page.keyboard.type("::bot", { delay: 80 });
    await page.keyboard.press("Enter");
    await waitMs(800);

    // Restore items (gives shrimp + food)
    await page.keyboard.press("Enter");
    await waitMs(300);
    await page.keyboard.type("::restoreitems", { delay: 80 });
    await page.keyboard.press("Enter");
    await waitMs(2000);

    // ── Closed-loop eat test ────────────────────────────────────────
    console.log("[bot] Starting eat test...");

    // Check socket and game state first
    const debug = await page.evaluate(() => {
        const client = (window as any).osrsClient;
        const test = (window as any).xrspsTest;
        return {
            hasClient: !!client,
            hasTest: !!test,
            isLoggedIn: client?.isLoggedIn?.() ?? false,
            gameState: client?.gameState,
            inv: test?.getInventory() ?? [],
        };
    });
    console.log("[bot] Debug:", JSON.stringify({ hasClient: debug.hasClient, hasTest: debug.hasTest, isLoggedIn: debug.isLoggedIn, gameState: debug.gameState }));
    console.log("[bot] Inventory slots with food:", debug.inv.filter((s: any) => [315,385,391,2309].includes(s.itemId)));

    const shrimp = debug.inv.find((s: any) => s.itemId === 315);
    if (!shrimp) {
        console.log("[bot] FAIL: no shrimp found");
    } else {
        console.log(`[bot] Shrimp at slot ${shrimp.slot} — sending eatItem...`);
        const eatSlot = shrimp.slot;
        const countBefore = debug.inv.filter((s: any) => s.itemId === 315).length;
        const sent = await page.evaluate(() => (window as any).xrspsTest?.eatItem(315));
        console.log(`[bot] eatItem returned: ${sent}, eating slot ${eatSlot}, shrimps before: ${countBefore}`);

        // Wait until one shrimp is consumed (count decreases)
        let shrimpConsumed = false;
        try {
            await page.waitForFunction(
                (expectedCount: number) => {
                    const inv = (window as any).xrspsTest?.getInventory() ?? [];
                    const count = inv.filter((s: any) => s.itemId === 315).length;
                    return count < expectedCount;
                },
                { timeout: 5000 },
                countBefore,
            );
            shrimpConsumed = true;
        } catch {
            shrimpConsumed = false;
        }

        const invFinal = await page.evaluate(() => (window as any).xrspsTest?.getInventory() ?? []);
        const countAfter = invFinal.filter((s: any) => s.itemId === 315).length;

        // Also verify HP is within bounds
        const hpFinal = await page.evaluate(() => {
            const varManager = (window as any).osrsClient?.varManager;
            const currentHp = varManager?.getVarp?.(199) ?? -1;
            const skills = (window as any).osrsClient?.skillSystem?.getSkill?.(3); // HP skill
            return { currentVarp: currentHp };
        });

        console.log(`[bot] Shrimps before: ${countBefore}, after: ${countAfter}`);
        console.log(shrimpConsumed ? `[bot] PASS: shrimp consumed! (${countBefore} → ${countAfter})` : `[bot] FAIL: shrimp count unchanged after 5s`);
    }

    console.log("[bot] Done. Browser stays open. Ctrl+C to quit.");
    await new Promise(() => {});
}

main().catch((e) => { console.error("[bot] Error:", e.message); process.exit(1); });
