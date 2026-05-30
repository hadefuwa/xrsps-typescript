import { logger } from "../../utils/logger";
import type { MessageHandler } from "../MessageRouter";
import type { MessageHandlerServices } from "../MessageHandlers";

export function createPersistentVarcsHandler(
    _services: MessageHandlerServices,
): MessageHandler<"persistent_varcs"> {
    return (ctx) => {
        try {
            const player = ctx.player;
            if (!player) return;
            const payload = ctx.payload;
            player.persistentVarcs = {
                ints: Array.isArray(payload.ints)
                    ? payload.ints
                          .filter((entry) => Array.isArray(entry) && entry.length === 2)
                          .map(([id, value]) => [id | 0, value | 0] as [number, number])
                    : [],
                strings: Array.isArray(payload.strings)
                    ? payload.strings
                          .filter((entry) => Array.isArray(entry) && entry.length === 2)
                          .map(([id, value]) => [id | 0, String(value)] as [number, string])
                    : [],
            };
        } catch (err) {
            logger.warn("[persist] failed to handle persistent varcs", err);
        }
    };
}
