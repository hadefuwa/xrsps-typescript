/**
 * Playwright auto-login bot.
 * Opens a real Chromium browser, loads the game, logs in, and types ::bot.
 *
 * Usage:
 *   yarn bot:login [username] [password]
 *   yarn bot:login Pnda mypassword
 *
 * The browser window stays open so you can watch it play.
 * Close the terminal window when done.
 */

import { chromium } from "playwright";

const USERNAME = process.argv[2] ?? "BotPlayer";
const PASSWORD = process.argv[3] ?? "bot123";
const GAME_URL = process.env.GAME_URL ?? "http://localhost:3000";

async function waitMs(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function main() {
    console.log(`[bot] Launching browser → ${GAME_URL}`);

    const browser = await chromium.launch({
        headless: false,
        args: ["--autoplay-policy=no-user-gesture-required"],
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(GAME_URL);

    // Wait for canvas to appear (game loaded in browser)
    console.log("[bot] Waiting for game canvas...");
    await page.waitForSelector("canvas", { timeout: 30_000 });
    console.log("[bot] Canvas found. Waiting for login screen...");

    // Give the login screen time to render and server list to auto-select
    await waitMs(6000);

    // Click the canvas to ensure it has focus
    await page.mouse.click(512, 384);
    await waitMs(500);

    // The login form auto-focuses the username field.
    // Just start typing the username.
    console.log(`[bot] Typing username: ${USERNAME}`);
    await page.keyboard.type(USERNAME, { delay: 80 });

    // Tab to password field
    await page.keyboard.press("Tab");
    await waitMs(300);

    console.log("[bot] Typing password...");
    await page.keyboard.type(PASSWORD, { delay: 80 });

    // Enter to submit login
    await page.keyboard.press("Enter");
    console.log("[bot] Login submitted. Waiting for world to load...");

    // Wait for the 3D world to load (Loading - please wait disappears)
    // This takes a few seconds after login
    await waitMs(10_000);

    // Open chat and type ::bot to register as test bot
    console.log("[bot] Sending ::bot command...");
    await page.keyboard.press("Enter");  // open chat
    await waitMs(400);
    await page.keyboard.type("::bot", { delay: 60 });
    await page.keyboard.press("Enter");

    await waitMs(1000);
    console.log("[bot] Done! Browser stays open.");
    console.log("[bot] Check http://localhost:7654/status to verify registration.");
    console.log("[bot] Press Ctrl+C in this terminal to close the browser.");

    // Keep alive
    await new Promise(() => {});
}

main().catch((e) => {
    console.error("[bot] Failed:", e.message);
    process.exit(1);
});
