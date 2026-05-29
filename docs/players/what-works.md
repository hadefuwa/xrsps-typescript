# What Works

Honest status of features as of the current build. This is a work in progress — the engine is solid, the content layer is still being built out.

## Working

| Feature | Notes |
|---|---|
| Movement & camera | Full movement, run toggle, camera controls |
| Teleporting | `::spawn` (Lumbridge reset), `::tele x y [level]` (any tile), click world map to teleport |
| Combat | Melee, ranged, magic — damage, XP, prayer |
| Eating food | Full — heals correctly, item consumed, no overheal (fixed BUG-002) |
| Fishing | Full — all fish types, level requirements, XP |
| Woodcutting | Full — all trees, axes, XP |
| Mining | Full — all rocks, pickaxes, XP |
| Firemaking | Full |
| Cooking | Full |
| Smithing | Full — anvil and furnace |
| Fletching | Full |
| Herblore | Partial |
| Thieving | Pickpocket (100+ NPCs), picklock |
| Prayer | Bone burial, altar worship, restore |
| Banking | Deposit, withdraw, collection box |
| Doors & traversal | Doors, ladders, stairs, intermap links |
| Leagues V | Tasks, masteries, XP multipliers, tutorial |
| Music & sound | Region music, sound effects |
| Multiplayer | Multiple players on same server |

## Not Working / Missing

| Feature | Status |
|---|---|
| NPC dialogue | Only Romeo is scripted. All others say "Content not implemented" |
| Quests | None implemented |
| Agility | No courses |
| Runecrafting | No altar interactions |
| Slayer | No task system |
| Hunter | Not implemented |
| Farming | Not implemented |
| Grand Exchange | Not implemented |
| Player trading | Not implemented |
| PvP | Returns error |
| Boss scripts | Placeholder only |

## Interface bugs

- ~~Interfaces wouldn't close when clicking X~~ — **Fixed** (BUG-001)
- ~~Eating food did nothing~~ — **Fixed** (BUG-002)
- ~~Bank deposit panel did nothing~~ — **Fixed** (BUG-003)
- Some widgets may not respond correctly to button clicks

::: info
This list is maintained manually. Check [GitHub Issues](https://github.com/hadefuwa/xrsps-typescript/issues) for the latest confirmed bugs.
:::
