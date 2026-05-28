/**
 * Minimal test harness for game logic tests.
 * No external dependencies — just npx tsx tests/game/run.ts
 */

export type TestResult = { name: string; passed: boolean; error?: string };

const results: TestResult[] = [];

export function assert(condition: boolean, msg: string): void {
    if (!condition) throw new Error(msg);
}

export function assertEqual<T>(actual: T, expected: T, msg?: string): void {
    if (actual !== expected) {
        throw new Error(`${msg ?? "assertEqual"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

export function assertNotEqual<T>(actual: T, unexpected: T, msg?: string): void {
    if (actual === unexpected) {
        throw new Error(`${msg ?? "assertNotEqual"}: expected value to differ from ${JSON.stringify(unexpected)}`);
    }
}

export function assertTrue(value: unknown, msg?: string): void {
    assert(!!value, msg ?? `expected truthy, got ${value}`);
}

export function assertFalse(value: unknown, msg?: string): void {
    assert(!value, msg ?? `expected falsy, got ${value}`);
}

let currentSuite = "";

export function describe(name: string, fn: () => void | Promise<void>): void {
    currentSuite = name;
    try {
        const result = fn();
        if (result instanceof Promise) {
            result.catch((e) => {
                results.push({ name: `${name} (suite setup)`, passed: false, error: String(e) });
            });
        }
    } catch (e: any) {
        results.push({ name: `${name} (suite setup)`, passed: false, error: e.message });
    }
}

export function it(name: string, fn: () => void | Promise<void>): void {
    const fullName = currentSuite ? `${currentSuite} > ${name}` : name;
    try {
        const result = fn();
        if (result instanceof Promise) {
            result
                .then(() => results.push({ name: fullName, passed: true }))
                .catch((e) => results.push({ name: fullName, passed: false, error: String(e) }));
        } else {
            results.push({ name: fullName, passed: true });
        }
    } catch (e: any) {
        results.push({ name: fullName, passed: false, error: e.message });
    }
}

export function printResults(): void {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log(`\n${"─".repeat(60)}`);
    for (const r of results) {
        if (r.passed) {
            console.log(`  ✓  ${r.name}`);
        } else {
            console.log(`  ✗  ${r.name}`);
            if (r.error) console.log(`       ${r.error}`);
        }
    }
    console.log(`${"─".repeat(60)}`);
    console.log(`  ${passed} passed, ${failed} failed\n`);

    if (failed > 0) process.exit(1);
}
