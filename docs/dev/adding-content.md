# Adding Content

Cookbook-style recipes for the most common content tasks. All content lives in `server/gamemodes/vanilla/` and gets registered in `index.ts`.

## NPC Dialogue

```ts
// server/gamemodes/vanilla/scripts/content/myNpc.ts
import type { IScriptRegistry, ScriptServices } from '../../../src/game/scripts/types';

export function registerMyNpc(registry: IScriptRegistry, services: ScriptServices): void {
    registry.registerNpcAction(NPC_TYPE_ID, 'talk-to', ({ player, npc }) => {
        services.dialog.openDialog(player, {
            kind: 'npc',
            npcId: npc.typeId,
            lines: ['Hello there, adventurer!', 'What brings you here?'],
            clickToContinue: true,
            closeOnContinue: true,
            onContinue: () => services.dialog.closeDialog(player, `npc_${npc.id}`),
        });
    });
}
```

Then add to `server/gamemodes/vanilla/scripts/content/index.ts`:
```ts
registerMyNpc(registry, services);
```

### Finding NPC type IDs
Use the OSRS wiki — search the NPC name, the ID is in the infobox. Or look at `server/data/npc-spawns.json` to find spawned NPCs and their type IDs.

---

## Food Item

```ts
// Add to the FOOD_DEFINITIONS array in:
// server/gamemodes/vanilla/skills/consumables/index.ts

{ itemId: 385, healAmount: 20, name: 'Shark' },
```

---

## Shop

```ts
registry.registerNpcAction(SHOP_NPC_ID, 'trade', ({ player }) => {
    services.shop.openShop(player, {
        name: 'General Store',
        items: [
            { itemId: 1931, stock: 10, price: 1 },  // Pot
            { itemId: 1925, stock: 10, price: 2 },  // Bucket
        ],
    });
});
```

---

## Item interaction (on inventory item)

```ts
registry.registerItemAction(ITEM_ID, ({ player }) => {
    // do something
    services.inventory.removeItem(player, ITEM_ID, 1);
    services.messaging.queueChatMessage({ player, text: 'You used the item.' });
}, 'use');
```

---

## Location (rock, tree, door, fishing spot)

```ts
registry.registerLocAction(LOC_TYPE_ID, 'mine', ({ player, loc }) => {
    // grant ore, grant XP, etc.
    services.skill.addXp(player, Skill.MINING, 17.5);
});
```

---

## Finding IDs

| Thing | Where to find the ID |
|---|---|
| NPC type ID | OSRS wiki infobox, or `server/data/npc-spawns.json` |
| Item ID | OSRS wiki infobox, or `src/shared/` item constants |
| Location ID | OSRS wiki, or cache viewer tools like RuneLite cache editor |
| Varbit/Varp | `src/shared/vars.ts` for known ones, otherwise OSRS wiki |
