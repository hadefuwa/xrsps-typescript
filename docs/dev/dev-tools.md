# Dev Tools (F1)

Pressing **F1** toggles two UI panels that are only useful for development and debugging. Neither is visible to players in a production build.

---

## Left panel — Leva debug controls

Built with [Leva](https://github.com/pmndrs/leva), a React debug GUI. Appears top-left. Collapsed by default — click the title bar to expand it.

| Section | What it does |
|---|---|
| **Camera** | Switch between perspective and orthographic projection. Adjust camera speed. Set ortho zoom level. |
| **Distance** | Draw distance slider (25–90 tiles). Map radius (how many map squares load around you). LOD distance. |
| **Cache** | Hot-swap to a different OSRS cache version without reloading the page. |
| **Vars** | Manually set any varp or varbit to any value. Useful for testing quest/tutorial state. Hits `setVarp`/`setVarbit` on the client-side var manager directly. |
| **DevTools** | Toggle visual overlays: collision map, object bounds (purple boxes), server pathfinding overlay, tile IDs on objects. |
| **Record** | Camera path recorder — add waypoints with F3, delete with F4, play a smooth cinematic flythrough with F2. Useful for screenshots or trailers. |
| **Export** | Dump all sprites or all textures from the loaded cache to a zip file via FileSaver. |
| **Render** | Switch renderer type, set FPS cap, toggle performance profiler and verbose profiler output. |
| **Menu** | Toggle tooltips and debug ID display on right-click menus. |

**File:** `src/client/DebugControls.tsx`

---

## Right panel — Plugin sidebar

A **RuneLite-style plugin system** with a tab rail on the right edge. See [Plugins](/players/plugins) for the player-facing guide.

### Adding a new plugin

1. Create `src/client/plugins/{name}/` with at least `SidebarPlugin.tsx`
2. Export a `ClientSidebarPluginDefinition` object:

```ts
// src/client/plugins/myplugin/SidebarPlugin.tsx
import type { ClientSidebarPluginDefinition } from '../../sidebar/pluginTypes';

export const MY_PLUGIN: ClientSidebarPluginDefinition = {
    id: 'my_plugin',
    title: 'My Plugin',
    tooltip: 'Does something useful',
    priority: 50,
    icon: (props) => <MyIcon {...props} />,
    panelId: 'my_plugin',
    panel: () => <MyPluginPanel />,
};
```

3. Register it in `src/client/sidebar/entries.ts`:

```ts
import { MY_PLUGIN } from '../plugins/myplugin/SidebarPlugin';

const DEFAULT_CLIENT_SIDEBAR_PLUGINS = Object.freeze([
    PLUGIN_HUB_SIDEBAR_PLUGIN,
    MY_PLUGIN,             // add here
    GROUND_ITEMS_SIDEBAR_PLUGIN,
    ...
]);
```

4. Add a visibility option to `SidebarPluginVisibilityOptions` if you want it to be togglable.

### Plugin persistence

Use `localStorage` directly or follow the pattern in `src/client/plugins/notes/BrowserNotesPluginPersistence.ts` for structured persistence with a typed schema.

### Existing plugins

| Plugin | ID | File |
|---|---|---|
| Plugin Hub | `plugin_hub` | `plugins/pluginhub/` |
| Ground Items | `ground_items` | `plugins/grounditems/` |
| Interact Highlight | `interact_highlight` | `plugins/interacthighlight/` |
| Tile Markers | `tile_markers` | `plugins/tilemarkers/` |
| Notes | `notes` | `plugins/notes/` |

---

## Hiding dev tools in production

The Leva panel is rendered in `src/client/DebugControls.tsx` with `hidden={hideUi}`. The `hideUi` state is toggled by F1.

To remove it entirely from a production build, remove `<DebugControls />` from `src/client/OsrsClientApp.tsx`. The plugin sidebar is player-facing and should stay.
