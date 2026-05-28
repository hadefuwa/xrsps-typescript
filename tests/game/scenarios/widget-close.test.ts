/**
 * Tests for BUG-001: Interfaces won't close when clicking X
 * Fix: closeModalInterfaces() now includes type=3 (sidemodal) entries
 *
 * Run: npx tsx tests/game/run.ts
 */

import { PlayerWidgetManager } from "../../../server/src/widgets/WidgetManager";
import { assert, assertEqual, describe, it } from "../framework";

export function runWidgetCloseTests(): void {
    describe("Widget close (BUG-001)", () => {

        it("type=0 modal closes via closeModalInterfaces", () => {
            const widgets = new PlayerWidgetManager();
            widgets.open(640, { type: 0 }); // modal
            assertEqual(widgets.isOpen(640), true, "should be open");
            widgets.closeModalInterfaces();
            assertEqual(widgets.isOpen(640), false, "modal should close");
        });

        it("type=3 sidemodal closes via closeModalInterfaces (the bug fix)", () => {
            const widgets = new PlayerWidgetManager();
            widgets.open(320, { type: 3 }); // sidemodal — this was the bug
            assertEqual(widgets.isOpen(320), true, "should be open");
            widgets.closeModalInterfaces();
            assertEqual(widgets.isOpen(320), false, "sidemodal should close after fix");
        });

        it("type=1 overlay is NOT closed by closeModalInterfaces", () => {
            const widgets = new PlayerWidgetManager();
            widgets.open(548, { type: 1 }); // permanent overlay
            assertEqual(widgets.isOpen(548), true, "should be open");
            widgets.closeModalInterfaces();
            assertEqual(widgets.isOpen(548), true, "overlay must NOT close");
        });

        it("multiple mixed types: only modal and sidemodal close", () => {
            const widgets = new PlayerWidgetManager();
            widgets.open(100, { type: 0 }); // modal
            widgets.open(200, { type: 3 }); // sidemodal
            widgets.open(300, { type: 1 }); // overlay
            widgets.closeModalInterfaces();
            assertEqual(widgets.isOpen(100), false, "modal closed");
            assertEqual(widgets.isOpen(200), false, "sidemodal closed");
            assertEqual(widgets.isOpen(300), true,  "overlay stays open");
        });

        it("exceptGroupId excludes a specific group from closing", () => {
            const widgets = new PlayerWidgetManager();
            widgets.open(100, { type: 0 });
            widgets.open(200, { type: 3 });
            widgets.closeModalInterfaces({ exceptGroupId: 100 });
            assertEqual(widgets.isOpen(100), true,  "excepted group stays open");
            assertEqual(widgets.isOpen(200), false, "other sidemodal closes");
        });

        it("closeModalInterfaces is idempotent on empty manager", () => {
            const widgets = new PlayerWidgetManager();
            const closed = widgets.closeModalInterfaces();
            assertEqual(closed.length, 0, "no entries to close");
        });
    });
}
