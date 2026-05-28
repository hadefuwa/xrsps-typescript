/**
 * Tests for BUG-007: Settings reset to defaults on every login
 * Fix: login varbits only applied when player has no saved value
 *
 * Run: npx tsx tests/game/run.ts
 */

import { PlayerVarpState } from "../../../server/src/game/state/PlayerVarpState";
import { assert, assertEqual, describe, it } from "../framework";

// Simulate the fixed login varbit application logic
function applyLoginVarbitsFixed(varps: PlayerVarpState, loginVarbits: Array<[number, number]>): void {
    for (const [varbitId, value] of loginVarbits) {
        if (!varps.hasVarbitValue(varbitId)) {
            varps.setVarbitValue(varbitId, value);
        }
    }
}

// Simulate the OLD (buggy) login varbit application
function applyLoginVarbitsBuggy(varps: PlayerVarpState, loginVarbits: Array<[number, number]>): void {
    for (const [varbitId, value] of loginVarbits) {
        varps.setVarbitValue(varbitId, value); // always overwrites
    }
}

const XP_DROPS_VARBIT = 4702; // VARBIT_XPDROPS_ENABLED
const DEFAULT_XP_DROPS_ON = 1;

export function runSettingsPersistTests(): void {
    describe("Settings persistence (BUG-007)", () => {

        it("fixed: player's XP drops setting survives login", () => {
            const varps = new PlayerVarpState();
            // Player has previously turned XP drops OFF
            varps.setVarbitValue(XP_DROPS_VARBIT, 0);

            // Login applies defaults — should NOT overwrite existing value
            applyLoginVarbitsFixed(varps, [[XP_DROPS_VARBIT, DEFAULT_XP_DROPS_ON]]);

            assertEqual(varps.getVarbitValue(XP_DROPS_VARBIT), 0,
                "XP drops should stay OFF as player set it");
        });

        it("buggy: XP drops setting would have been overwritten (regression proof)", () => {
            const varps = new PlayerVarpState();
            varps.setVarbitValue(XP_DROPS_VARBIT, 0); // player turned it off

            // Old bug: always overwrites
            applyLoginVarbitsBuggy(varps, [[XP_DROPS_VARBIT, DEFAULT_XP_DROPS_ON]]);

            assertEqual(varps.getVarbitValue(XP_DROPS_VARBIT), DEFAULT_XP_DROPS_ON,
                "confirms old bug reset the value");
        });

        it("fixed: new account gets defaults applied", () => {
            const varps = new PlayerVarpState(); // no saved values
            applyLoginVarbitsFixed(varps, [[XP_DROPS_VARBIT, DEFAULT_XP_DROPS_ON]]);

            assertEqual(varps.getVarbitValue(XP_DROPS_VARBIT), DEFAULT_XP_DROPS_ON,
                "new account should get the default");
        });

        it("fixed: hasVarbitValue returns false for unset varbits", () => {
            const varps = new PlayerVarpState();
            assertEqual(varps.hasVarbitValue(99999), false, "unset varbit should return false");
            varps.setVarbitValue(99999, 1);
            assertEqual(varps.hasVarbitValue(99999), true, "set varbit should return true");
        });

        it("fixed: multiple settings all preserved after login", () => {
            const MUSIC_VARBIT = 4559;
            const varps = new PlayerVarpState();
            varps.setVarbitValue(XP_DROPS_VARBIT, 0);  // XP drops off
            varps.setVarbitValue(MUSIC_VARBIT, 0);       // Music off

            applyLoginVarbitsFixed(varps, [
                [XP_DROPS_VARBIT, 1],
                [MUSIC_VARBIT, 1],
            ]);

            assertEqual(varps.getVarbitValue(XP_DROPS_VARBIT), 0, "XP drops still off");
            assertEqual(varps.getVarbitValue(MUSIC_VARBIT), 0, "Music still off");
        });
    });
}
