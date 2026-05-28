# Bot Testing & Auto-Login

Closed-loop testing lets AI agents log into the game, perform actions, and verify results without any human interaction.

## Quick start

```bash
# 1. Start the server and client
yarn server:start   # terminal 1
yarn start          # terminal 2

# 2. Auto-login a bot
yarn bot:login Pnda yourpassword

# 3. Run unit tests (no server needed)
yarn test:game
```

## Auto-login bot (`yarn bot:login`)

**File:** `scripts/bot-login.ts`

Opens a real Chromium browser via Playwright, navigates to `http://localhost:3000`, clicks **Existing User**, types credentials, logs in, and sends `::bot` in chat to register as a test subject.

```bash
yarn bot:login [username] [password]
yarn bot:login Pnda mypassword
```

The browser window stays open. Ctrl+C in the terminal to close it.

### How it finds the button

The script reads exact button coordinates directly from the running game client inside the browser:

```ts
const coords = await page.evaluate(() => {
    const r = window.osrsClient.loginRenderer;
    return {
        x: (r.loginBoxCenter + 80) * r.renderScale + r.renderOffsetX,
        y: 291 * r.renderScale + r.renderOffsetY,
    };
});
```

This is reliable regardless of viewport size or layout changes because it uses the same coordinate system the game itself uses.

---

## In-game dev commands

Once logged in, type these in chat:

| Command | What it does |
|---|---|
| `::bot` | Registers you as a test bot (shows HP) |
| `::restoreitems` | Restores inventory from last known state |
| `::heal` | Restores HP to full |
| `::itemspawner` | Opens the item spawner UI |

**File:** `server/extrascripts/dev-commands/index.ts`

---

## Unit tests (`yarn test:game`)

Fast server-side logic tests — no live server or browser needed.

```bash
yarn test:game
```

Tests currently cover:
- **BUG-001** — widget close fix (6 scenarios)
- **BUG-007** — settings persistence fix (5 scenarios)

**Files:** `tests/game/scenarios/`

Add a new test scenario:
1. Create `tests/game/scenarios/your-fix.test.ts`
2. Import and call it from `tests/game/run.ts`

---

## How `::bot` connects to tests

The `::bot` command (registered in `dev-commands` extrascript) stores the player reference. Previously, the `test-api` extrascript exposed an HTTP server on port 7654 for programmatic control — this was disabled because it crashed the server process on EADDRINUSE errors between restarts. It needs a safe rewrite before re-enabling.

For now, use `yarn bot:login` to auto-login + register, then verify fixes manually in the Chromium window.

---

## Known limitations

- The bot has no way to verify game state programmatically yet (test API disabled)
- The bot sends `::bot` but there's no way to read a response — it assumes login succeeded after a 12-second wait
- Full closed-loop testing (auto-eat, verify HP changed) requires the test API to be re-enabled safely
