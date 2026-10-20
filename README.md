# PROJECT GENESIS

A third-person 3D civilization action RPG that runs in the browser. You arrive at a dormant research outpost and build it up into an advanced civilization through exploration, combat, research, construction and automation.

**This is a playable single-player vertical slice.** The in-game UI and text are in Korean.

> Stack: Vite 7 · React 19 · TypeScript 5.9 · Three.js r186 · React Three Fiber 9 · Zustand 5 · lucide-react · Vitest 3
> All 3D models are procedural meshes (no external assets). Sound effects are synthesized with WebAudio.

---

## Install & run

Requires Node.js 20+ (tested on 22).

```bash
npm install
npm run dev        # dev server → http://localhost:5173
```

Production build:

```bash
npm run build      # typecheck (tsc -b) + vite build → dist/
npm run preview    # serve dist/ locally → http://localhost:4173
npm test           # unit tests (Vitest)
npm run typecheck  # type check only
npm run build:artifact  # after build: single-file page (CSS/JS inlined) → dist-artifact/
```

`dist/` uses relative paths (`base: './'`), so it can be served from any static host or subpath (e.g. GitHub Pages). **Note:** the repository root `index.html` is now the Vite entry point. To deploy to GitHub Pages, publish the **build output (`dist/`)**, not the repo root. A GitHub Actions workflow for this is not included.

### Previous project (LIFE RPG)

The study-tracker web app that was in this repository (`index.html`, `main.js`, `style.css`, `blocked.html`, `assets/`) was moved, unchanged, to `public/legacy/`. It is served at `/legacy/index.html` in both dev and the build.

---

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Rotate camera (click the screen first to capture the mouse) |
| Arrow keys / right-drag | Rotate camera without mouse capture |
| Space | Jump |
| Shift | Sprint |
| Left click | Basic attack (0.5 s cooldown) |
| E | Interact (gather, salvage, talk, signs, manage buildings, terminal) |
| Q | Use a med pack |
| B | Toggle build mode |
| 1–9 / mouse wheel | Select a building (build mode) |
| R / Shift+R | Rotate building ±45° |
| Left click / right click | Place / deselect (build mode) |
| I / J / K | Inventory · Quest journal · Research tree |
| C / V / M | Crafting · Civilization status · World map |
| O | ORION assistant |
| H | Toggle the on-screen control guide |
| Ctrl+S | Quick save |
| Esc | Close menu / pause |

**Without mouse capture:** if the browser or an embedding frame refuses pointer lock, the game switches to fallback controls automatically: right-drag or arrow keys rotate the camera and left-click on the screen attacks. Confirmations (new game, demolish, reset save…) use in-game dialogs, so they also work where `window.confirm()` is blocked.

**Browser note:** for security, browsers use Esc to release pointer lock first. That opens the pause menu; click the screen to resume. In build mode, Esc deselects the building and frees the cursor so you can click the building list at the bottom. With a building selected and the cursor free, clicking the ground places it. Combat pauses while a menu is open; the civilization simulation keeps running, except in the pause menu.

---

## Core loop and features

**Explore → gather → fight → research data → technology → construction → power & production → automation → crafting → more dangerous regions**

| System | Implemented |
| --- | --- |
| World | Procedural heightmap terrain, central outpost (HQ tower, comms dish, terminal, holographic NPC), build zone and 3 ore veins, 5 zones (Green Meadow, Crashed Ship, Crystal Ridge, Corruption Zone…), distant landmark "Ancient Spire", skyline, fog/sun/shadows, instanced forests, rocks, grass and crystals |
| Player | Procedural humanoid, walk/sprint/jump/attack animations, terrain and obstacle collision, world boundary, over-the-shoulder camera that avoids walls and terrain |
| Resources | 7 resources (Gold, Iron Ore, Copper Ore, Silicon, Energy, Research Data, Alloy) plus materials/equipment/consumables. Storage caps, no negative balances, nodes deplete and regenerate (no duplicate gathering) |
| Combat | Slime (3 types) with hop movement, detection/chase/leash, telegraphed attacks (squash wind-up), hit flash, knockback, invulnerability frames, death effects, HP bars. **Corrupted Guardian boss** with a ground-ring slam telegraph. Rule-based respawns, death penalty (10% gold) and respawn at the outpost |
| Progression | Central reward system (`grantReward`), tunable XP formula (`40·L^1.6`), level-up stat gains, gold training (vitality/strength) |
| Construction | 10 building types (Generator, Research Lab, Workshop, Auto Miner, Alloy Smelter, Storage Depot, Battery Bank, Defense Turret, Plasma Generator, Genesis Beacon). Live preview (green/red), validation for bounds, overlap, terrain, tech, cost, vein and max count. Rotation, on/off toggle, demolition (50% refund). Data-driven registry |
| Power / industry | Single fixed-step simulation at 4 Hz. Priority-based power allocation (labs and turrets first, miners last), energy storage with hysteresis, shortage warnings, input/output checks, production stops when storage is full |
| Research | 12 technologies across 5 branches, dependency-graph UI, locked/available/researching/completed states, inspect before spending, cancel with refund. Unlocks buildings, recipes and modifiers |
| Crafting | 11 recipes (weapons, armor, tools, modules, components, consumables, generator boost coil). Craft queue processed by a powered workshop |
| Quests | 6 sequential quests (First Contact → Restore Power → First Discovery → Automation → Dangerous Territory → Genesis), real completion conditions and rewards, HUD tracker and journal. Signs and an NPC provide guidance |
| ORION | Rule-based assistant (no external AI). Answers power, research recommendations, automation steps, building costs, combat prep, civilization status, quests and locations from live game state. Provider interface allows plugging in a server-side LLM later |
| Saving | localStorage, versioned format with a migration hook, validation/sanitizing on load, autosave every 2 minutes, save/load/new game/reset (with confirmation) |
| UI | Main menu, HUD, inventory, build bar, building inspector, research tree, crafting, quest journal, civilization dashboard, map, ORION, pause, settings (sensitivity, invert Y, volume, mute, shadows, FPS, guide), controls, death screen, notifications, floating combat text |
| Multiplayer | **Not implemented.** The menu has a clearly labeled "planned" panel. Architecture prep and design: [`docs/MULTIPLAYER.md`](docs/MULTIPLAYER.md) |

### Recommended path

1. Exit the drop pod and head to the outpost to the north. Gather iron (gray) and copper (orange) with E.
2. Press B and build a **Generator** (it powers the outpost lab).
3. Recover research data from wreckage at the Crashed Ship (west) or from slimes in the Green Meadow (east). Start your first research with K.
4. Basic Semiconductors → Automated Mining → build a Workshop → craft an Auto-Mining Component → place an **Auto Miner** on a glowing ore vein. Add a generator if power runs short.
5. Advanced Equipment → craft the Hazard Module and a stronger weapon → defeat the **Corrupted Guardian** in the Corruption Zone to the north.
6. Research Stellar Engineering and build the **Genesis Beacon**.

---

## Code structure

```
src/
  app/          App.tsx (screen composition), ErrorBoundary, debug hooks
  data/         Definitions: resources, items, buildings, technologies, recipes, enemies, quests, world, dialogue
  game/
    types.ts            Shared types (definitions vs runtime instances)
    commands.ts         Serializable commands → pure systems (network boundary)
    initialState.ts
    GameLoop.tsx        The single per-frame loop (input → player → combat → AI → turrets → interaction → simulation → camera)
    GameCanvas.tsx      R3F scene composition
    runtime.ts          Per-frame mutable state (kept out of React)
    building/  combat/  crafting/  progression/  quests/  research/  resources/  save/  simulation/
    world/              Terrain function, collision, scatter, interactables, environment and outpost meshes
    entities/           Player, ORION drone, enemy meshes
    fx/                 Pooled particles, beams, floating text
    input/              Input manager (listeners registered once)
    render/materials.ts Shared material palette
  ai/           OrionAssistant (provider interface), OrionRules (state-based rules)
  net/          NetworkAdapter (LocalAdapter only)
  state/        gameStore (game state + commands), uiStore (UI state + settings)
  ui/           hud, building, inventory, research, crafting, quests, civilization, map, assistant, menus, common
  audio/        WebAudio synthesized sound effects
  styles/       theme.css (tokens), global.css
```

Principles: gameplay rules are pure functions (`state → { ok, state, events }`) and independent of rendering and UI. All state changes go through `useGame().dispatch(command)`. Events flow to quests, notifications and sound through a single bus. Per-frame values (positions etc.) live in `runtime` to avoid React re-renders.

**Adding a building:** add an entry to `src/data/buildings.ts` (and to `BUILD_ORDER`). Optionally register a mesh in `MODELS` in `BuildingModels.tsx`; a generic mesh is used otherwise. The construction, simulation, save and UI systems pick it up automatically.

---

## Tests

* `npm test`: 24 unit tests
  * Core loop: gathering and depletion/regeneration, build cost and validation, generator → lab power, research prerequisites and completion, miner on a vein, power-shortage priority and hysteresis, XP/level-up, quest 1 events, enemy rewards and respawn, crafting → equipping, save round-trip and invalid-data recovery
  * Systems: placement bounds/overlap/tech/player overlap, max count, demolition refund, disabled buildings, storage caps, smelter input shortage, respawn distance rule, defense/death penalty, boss quest
  * ORION: verifies that answers to 7 kinds of questions use real state values
* Browser end-to-end playtests (headless Chromium + SwiftShader, real keyboard/mouse input) confirmed: menu → new game, pointer lock, movement/camera, E gathering, inventory, build mode → generator placed with the mouse → power generated → quests 1–2 complete, killing a slime and its rewards, starting research from the UI → completion, miner shut down during a power shortage → running after adding a generator, ORION answers, crafting/equipping/training from the UI, pause/settings, death/respawn, turret, hazard-zone damage, boss defeat and core drop, Ctrl+S → reload → continue restores state, safe recovery from corrupted saves.
  * Software rendering in the test environment ran at about 2–3 FPS. The loop itself costs about 0.7 ms/frame (~480 draw calls, ~180k triangles), so a normal GPU should be fast. Frame rate on a real GPU was **not measured**.

## Known limitations

* No multiplayer or networking (design document only).
* ORION is rule-based. Questions it doesn't recognize get example questions back. There is no external LLM integration.
* Collision uses circles (trees, rocks, buildings) plus the terrain height function. You can't climb onto buildings.
* Enemies only attack the player; there are no raids on buildings, so turrets just help defend the base area.
* Single save slot (plus autosave to the same slot). Saves live only in this browser.
* No mobile or touch controls. Pointer lock requires a desktop browser.
* Character animation is procedural (no skeletal animation).
* Bundle size ~1.3 MB (gzip ~380 KB), no code splitting.

## Suggested next steps

1. Base raids and building HP to give turrets a real role; hold-to-gather and gathering animations.
2. Conveyor and logistics links between buildings, power-grid range (power poles).
3. More regions, enemy types and ranged enemies; a dodge/roll and combos.
4. Multiple save slots, and saving/loading enemy HP and positions.
5. Server-side ORION LLM endpoint (`OrionProvider` implementation, API key kept on the server).
6. Multiplayer: implement in the order given in `docs/MULTIPLAYER.md`.
7. Code splitting (lazy-load panels), GitHub Pages deploy workflow.
