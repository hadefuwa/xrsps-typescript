# Database Architecture & Player Saves

This document explains how `xrsps-typescript` stores player data, highlighting the hybrid approach of using an SQLite database with serialized JSON blobs.

## Overview

The server persists player data using **SQLite** (via the `better-sqlite3` library). This logic is entirely managed by the `SqlitePersistenceProvider`.

While a traditional relational database might have dozens of tables mapping out inventory slots, skills, and quest states, this project uses a document-store approach housed inside SQLite. 

There is exactly **one** table responsible for player saves.

### The `players` Table Schema
```sql
CREATE TABLE IF NOT EXISTS players (
    saveKey TEXT PRIMARY KEY,
    data TEXT NOT NULL
)
```

- **`saveKey`**: A unique identifier for the player's profile (e.g., `username` or `id:123`). This acts as the Primary Key.
- **`data`**: A raw `TEXT` column that stores the entire player save as a serialized JSON string.

---

## How Saving Works

When the server saves a player, it does **not** map individual variables to SQL columns. Instead, it relies on JSON serialization:

1. The server calls `player.exportPersistentVars()`, which gathers all variables defined in the `PlayerPersistentVars` interface (skills, coordinates, inventory, varbits, etc.).
2. It converts this massive object into a JSON string: `const data = JSON.stringify(snapshot);`
3. It `INSERT`s or `UPDATE`s the row matching the player's `saveKey`, dumping the entire JSON string into the `data` column.

## How Loading Works

When a player logs in:
1. The server queries the SQLite database by `saveKey`.
2. It retrieves the JSON string from the `data` column.
3. It parses the JSON back into a JavaScript object (`JSON.parse(row.data)`).
4. It merges the saved object with the default values in `player-defaults.json` to ensure any missing fields are safely initialized.
5. The merged object is loaded into the live `PlayerState`.

---

## Expanding the Save Structure (No SQL Required)

The most powerful advantage of this "JSON inside SQLite" design is that **you never have to modify the database schema** when adding new features to the game.

If you are developing a new gamemode like **Leagues** and you need to track `leaguePoints` and `unlockedRelics`, you do **not** need to run an `ALTER TABLE` SQL command.

### How to add a new saved variable:
Simply add your new properties to the `PlayerPersistentVars` typescript interface.

```typescript
export interface PlayerPersistentVars {
    // ... existing fields (inventory, skills, etc) ...

    // New Leagues fields
    leaguePoints?: number;
    unlockedRelics?: number[];
}
```

The next time a player logs out, the `SqlitePersistenceProvider` will automatically include these new fields in the JSON stringify process, seamlessly saving them into the SQLite database. Upon next login, `JSON.parse` will automatically restore them.

---

## Gamemode Profiles

Because the primary key is a string (`saveKey`), the server can effortlessly host multiple distinct saves for a single player by altering the key.

For example, `buildPlayerSaveKey(name, id)` normally returns the username. If a player joins a Leagues world, the server can append a suffix like `_leagues_v` to the `saveKey`. This will create an entirely new row in the database, allowing the player to have an isolated Leagues profile without touching their main game save.
