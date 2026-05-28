# xrsps-typescript (personal fork)

> **Fork of [xrsps/xrsps-typescript](https://github.com/xrsps/xrsps-typescript)**  
> Original project by the xrsps contributors. This fork documents my exploration of the project and includes LAN/multiplayer fixes.

---

## What this project is

An OSRS game engine written entirely in TypeScript — both client and server. No Java. Runs in the browser via WebGL 2 (PicoGL). The goal of the original project is to make it easy to run your own OSRS-based private server accessible from any browser.

**What actually works:**
- Browser-based OSRS client with GPU rendering
- Movement, camera, map loading
- Basic combat (melee, ranged, magic)
- Some skills: fishing, woodcutting, firemaking, mining, prayer (burying bones), fletching, smithing
- Leagues V gamemode shell with task tracking and mastery points
- Music and sound effects from the cache
- Auto-downloads the OSRS cache from OpenRS2 on first run
- Multi-player (multiple people can connect to the same server)

**What doesn't work or is missing:**
- Eating food registers in code but may silently fail (option case mismatch between client and server)
- NPC dialogue: every NPC says "Content not implemented yet" — only Romeo has actual scripted dialogue
- Most item interactions beyond basic equip/drop are unimplemented
- No quests
- Shops exist in code but very few are scripted (Aubury rune shop, Zaff's)
- No quest diary, no achievement system beyond leagues tasks
- Map editor is planned/WIP

This is a tech demo with a thin content layer. The engine is genuinely impressive. The game content is very early stage.

---

## My changes (vs upstream)

- **LAN/multiplayer fix**: Server list now auto-rewrites `localhost:43594` to use `window.location.hostname`, so LAN and Tailscale users connecting via IP get the right WebSocket address automatically
- **Auto-select server**: First server in the list is automatically selected on load — no need to manually click the row before logging in
- **Suppress storage warning**: Removed the "Persistent storage not supported" banner that shows for non-HTTPS connections; the game works fine without it
- **CLAUDE.md**: Added architecture documentation for AI-assisted development

---

## Setup

Requires Node.js v22+ and Yarn. Run once:

```bash
git clone https://github.com/hadefuwa/xrsps-typescript.git
cd xrsps-typescript
yarn install
yarn ensure-cache           # downloads ~1GB OSRS cache from OpenRS2
yarn export-map-images      # generates minimap tiles (~2 min)
yarn server:build-collision # precomputes collision data (~5 min)
```

Then run (two terminals):

```bash
# Terminal 1
yarn server:start

# Terminal 2
yarn start
```

Open `http://localhost:3000`. Create any username/password on first login (no external auth).

### LAN / Tailscale multiplayer

The server binds to `0.0.0.0:43594` by default. Open the port in Windows Firewall (run as Administrator):

```powershell
netsh advfirewall firewall add rule name="XRSPS Game Server" dir=in action=allow protocol=TCP localport=43594
netsh advfirewall firewall add rule name="XRSPS Client" dir=in action=allow protocol=TCP localport=3000
```

Others on your LAN or Tailscale network go to `http://{your-ip}:3000`. The server list automatically shows the correct address.

### Server config

Edit `server/config.json`:

```json
{
  "serverName": "Your Server Name",
  "maxPlayers": 2047,
  "gamemode": "leagues-v"
}
```

Available gamemodes: `vanilla`, `leagues-v`

---

## Architecture (brief)

- `src/` — React + WebGL client (browser)
- `server/` — Node.js WebSocket game server
- `src/rs/` — OSRS cache parsers, CS2 VM, scene builder (shared by both)
- `src/shared/` — Network protocol constants
- `server/gamemodes/` — Content layer: skills, NPC scripts, combat, loot tables
- `caches/` — Downloaded OSRS cache files (gitignored)

Server tick: 600ms. WebSocket on port 43594. Cache revision tracked in `target.txt`.

See `CLAUDE.md` for full architecture notes.

---

## Forks worth knowing about

| Fork | Notes |
|---|---|
| [Dexploarer/scape](https://github.com/Dexploarer/scape) | 48+ commits ahead — PostgreSQL account storage, multi-world, bot SDK |
| [Paepay/xrsps-typescript](https://github.com/Paepay/xrsps-typescript) | Most active gameplay contributor — Ancient Magicks, NPC shops, autocast |

---

## Original project

- GitHub: [xrsps/xrsps-typescript](https://github.com/xrsps/xrsps-typescript)
- Docs: [xrsps.com](https://xrsps.com)
- Discord: linked from xrsps.com
