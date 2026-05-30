# Settings Persistence

This page explains how player settings persistence works in `xrsps-typescript`, what was wrong before, and what the current fix does.

---

## Problem

A large class of client settings was only being saved in browser `localStorage`.

That meant settings could appear to persist if the player stayed on the same browser profile, but they were lost when:

- logging in from another browser or device
- clearing browser storage
- starting from a fresh profile

Examples include:

- keybinds
- shift-click drop related settings
- anti-drag settings
- other persistent client varcs backed by the OSRS settings UI

This was inconsistent with the rest of the game, because we already have account-backed player persistence in the server database.

---

## Old Behavior

Before the fix, persistent varcs were handled only on the client:

- `src/client/BrowserVarcsPersistence.ts` loaded varcs from `window.localStorage`
- `src/client/BrowserVarcsPersistence.ts` saved varcs back to `window.localStorage`
- `src/client/OsrsClient.ts` flushed persistent varcs locally

The server never saw most of those settings, so it could not store them in SQLite and could not restore them on login.

---

## New Behavior

Persistent client varcs are now stored in the player persistence snapshot and round-tripped through login.

The flow is:

1. The client changes a persistent varc.
2. The client marks the varcs dirty.
3. On flush, the client still writes to browser `localStorage` as a local cache.
4. The client also sends the full persistent varcs snapshot to the server.
5. The server stores that snapshot in the player persistence state.
6. On the next login, the server includes the saved persistent varcs in the handshake.
7. The client restores them before continuing normal gameplay setup.

This makes the account database the authoritative source for account-scoped persistent varcs.

---

## Files Involved

### Client

- `src/client/OsrsClient.ts`
  Dirty tracking, flush, and upload of persistent varcs.

- `src/client/BrowserVarcsPersistence.ts`
  Browser-side cache layer using `localStorage`.

- `src/rs/config/vartype/VarManager.ts`
  Persistent varc snapshot/restore logic.

- `src/network/ServerConnection.ts`
  Sends the `persistent_varcs` payload to the server.

- `src/network/packet/ClientBinaryEncoder.ts`
  Encodes the new persistent-varcs packet.

- `src/network/packet/ServerBinaryDecoder.ts`
  Reads persistent varcs from the login handshake.

### Server

- `server/src/game/player.ts`
  `PlayerPersistentVars` now includes `persistentVarcs`.

- `server/src/game/state/PlayerStateSerializer.ts`
  Exports/imports `persistentVarcs` in the player snapshot.

- `server/src/game/state/PlayerPersistence.ts`
  Sanitizes and merges persisted varcs into saved player state.

- `server/src/network/handlers/persistentVarcsHandler.ts`
  Accepts persistent varcs uploads from the client.

- `server/src/network/LoginHandshakeService.ts`
  Includes saved persistent varcs in the login handshake payload.

- `server/src/network/packet/ServerBinaryEncoder.ts`
  Encodes persistent varcs into the handshake packet.

---

## What This Covers

This fix covers settings that are represented as persistent client varcs.

That is the right bucket for many account-style OSRS settings such as:

- keybind selections
- gameplay toggles stored in persistent varcs
- settings UI values that are already backed by varcs/varcints/varcstrings

---

## What This Does Not Automatically Cover

Not every client preference uses persistent varcs.

Some systems still have their own browser-only persistence wrappers, for example:

- `src/client/plugins/interacthighlight/BrowserInteractHighlightPluginPersistence.ts`
- `src/client/plugins/tilemarkers/BrowserTileMarkersPluginPersistence.ts`
- `src/client/sidebar/BrowserSidebarPersistence.ts`

Those are still separate decisions:

- some should probably remain device-local
- some may deserve account-backed persistence later

So this fix is the core account-backed varcs path, not a blanket migration of every browser plugin setting.

---

## Why Keep `localStorage` At All

We still keep browser `localStorage` as a local cache because it helps with:

- restoring settings quickly before/around login bootstrap
- surviving temporary disconnects in the same browser session
- preserving device-local preferences where account persistence is not desired

The important change is that account-scoped persistent varcs are no longer browser-only.

---

## Testing

Regression coverage was added in:

- `tests/game/scenarios/settings-persist.test.ts`

Current checks used for this fix:

```bash
npx tsc -p server/tsconfig.json --noEmit
npx tsc -p tsconfig.json --noEmit
yarn test:game
```

---

## Related Issue

- GitHub issue: `#26` — settings UI preferences do not persist to player database
