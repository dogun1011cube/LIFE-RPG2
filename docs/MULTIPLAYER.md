# PROJECT GENESIS — Multiplayer Design Specification (draft)

> **Status: not implemented.** The current build is single-player only. There is no
> networking, no server, no matchmaking and no online player count anywhere in the game.
> This document describes how the existing architecture is prepared for multiplayer and
> what has to be built.

## 1. What already exists in the code

| Concern | Where | Why it matters for multiplayer |
| --- | --- | --- |
| Serializable commands | `src/game/commands.ts` (`Command`, `executeCommand`) | Every player-initiated state change (collect, build, research, craft, equip, defeat enemy…) is a plain JSON command. A server can receive the same commands and run the same validation. |
| Pure systems | `src/game/**` (`placement.ts`, `researchSystem.ts`, `civilization.ts`, …) | Rules are pure functions `(state, args) → { ok, state, events }` with no DOM/Three.js dependencies, so they can run unchanged in Node on an authoritative server. |
| Transport boundary | `src/net/NetworkAdapter.ts` | `NetworkAdapter.submit(state, cmd)`. Only `LocalAdapter` exists today. |
| Stable IDs | buildings (`b_<n>`), nodes, enemy spawns, techs, recipes | Entities can be referenced across clients. |
| Ownership | `BuildingInstance.ownerId` | Foundation for build permissions. |
| Fixed-step simulation | `SIM_STEP = 0.25 s` in `civilization.ts` | Deterministic ticks that a server can own and broadcast. |
| Versioned saves | `src/game/save/saveSystem.ts` (`SAVE_VERSION`, `MIGRATIONS`, `sanitizeGameState`) | The same sanitizer can validate state received from the network. |

## 2. Target architecture

```
 Browser client                         Authoritative game server (Node)
 ┌────────────────────┐   commands      ┌──────────────────────────────┐
 │ Input → Command ───┼───────────────▶ │ validate (executeCommand)    │
 │                    │                 │ world tick (simulate @ 4 Hz) │
 │ Render (R3F)  ◀────┼─── deltas ◀──── │ broadcast state deltas/events│
 │ Prediction (opt.)  │   + events      │ persistence (Postgres/Redis) │
 └────────────────────┘                 └──────────────────────────────┘
```

* **Authority**: the server owns `GameState` for a world. Clients never mutate shared
  state directly; they submit commands and render the server's state.
* **Transport**: WebSocket (JSON first, binary/msgpack later). A `RemoteAdapter`
  implements `NetworkAdapter`: `submit` sends the command and returns an optimistic
  result; `onRemoteUpdate` applies authoritative deltas.
* **Per-player vs shared state**: split `GameState` into
  `PlayerState` (position, hp, level, equipment, personal inventory) per player and
  `WorldState` (buildings, nodes, enemies, research, shared storage) per world.
* **Movement**: client-authoritative movement with server sanity checks (speed limit,
  terrain bounds) at 10–20 Hz snapshots; remote players interpolated.
* **Combat**: client sends `attack` intents with a timestamp; server resolves hits
  against its enemy positions (lag-compensated within ~150 ms) and owns enemy AI.

## 3. Feature specifications

### Cooperative construction
* Any member with `build` permission may place buildings inside the world's build zone.
* `placeBuilding` already validates bounds, overlap, tech and cost; the server adds a
  permission check and spends from the **shared** or **personal** inventory according to
  the world setting.
* Placement previews are local; only the confirmed command is sent.

### Shared resource management
* World-level `sharedStorage` (same capacity rules as today's `getCapacities`).
* Automated production deposits into shared storage; manual collection goes to the
  collector's personal inventory with a "deposit" command at storage depots.
* Every transaction is a command, logged server-side for auditing.

### Building permissions
* Roles per world: `owner`, `engineer` (build/demolish own), `member` (use), `guest`.
* `ownerId` decides who may demolish/toggle; owners can transfer ownership.

### Trading
* Player-to-player trade: two-phase commit (`offer` → both `confirm` → server swaps
  atomically using `spend`/`add` from `inventory.ts`).
* Optional world market with server-defined prices; no real-money trading.

### Cooperative boss battles
* Server owns boss HP and AI; damage contributions tracked per player.
* Rewards granted through the central `grantReward` per participant
  (contribution threshold to prevent leeching); boss respawn timers remain server-side.

### Optional PvP arenas
* Separate instanced arena worlds; PvP never occurs in cooperative worlds.
* Normalized gear option for fair matches; no loss of base resources on defeat.

### Persistent shared worlds
* Worlds persisted server-side (snapshot every N ticks + command log).
* Offline progression: the server keeps ticking production for active worlds, or
  fast-forwards `simulate` on wake-up with capped elapsed time.
* Save format versioning (`SAVE_VERSION` + `MIGRATIONS`) reused for world snapshots.

## 4. Security notes
* Never trust client state; only commands. Re-run `executeCommand` on the server.
* Rate-limit commands per player; reject impossible positions/speeds.
* API keys (e.g. an optional ORION language-model backend) live only on the server.

## 5. Suggested implementation order
1. Extract `WorldState`/`PlayerState` split and multi-player inventories.
2. Node server running `simulate` + `executeCommand`, WebSocket transport, `RemoteAdapter`.
3. Remote player rendering + interpolation; server-owned enemies.
4. Permissions and shared storage; persistence.
5. Trading, co-op boss rewards, PvP arena instances.
