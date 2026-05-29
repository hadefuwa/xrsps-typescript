import { type IScriptRegistry, type ScriptServices, type LocInteractionEvent } from "../../../../src/game/scripts/types";

const BARRIER_LOC_IDS = [39652, 39653];

function handlePassThrough(event: LocInteractionEvent): void {
    const { player, tile, services } = event;
const dx = player.tileX - tile.x;
    const dy = player.tileY - tile.y;
    services.movement.teleportPlayer(player, tile.x - dx, tile.y - dy, player.level);
}

export function registerBarrierHandlers(registry: IScriptRegistry, _services: ScriptServices): void {
    for (const locId of BARRIER_LOC_IDS) {
        registry.registerLocScript({
            locId,
            action: "pass-through",
            handler: handlePassThrough,
        });
    }
}
