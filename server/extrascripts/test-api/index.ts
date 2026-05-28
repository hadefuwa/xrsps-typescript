/**
 * Test API — dev-only HTTP server on port 7654.
 *
 * Lets AI agents control logged-in players and assert game state
 * without implementing the full binary WebSocket protocol.
 *
 * SETUP (one-time):
 *   1. Log in as any player
 *   2. Type ::bot in chat — registers you as the test subject
 *
 * ENDPOINTS:
 *   GET  /status                — check registered bots + their state
 *   POST /test/hp-heal          — test HP system in isolation
 *   POST /test/eat              — test full eat-food flow
 *   POST /test/move             — teleport player, verify position
 *   POST /test/give-item        — add item to inventory
 *   POST /test/get-state        — read full player state
 *
 * All POST bodies: { "bot": "PlayerName", ...params }
 *
 * Only active when NODE_ENV !== "production".
 */

import http from "http";
import type { PlayerState } from "../../src/game/player";
import type { IScriptRegistry, ScriptServices } from "../../src/game/scripts/types";

const PORT = 7654;

type JsonBody = Record<string, unknown>;

export function register(registry: IScriptRegistry, services: ScriptServices): void {
    if (process.env.NODE_ENV === "production") return;

    // Registry of players who have opted in as test bots via ::bot command
    const bots = new Map<string, PlayerState>();

    // ::bot — type this in-game to register yourself as a test bot
    registry.registerCommand("bot", (event) => {
        const player = event.player;
        const name = player.name ?? "unknown";
        bots.set(name.toLowerCase(), player);
        return `[test-api] Registered as test bot. You can now be controlled via http://localhost:${PORT}`;
    });

    // ::unbot — deregister
    registry.registerCommand("unbot", (event) => {
        const name = event.player.name ?? "";
        bots.delete(name.toLowerCase());
        return "[test-api] Deregistered from test bot list.";
    });

    // ── HTTP server ───────────────────────────────────────────────────────────

    const server = http.createServer(async (req, res) => {
        if (req.method === "OPTIONS") { ok(res, {}); return; }

        const path = new URL(req.url ?? "/", `http://localhost`).pathname;
        const body = req.method === "POST" ? await readBody(req) : {};
        const botName = String(body.bot ?? "").toLowerCase();

        // GET /status
        if (path === "/status") {
            ok(res, {
                bots: [...bots.entries()].map(([, p]) => snap(p)),
                tip: 'Type ::bot in game chat to register a player, then use { "bot": "name" } in requests',
            });
            return;
        }

        const p = bots.get(botName);
        if (!p && path !== "/status") {
            err(res, 404, `Bot "${body.bot}" not registered. Log in and type ::bot in chat.`);
            return;
        }

        // POST /test/get-state
        if (path === "/test/get-state") {
            ok(res, { passed: true, state: snap(p!) });
            return;
        }

        // POST /test/give-item
        if (path === "/test/give-item") {
            const itemId = Number(body.itemId);
            const qty = Number(body.quantity ?? 1);
            const result = p!.inventory.addItem(itemId, qty);
            ok(res, {
                passed: result.completed > 0,
                added: result.completed,
                inventory: p!.exportInventorySnapshot().filter(Boolean),
            });
            return;
        }

        // POST /test/move — teleport and verify
        if (path === "/test/move") {
            const x = Number(body.x), y = Number(body.y), level = Number(body.level ?? 0);
            const before = { x: p!.tileX, y: p!.tileY, level: p!.level };
            services.movement.teleportPlayer(p!, x, y, level);
            await wait(700);
            const after = { x: p!.tileX, y: p!.tileY, level: p!.level };
            ok(res, {
                passed: after.x === x && after.y === y && after.level === level,
                before,
                after,
                target: { x, y, level },
            });
            return;
        }

        // POST /test/hp-heal — tests skillSystem in isolation, no action queue
        if (path === "/test/hp-heal") {
            const amount = Number(body.amount ?? 10);
            const max = p!.skillSystem.getHitpointsMax();
            p!.skillSystem.applyHitpointsDamage(Math.min(amount + 1, max - 1));
            const before = p!.skillSystem.getHitpointsCurrent();
            p!.skillSystem.applyHitpointsHeal(amount);
            const after = p!.skillSystem.getHitpointsCurrent();
            ok(res, {
                passed: after > before,
                verdict: after > before ? "PASS: HP system works" : "FAIL: HP did not increase",
                hp: { before, after, max, healed: after - before },
            });
            return;
        }

        // POST /test/eat — full eat-food flow through action scheduler
        if (path === "/test/eat") {
            const itemId = Number(body.itemId ?? 385);

            // Ensure food is in inventory
            let slot = p!.exportInventorySnapshot().findIndex((s) => s?.itemId === itemId);
            if (slot < 0) {
                const r = p!.inventory.addItem(itemId, 1);
                if (!r.completed) { err(res, 400, "Inventory full, cannot add food"); return; }
                slot = p!.exportInventorySnapshot().findIndex((s) => s?.itemId === itemId);
            }

            const max = p!.skillSystem.getHitpointsMax();
            // Damage the player so healing is visible
            p!.skillSystem.applyHitpointsDamage(Math.min(25, max - 1));
            const hpBefore = p!.skillSystem.getHitpointsCurrent();

            // Schedule through the real action system (same path as a real client eat)
            const tick = services.system.getCurrentTick();
            const heal = FOOD_HEAL[itemId] ?? 5;
            const actionResult = services.combat.requestAction(
                p!,
                {
                    kind: "inventory.consume_script",
                    data: {
                        slotIndex: slot,
                        itemId,
                        option: "eat",
                        apply: () => {
                            if (heal > 0) p!.skillSystem.applyHitpointsHeal(heal);
                            p!.inventory.removeItem(itemId, 1);
                        },
                    },
                    delayTicks: 0,
                    cooldownTicks: 3,
                    groups: ["inventory.consume", "inventory.food"],
                },
                tick,
            );

            if (!actionResult.ok) {
                ok(res, {
                    passed: false,
                    verdict: `FAIL: action rejected by combat system — reason: ${actionResult.reason ?? "unknown"}`,
                    hp: { before: hpBefore, after: hpBefore, max },
                    actionResult,
                    diagnosis: "The action scheduler rejected the eat. Check if player is in combat cooldown.",
                });
                return;
            }

            // Wait one full tick
            await wait(700);

            const hpAfter = p!.skillSystem.getHitpointsCurrent();
            const passed = hpAfter > hpBefore;

            ok(res, {
                passed,
                verdict: passed
                    ? `PASS: eating item ${itemId} healed ${hpAfter - hpBefore} HP (${hpBefore} → ${hpAfter})`
                    : `FAIL: HP unchanged after eating (${hpBefore} → ${hpAfter}, max ${max})`,
                hp: { before: hpBefore, after: hpAfter, max, healed: hpAfter - hpBefore },
                itemId,
                slot,
            });
            return;
        }

        err(res, 404, `Unknown endpoint: ${path}. Available: /status /test/eat /test/hp-heal /test/move /test/give-item /test/get-state`);
    });

    server.listen(PORT, "0.0.0.0", () => {
        services.system.logger.info(`[test-api] Dev API on http://localhost:${PORT} — type ::bot in-game to register`);
    });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<JsonBody> {
    return new Promise((resolve, reject) => {
        let d = "";
        req.on("data", (c) => (d += c));
        req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } });
        req.on("error", reject);
    });
}

function ok(res: http.ServerResponse, body: unknown): void {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify(body, null, 2));
}

function err(res: http.ServerResponse, status: number, message: string): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: message }));
}

function wait(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

function snap(p: PlayerState) {
    return {
        name: p.name,
        hp: { current: p.skillSystem.getHitpointsCurrent(), max: p.skillSystem.getHitpointsMax() },
        tile: { x: p.tileX, y: p.tileY, level: p.level },
        inventory: p.exportInventorySnapshot().filter(Boolean),
    };
}

const FOOD_HEAL: Record<number, number> = {
    315: 3, 325: 4, 347: 5, 333: 7, 329: 9, 361: 10,
    379: 12, 373: 14, 7946: 16, 385: 20, 391: 21,
    2140: 4, 2142: 4, 2309: 5,
};
