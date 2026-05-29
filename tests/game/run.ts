/**
 * Game logic test runner.
 *
 * Runs all server-side unit tests (no live server required).
 *
 * Usage:
 *   yarn test:game          — run all tests
 *   npx tsx tests/game/run.ts
 */

import { printResults } from "./framework";
import { runWidgetCloseTests } from "./scenarios/widget-close.test";
import { runSettingsPersistTests } from "./scenarios/settings-persist.test";
import { runBankTests } from "./scenarios/bank.test";

console.log("xRSPS game logic tests\n");

runWidgetCloseTests();
runSettingsPersistTests();
runBankTests();

printResults();
