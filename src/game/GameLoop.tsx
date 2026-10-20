import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../state/gameStore';
import { useUi } from '../state/uiStore';
import { runtime, type EnemyRuntime } from './runtime';
import { attachInput, detachInput, endInputFrame, input, lockState, requestLock } from './input/input';
import { terrainHeight, zoneAt } from './world/terrain';
import { pointBlocked, resolveCircle, syncBuildingColliders } from './world/collision';
import { getScatter } from './world/scatter';
import { findInteractable } from './world/interactables';
import { createEnemyRuntime, separateEnemies, updateEnemy } from './combat/enemyAI';
import { COMBAT } from './combat/combatSystem';
import { SIM_STEP } from './simulation/civilization';
import { getPlayerStats } from './progression/progression';
import { ENEMIES } from '../data/enemies';
import { BUILDINGS } from '../data/buildings';
import { ENEMY_SPAWNS } from '../data/world';
import { fx } from './fx/Effects';
import { playSfx } from '../audio/sfx';
import { angleDiff, clamp } from '../utils/math';
import { act, buildCycle, interact, placeSelectedBuilding, saveGameNow, showGains, useMedPack } from './actions';

const WALK_SPEED = 5.2;
const SPRINT_SPEED = 8.6;
const JUMP_VELOCITY = 8.2;
const GRAVITY = 24;
const PLAYER_RADIUS = 0.45;
const AUTOSAVE_INTERVAL = 120;
const FRAME_CAP = 0.5;
const KEY_TURN_SPEED = 2.4;
const MAX_SUBSTEP = 1 / 30;

/** Lightweight performance counters (read by the FPS overlay / tests). */
export const perf = { loopMs: 0, calls: 0, triangles: 0 };

const tmp = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();

/**
 * The single per-frame update for gameplay: input → player → combat → enemies →
 * turrets → interaction → world checks → fixed-step simulation → camera.
 * Mounted first inside the Canvas so it runs before render-side frame callbacks.
 */
export function GameLoop() {
  const { gl, camera } = useThree();
  const simAccum = useRef(0);
  const zoneTimer = useRef(0);
  const autosave = useRef(0);
  const session = useGame((s) => s.session);

  useEffect(() => {
    attachInput(gl.domElement);
    lockState.onUnavailable = () => useUi.getState().setLockUnavailable(true);
    runtime.staticColliders = getScatter().colliders;
    const onLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      const ui = useUi.getState();
      ui.setPointerLocked(locked);
      if (!locked) lockState.lostAt = performance.now();
      // Losing pointer lock during free play (e.g. Esc) opens the pause menu
      if (!locked && ui.phase === 'playing' && !ui.panel && !ui.buildMode && !ui.dead && !ui.dialog) ui.openPanel('pause');
      if (!locked && ui.buildMode && ui.buildSelection && !ui.panel) ui.selectBuilding(null);
    };
    const onCanvasDown = (e: MouseEvent) => {
      const ui = useUi.getState();
      if (ui.phase !== 'playing' || ui.panel || ui.dead) return;
      // In build mode with a selection and a free cursor, clicks place instead of locking
      if (ui.buildMode && ui.buildSelection && !document.pointerLockElement) return;
      if (e.button === 0) requestLock();
    };
    const onBlur = () => {
      const ui = useUi.getState();
      if (ui.phase === 'playing' && !ui.panel && !ui.dead) ui.openPanel('pause');
    };
    document.addEventListener('pointerlockchange', onLockChange);
    gl.domElement.addEventListener('mousedown', onCanvasDown);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      gl.domElement.removeEventListener('mousedown', onCanvasDown);
      window.removeEventListener('blur', onBlur);
      lockState.onUnavailable = null;
      detachInput();
    };
  }, [gl]);

  useEffect(() => {
    simAccum.current = 0;
    autosave.current = 0;
  }, [session]);

  useFrame(({ gl: renderer }, rawDt) => {
    const t0 = performance.now();
    // Physics/AI advance in fixed substeps so gameplay speed is frame-rate independent;
    // long hitches (tab switch) are capped at FRAME_CAP seconds.
    const frameDt = Math.min(rawDt, FRAME_CAP);
    const substeps = Math.max(1, Math.ceil(frameDt / MAX_SUBSTEP));
    const dt = frameDt / substeps;
    const ui = useUi.getState();
    const store = useGame.getState();
    runtime.time += frameDt;

    if (ui.phase === 'menu') {
      // Cinematic orbit around the outpost
      const t = runtime.time * 0.05;
      camera.position.set(Math.cos(t) * 48, 20, Math.sin(t) * 48 + 4);
      camera.lookAt(0, 6, -6);
      endInputFrame();
      return;
    }

    const game = store.game;
    syncBuildingColliders(game.buildings);
    const settings = ui.settings;
    const p = runtime.player;
    const paused = ui.panel === 'pause' || ui.panel === 'settings' || ui.panel === 'controls';
    const frozen = !!ui.panel || !!ui.dead;
    const locked = !!document.pointerLockElement;
    const stats = getPlayerStats(game);

    // ---------------- Camera look (pointer lock, right-drag fallback, or arrow keys)
    if (!ui.panel && !ui.dead) {
      const sens = 0.0023 * settings.sensitivity;
      const invert = settings.invertY ? -1 : 1;
      runtime.camera.yaw -= input.mouseDX * sens;
      runtime.camera.pitch = clamp(runtime.camera.pitch + input.mouseDY * sens * invert, -0.4, 1.15);
      const turn = (input.keys.has('ArrowLeft') ? 1 : 0) - (input.keys.has('ArrowRight') ? 1 : 0);
      const tilt = (input.keys.has('ArrowDown') ? 1 : 0) - (input.keys.has('ArrowUp') ? 1 : 0);
      if (turn) runtime.camera.yaw += turn * KEY_TURN_SPEED * settings.sensitivity * frameDt;
      if (tilt) runtime.camera.pitch = clamp(runtime.camera.pitch + tilt * KEY_TURN_SPEED * 0.5 * settings.sensitivity * invert * frameDt, -0.4, 1.15);
    }

    // ---------------- Gameplay input
    if (!frozen) {
      if (ui.buildMode) {
        const cycle = buildCycle();
        for (let i = 0; i < 9; i++) {
          if (input.pressed.has(`Digit${i + 1}`) && cycle[i]) {
            ui.selectBuilding(cycle[i]);
            playSfx('click');
          }
        }
        if (input.wheel !== 0 && cycle.length) {
          const idx = cycle.indexOf(ui.buildSelection ?? '');
          const next = cycle[(idx + (input.wheel > 0 ? 1 : -1) + cycle.length) % cycle.length];
          ui.selectBuilding(next);
        }
        if (input.pressed.has('KeyR')) ui.rotateBuilding(input.keys.has('ShiftLeft') ? -Math.PI / 4 : Math.PI / 4);
        if (input.clicks.has(0) && ui.buildSelection && (locked || input.cursorOverCanvas)) {
          if (ui.placement?.valid) placeSelectedBuilding();
          else {
            ui.notify({ kind: 'error', title: ui.placement?.reason ?? '여기에 건설할 수 없습니다.' });
            playSfx('error');
          }
        }
        if (input.clicks.has(2) && ui.buildSelection) ui.selectBuilding(null);
      } else {
        if (input.wheel !== 0) runtime.camera.distance = clamp(runtime.camera.distance + input.wheel * 0.8, 3.5, 13);
        // Without pointer lock (refused by the browser/frame), a left click on the canvas attacks
        const canAttack = locked || (lockState.unavailable && input.cursorOverCanvas);
        if (input.clicks.has(0) && canAttack && p.attackCd <= 0) performAttack(stats.attack);
        if (input.pressed.has('KeyE')) {
          const target = findInteractable(game, p.pos.x, p.pos.z);
          if (target && !target.disabled) interact(target);
          else if (target?.disabled) {
            ui.notify({ kind: 'warning', title: '고갈된 자원입니다.', body: '잠시 후 다시 채집할 수 있습니다.' });
          }
        }
      }
      if (input.pressed.has('KeyQ')) useMedPack();
    }

    // ---------------- Player movement + enemies (fixed substeps)
    for (const spawn of ENEMY_SPAWNS) {
      const alive = game.enemies[spawn.id]?.alive;
      const rt = runtime.enemies.get(spawn.id);
      if (alive && !rt) {
        const e = createEnemyRuntime(spawn.id);
        if (e) runtime.enemies.set(spawn.id, e);
      } else if (!alive && rt && rt.mode !== 'dying') {
        runtime.enemies.delete(spawn.id);
      }
    }
    const jump = input.pressed.has('Space');
    for (let i = 0; i < substeps; i++) {
      stepPlayer(dt, frozen, jump && i === 0);
      if (!frozen) stepEnemies(dt, !!ui.dead);
    }

    // ---------------- Turrets
    if (!frozen) updateTurrets(frameDt, game.buildings);

    // ---------------- Interaction prompt
    if (!frozen && !ui.buildMode) {
      const target = findInteractable(game, p.pos.x, p.pos.z);
      runtime.interactTarget = target ? { id: target.id, kind: target.kind } : null;
      ui.setPrompt(target ? { id: target.id, label: target.label, action: target.action, disabled: target.disabled } : null);
    } else if (ui.prompt) {
      ui.setPrompt(null);
      runtime.interactTarget = null;
    }
    if (ui.dialog && (!runtime.interactTarget || frozen)) {
      // close sign/NPC dialog once the player walks away
      const near = findInteractable(game, p.pos.x, p.pos.z);
      if (!near || (near.kind !== 'sign' && near.kind !== 'npc')) ui.setDialog(null);
    }

    // ---------------- Zones, hazards, regeneration (twice per second)
    zoneTimer.current += frameDt;
    if (zoneTimer.current >= 0.5 && !frozen) {
      const step = zoneTimer.current;
      zoneTimer.current = 0;
      const zone = zoneAt(p.pos.x, p.pos.z);
      ui.setZoneName(zone?.name ?? null);
      if (zone && !game.discovered.includes(zone.id)) {
        act({ type: 'discoverZone', zone: zone.id }, { silentFail: true });
        ui.notify({ kind: zone.danger >= 3 ? 'warning' : 'info', title: `지역 발견: ${zone.name}`, body: zone.hazard ? '부식성 에너지가 감지됩니다!' : undefined });
      }
      if (zone?.hazard && !stats.hazardProtection && !ui.dead) {
        const dmg = Math.round(COMBAT.hazardDps * step);
        const r = useGame.getState().hurtPlayer(dmg, true);
        p.hurtFlash = 0.12;
        fx.text(p.pos.clone().add(new THREE.Vector3(0, 2, 0)), `-${r.dealt} 부식`, 'hurt');
        if (r.died) onPlayerDeath();
      } else if (!ui.dead) {
        const sinceHurt = runtime.time - p.lastHurt;
        if (sinceHurt > COMBAT.regenDelay) {
          const rate = zone?.id === 'outpost' ? COMBAT.outpostRegenRate : COMBAT.regenRate;
          useGame.getState().heal(rate * step);
        }
      }
    }

    // ---------------- Fixed-step civilization simulation
    if (!paused) {
      // The economy simulation tracks real time (up to 1 s per frame, max 8 fixed steps)
      simAccum.current += Math.min(rawDt, 1);
      let steps = 0;
      while (simAccum.current >= SIM_STEP && steps < 8) {
        simAccum.current -= SIM_STEP;
        useGame.getState().tick(SIM_STEP, { playerX: p.pos.x, playerZ: p.pos.z });
        steps++;
      }
      autosave.current += frameDt;
      if (autosave.current > AUTOSAVE_INTERVAL && !ui.dead) {
        autosave.current = 0;
        if (saveGameNow(true)) ui.notify({ kind: 'info', title: '자동 저장되었습니다.' });
      }
    }

    // ---------------- Camera
    updateCamera(camera, frameDt, ui.buildMode);
    endInputFrame();
    perf.loopMs = perf.loopMs * 0.9 + (performance.now() - t0) * 0.1;
    perf.calls = renderer.info.render.calls;
    perf.triangles = renderer.info.render.triangles;
  });

  return null;
}

function stepPlayer(dt: number, frozen: boolean, jump: boolean) {
  const p = runtime.player;
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.attackAnim = Math.max(0, p.attackAnim - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  if (!frozen) {
    const yaw = runtime.camera.yaw;
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    let mx = 0;
    let mz = 0;
    if (input.keys.has('KeyW')) {
      mx += fwdX;
      mz += fwdZ;
    }
    if (input.keys.has('KeyS')) {
      mx -= fwdX;
      mz -= fwdZ;
    }
    if (input.keys.has('KeyD')) {
      mx += -fwdZ;
      mz += fwdX;
    }
    if (input.keys.has('KeyA')) {
      mx -= -fwdZ;
      mz -= fwdX;
    }
    const len = Math.hypot(mx, mz);
    p.sprinting = len > 0 && (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight'));
    const target = len > 0 ? (p.sprinting ? SPRINT_SPEED : WALK_SPEED) : 0;
    const dirX = len > 0 ? mx / len : 0;
    const dirZ = len > 0 ? mz / len : 0;
    const accel = p.onGround ? 14 : 4;
    p.vel.x += (dirX * target - p.vel.x) * Math.min(1, accel * dt);
    p.vel.z += (dirZ * target - p.vel.z) * Math.min(1, accel * dt);
    if (len > 0 && p.attackAnim <= 0) p.facing += angleDiff(p.facing, Math.atan2(-dirX, -dirZ)) * Math.min(1, dt * 12);
    if (jump && p.onGround) {
      p.vel.y = JUMP_VELOCITY;
      p.onGround = false;
    }
  } else {
    p.vel.x *= Math.exp(-dt * 12);
    p.vel.z *= Math.exp(-dt * 12);
  }
  p.vel.y -= GRAVITY * dt;
  p.pos.addScaledVector(p.vel, dt);
  resolveCircle(p.pos, PLAYER_RADIUS);
  const ground = terrainHeight(p.pos.x, p.pos.z);
  if (p.pos.y <= ground) {
    p.pos.y = ground;
    p.vel.y = 0;
    p.onGround = true;
  } else if (p.pos.y > ground + 0.05) {
    p.onGround = false;
  }
  p.speed = Math.hypot(p.vel.x, p.vel.z);
}

function stepEnemies(dt: number, playerDead: boolean) {
  const p = runtime.player;
  const list: EnemyRuntime[] = [];
  for (const e of runtime.enemies.values()) {
    // Only simulate enemies near the player (cheap LOD)
    if (e.pos.distanceToSquared(p.pos) > 90 * 90 && e.mode !== 'dying') continue;
    const hit = updateEnemy(e, dt, !playerDead);
    if (hit && p.invuln <= 0) hurtPlayer(hit.damage, hit.enemy.pos);
    if (e.mode === 'dying' && e.deathTimer > 0.55) finishEnemy(e.id);
    else if (e.mode !== 'dying') list.push(e);
  }
  separateEnemies(list);
}

function performAttack(attack: number) {
  const p = runtime.player;
  p.attackCd = COMBAT.attackCooldown;
  p.attackAnim = 0.32;
  p.attackSide *= -1;
  // Snap facing to the camera direction for responsive aiming
  p.facing = runtime.camera.yaw;
  playSfx('swing');
  const fwdX = -Math.sin(p.facing);
  const fwdZ = -Math.cos(p.facing);
  let hitAny = false;
  for (const e of runtime.enemies.values()) {
    if (e.mode === 'dying') continue;
    const def = ENEMIES[e.type];
    const dx = e.pos.x - p.pos.x;
    const dz = e.pos.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    const reach = COMBAT.attackRange + 0.5 * def.scale;
    if (d > reach) continue;
    const dot = d > 0.01 ? (dx * fwdX + dz * fwdZ) / d : 1;
    if (dot < Math.cos(COMBAT.attackArc / 2)) continue;
    const dmg = Math.max(1, Math.round(attack * (0.9 + Math.random() * 0.2)));
    e.hp -= dmg;
    e.hitFlash = 0.18;
    hitAny = true;
    if (!def.boss) {
      e.stun = COMBAT.enemyHitStun;
      if (e.mode === 'windup') e.mode = 'chase';
      e.vel.x += (dx / (d || 1)) * COMBAT.knockback;
      e.vel.z += (dz / (d || 1)) * COMBAT.knockback;
    }
    if (e.mode === 'idle' || e.mode === 'wander' || e.mode === 'return') e.mode = 'chase';
    const hitPos = e.pos.clone().add(new THREE.Vector3(0, 0.8 * def.scale, 0));
    fx.burst(hitPos, def.color, 8, 3.5);
    fx.text(hitPos.clone().add(new THREE.Vector3(0, 0.6 * def.scale, 0)), `${dmg}`, 'damage');
    if (e.hp <= 0) {
      e.mode = 'dying';
      e.deathTimer = 0;
      fx.burst(hitPos, def.coreColor, 30, 6, 7, 0.18);
      playSfx('kill');
    }
  }
  if (hitAny) playSfx('hit');
}

function finishEnemy(id: string) {
  const e = runtime.enemies.get(id);
  if (!e) return;
  runtime.enemies.delete(id);
  const before = useGame.getState().game;
  const r = act({ type: 'defeatEnemy', spawnId: id, seed: Math.floor(Math.random() * 1e9) }, { silentFail: true });
  if (!r.ok) return;
  const after = useGame.getState().game;
  const gains: Record<string, number> = {};
  for (const [k, v] of Object.entries(after.inventory)) {
    const d = v - (before.inventory[k] ?? 0);
    if (d > 0) gains[k] = d;
  }
  const def = ENEMIES[e.type];
  showGains(e.pos, gains);
  fx.text(e.pos.clone().add(new THREE.Vector3(0, 2.2 * def.scale, 0)), `+${def.xp} XP`, 'reward');
  if (def.boss) useUi.getState().notify({ kind: 'reward', title: `${def.name} 처치!`, body: '고대 코어를 회수했습니다.' });
}

function hurtPlayer(raw: number, from: THREE.Vector3) {
  const p = runtime.player;
  const r = useGame.getState().hurtPlayer(raw);
  p.invuln = COMBAT.playerInvulnerability;
  p.lastHurt = runtime.time;
  p.hurtFlash = 0.15;
  // knock the player back slightly
  tmp.set(p.pos.x - from.x, 0, p.pos.z - from.z).normalize();
  p.vel.x += tmp.x * 6;
  p.vel.z += tmp.z * 6;
  p.vel.y = Math.max(p.vel.y, 3);
  playSfx('hurt');
  fx.text(p.pos.clone().add(new THREE.Vector3(0, 2, 0)), `-${r.dealt}`, 'hurt');
  if (r.died) onPlayerDeath();
}

function onPlayerDeath() {
  const ui = useUi.getState();
  if (ui.dead) return;
  const gold = useGame.getState().game.inventory.gold ?? 0;
  ui.setDead({ goldLost: Math.floor(gold * 0.1) });
  document.exitPointerLock?.();
}

function updateTurrets(dt: number, buildings: ReturnType<typeof useGame.getState>['game']['buildings']) {
  for (const b of buildings) {
    if (b.type !== 'defense_turret') continue;
    const cfg = BUILDINGS[b.type].turret!;
    const t = runtime.turrets.get(b.id) ?? { cd: 0, yaw: b.rotation };
    runtime.turrets.set(b.id, t);
    t.cd = Math.max(0, t.cd - dt);
    if (b.state !== 'operational') continue;
    let best: { e: ReturnType<typeof runtime.enemies.get>; d: number } | null = null;
    for (const e of runtime.enemies.values()) {
      if (e.mode === 'dying') continue;
      const d = Math.hypot(e.pos.x - b.position[0], e.pos.z - b.position[2]);
      if (d <= cfg.range && (!best || d < best.d)) best = { e, d };
    }
    if (!best?.e) continue;
    const e = best.e;
    t.yaw = Math.atan2(-(e.pos.x - b.position[0]), -(e.pos.z - b.position[2]));
    if (t.cd > 0) continue;
    t.cd = cfg.cooldown;
    const from = new THREE.Vector3(b.position[0], b.position[1] + 2.1, b.position[2]);
    const to = e.pos.clone().add(new THREE.Vector3(0, 0.7 * ENEMIES[e.type].scale, 0));
    fx.beam(from, to, '#5ef2ff');
    fx.burst(to, '#9ff4ff', 5, 2.5);
    playSfx('shoot');
    e.hp -= cfg.damage;
    e.hitFlash = 0.18;
    if (e.mode === 'idle' || e.mode === 'wander') e.mode = 'chase';
    fx.text(to.clone().add(new THREE.Vector3(0, 0.6, 0)), `${cfg.damage}`, 'damage');
    if (e.hp <= 0) {
      e.mode = 'dying';
      e.deathTimer = 0;
      fx.burst(to, ENEMIES[e.type].coreColor, 24, 5);
    }
  }
}

function updateCamera(camera: THREE.Camera, dt: number, buildMode: boolean) {
  const c = runtime.camera;
  const p = runtime.player.pos;
  const yaw = c.yaw;
  const pitch = buildMode ? Math.max(c.pitch, 0.5) : c.pitch;
  const wanted = buildMode ? Math.max(c.distance, 11) : c.distance;
  // Over-the-shoulder pivot
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  camTarget.set(p.x + rightX * 0.55, p.y + 1.75, p.z + rightZ * 0.55);
  const ox = Math.sin(yaw) * Math.cos(pitch);
  const oy = Math.sin(pitch);
  const oz = Math.cos(yaw) * Math.cos(pitch);
  // Pull the camera in front of any obstacle between pivot and desired position
  let allowed = wanted;
  for (let t = 0.6; t <= wanted; t += 0.3) {
    camPos.set(camTarget.x + ox * t, camTarget.y + oy * t, camTarget.z + oz * t);
    if (pointBlocked(camPos)) {
      allowed = Math.max(1.2, t - 0.4);
      break;
    }
  }
  // Snap in quickly, ease out slowly
  const k = allowed < c.currentDistance ? 1 - Math.exp(-dt * 20) : 1 - Math.exp(-dt * 3);
  c.currentDistance += (allowed - c.currentDistance) * k;
  const d = c.currentDistance;
  camera.position.set(camTarget.x + ox * d, camTarget.y + oy * d, camTarget.z + oz * d);
  const minY = terrainHeight(camera.position.x, camera.position.z) + 0.3;
  if (camera.position.y < minY) camera.position.y = minY;
  camera.lookAt(camTarget);
}
