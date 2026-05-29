# Getting Started

XRSPS runs entirely in your browser — no downloads, no Java. You need someone to be running the server, then you just open a URL.

## Playing on someone else's server

1. Get the server address from the host (e.g. `http://192.168.0.95:3000`)
2. Open it in Chrome, Edge, or Firefox
3. Wait for the loading bar to finish (~30 seconds first time, faster after)
4. The server list opens automatically — click **Login**
5. Enter any username and password. First login creates your account

::: tip First login
There is no registration step. Just type a username and password and click Login. Your account is created automatically.
:::

## Running your own server

See the [Developer Setup](/setup) guide. You need Node.js and about 1GB of disk space for the game cache.

Once running, share your IP address with friends:
- **Same WiFi**: use your local IP (e.g. `192.168.0.95:3000`)
- **Over the internet**: use [Tailscale](/players/connecting) — the easiest option

## Controls

| Action | Control |
|---|---|
| Move | Left click ground |
| Interact | Left click NPC / object |
| Camera rotate | Middle mouse drag, or arrow keys |
| Camera zoom | Scroll wheel |
| Right click | Open context menu |
| Run | Click the run orb (bottom right of minimap) |
| Teleport to tile | Open world map → click any location |
| Teleport (command) | Type `::tele x y` in chat — e.g. `::tele 3222 3218` |
| Reset to Lumbridge | Type `::spawn` in chat |
| Show position | Type `::pos` in chat |

## Known limitations

This is an early-stage project. See [What Works](/players/what-works) for a full list of what's implemented and what isn't.
