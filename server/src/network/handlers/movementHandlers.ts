import type { MessageHandlerServices } from "../MessageHandlers";
import { normalizeModifierFlags, resolveRunWithModifier } from "../MessageHandlers";
import type { MessageRouter } from "../MessageRouter";
import { logger } from "../../utils/logger";

export function registerMovementHandlers(router: MessageRouter, services: MessageHandlerServices): void {
    router.register("walk", (ctx) => {
        const to = ctx.payload.to;
        const modifierFlags = normalizeModifierFlags(ctx.payload.modifierFlags);
        logger.info(`[walk] received walk to (${to?.x}, ${to?.y}) player=${ctx.player?.id}`);

        if (!ctx.player) {
            logger.info("walk rejected: player not ready");
            return;
        }

        // Derive run state from server toggle and input flags
        const effectiveRun = ctx.player.energy.resolveRequestedRun(
            resolveRunWithModifier(ctx.player.energy.wantsToRun(), modifierFlags),
        );

        const nowTick = services.currentTick();
        services.setPendingWalkCommand(ctx.ws, {
            to: { x: to.x, y: to.y },
            run: effectiveRun,
            enqueuedTick: nowTick,
        });

        try {
            // OSRS: walking cancels active skilling loops immediately
            const removed = services.clearActionsInGroup(ctx.player.id, "skill.woodcut");
            if (removed > 0) {
                ctx.player.clearInteraction();
                ctx.player.stopAnimation();
            }
        } catch (err) { logger.warn("Failed to clear woodcutting actions on walk", err); }

        try {
            services.clearActionsInGroup(ctx.player.id, "inventory");
        } catch (err) { logger.warn("Failed to clear inventory actions on walk", err); }
    });

    router.register("teleport", (ctx) => {
        try {
            if (!ctx.player) return;
            if (!ctx.player.canMove()) return;
            const { to, level } = ctx.payload;
            const targetLevel = level ?? ctx.player.level;

            // Clear any sailing world-entity state before teleporting so the client
            // doesn't render the sailing overlay at the new position.
            if (ctx.player.worldViewId !== 0) {
                const SAILING_VARBITS = [19136, 19137, 19122, 19104, 19151, 19153, 19176, 19175, 19118];
                for (const varbitId of SAILING_VARBITS) {
                    ctx.player.varps.setVarbitValue(varbitId, 0);
                    services.queueVarbit(ctx.player.id, varbitId, 0);
                }
                services.disposeSailingInstance?.(ctx.player);
                services.removeWorldEntity?.(ctx.player.id, 3426);
                ctx.player.worldViewId = 0;
            }

            services.teleportPlayer(ctx.player, to.x, to.y, targetLevel);
        } catch (err) { logger.warn("Failed to process teleport request", err); }
    });

    router.register("face", (ctx) => {
        try {
            if (!ctx.player) return;
            const { rot, tile } = ctx.payload;
            if (rot !== undefined) {
                ctx.player.faceRot(rot);
            } else if (tile) {
                const tx = tile.x;
                const ty = tile.y;
                const targetX = (tx << 7) + 64;
                const targetY = (ty << 7) + 64;
                if (ctx.player.x !== targetX || ctx.player.y !== targetY) {
                    ctx.player.faceTile(tx, ty);
                }
            }
        } catch (err) { logger.warn("Failed to process face direction", err); }
    });

    router.register("pathfind", (ctx) => {
        const { id, from, to, size } = ctx.payload;
        const res = services.findPath({
            from,
            to,
            size: size ?? 1,
        });
        if (!res) {
            services.sendAdminResponse(
                ctx.ws,
                services.encodeMessage({
                    type: "path",
                    payload: { id, ok: false, message: "path service unavailable" },
                }),
                "admin_path_response",
            );
            return;
        }
        const t0 = Date.now();
        const dt = Date.now() - t0;
        try {
            logger.info(`pathfind request: ${dt}ms`);
        } catch (err) { logger.warn("Failed to log pathfind timing", err); }
        services.sendAdminResponse(
            ctx.ws,
            services.encodeMessage({
                type: "path",
                payload: { id, ok: res.ok, waypoints: res.waypoints, message: res.message },
            }),
            "admin_path_response",
        );
    });
}
