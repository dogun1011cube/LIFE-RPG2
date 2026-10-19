import * as THREE from 'three';
import { ENEMIES } from '../../data/enemies';
import { ENEMY_SPAWNS } from '../../data/world';
import { runtime, type EnemyRuntime } from '../runtime';
import { resolveCircle } from '../world/collision';
import { terrainHeight } from '../world/terrain';
import { angleDiff } from '../../utils/math';

export const WINDUP_TIME = 0.5;
export const BOSS_WINDUP_TIME = 1.0;
export const BOSS_SLAM_RADIUS = 5.5;
const RECOVER_TIME = 0.6;

export function createEnemyRuntime(spawnId: string): EnemyRuntime | null {
  const spawn = ENEMY_SPAWNS.find((s) => s.id === spawnId);
  if (!spawn) return null;
  const def = ENEMIES[spawn.type];
  const [x, z] = spawn.position;
  return {
    id: spawn.id,
    type: spawn.type,
    pos: new THREE.Vector3(x, terrainHeight(x, z), z),
    vel: new THREE.Vector3(),
    home: new THREE.Vector2(x, z),
    hp: def.maxHp,
    maxHp: def.maxHp,
    facing: Math.random() * Math.PI * 2,
    mode: 'idle',
    timer: Math.random() * 2,
    attackCd: 0,
    hitFlash: 0,
    stun: 0,
    hop: Math.random() * Math.PI * 2,
    wanderTarget: new THREE.Vector2(x, z),
    deathTimer: 0,
  };
}

export interface EnemyHit {
  enemy: EnemyRuntime;
  damage: number;
  boss: boolean;
}

/**
 * Advances one enemy. Returns a hit on the player when an attack connects.
 * Attacks are telegraphed with a wind-up (squash / ground ring) so they can be dodged.
 */
export function updateEnemy(e: EnemyRuntime, dt: number, playerAlive: boolean): EnemyHit | null {
  const def = ENEMIES[e.type];
  const p = runtime.player.pos;
  const dx = p.x - e.pos.x;
  const dz = p.z - e.pos.z;
  const dist = Math.hypot(dx, dz);
  const homeDist = Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.y);
  const leash = def.detectRange * 2.6;
  let hit: EnemyHit | null = null;

  e.hitFlash = Math.max(0, e.hitFlash - dt);
  e.attackCd = Math.max(0, e.attackCd - dt);
  let moveSpeed = 0;
  let moveDir = 0;

  if (e.mode === 'dying') {
    e.deathTimer += dt;
    return null;
  }

  if (e.stun > 0) {
    e.stun -= dt;
  } else {
    switch (e.mode) {
      case 'idle':
      case 'wander': {
        e.timer -= dt;
        if (playerAlive && dist < def.detectRange) {
          e.mode = 'chase';
          break;
        }
        if (e.timer <= 0) {
          e.timer = 2.5 + Math.random() * 3;
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * 6;
          e.wanderTarget.set(e.home.x + Math.cos(a) * r, e.home.y + Math.sin(a) * r);
          e.mode = e.mode === 'idle' ? 'wander' : 'idle';
        }
        if (e.mode === 'wander') {
          const wx = e.wanderTarget.x - e.pos.x;
          const wz = e.wanderTarget.y - e.pos.z;
          if (Math.hypot(wx, wz) > 0.6) {
            moveDir = Math.atan2(-wx, -wz);
            moveSpeed = def.speed * 0.35;
          }
        }
        break;
      }
      case 'chase': {
        if (!playerAlive || homeDist > leash) {
          e.mode = 'return';
          break;
        }
        if (dist > def.detectRange * 1.6) {
          e.mode = 'return';
          break;
        }
        moveDir = Math.atan2(-dx, -dz);
        if (dist > def.attackRange * 0.85) moveSpeed = def.speed;
        if (dist <= def.attackRange && e.attackCd <= 0) {
          e.mode = 'windup';
          e.timer = def.boss ? BOSS_WINDUP_TIME : WINDUP_TIME;
          e.facing = moveDir;
          if (def.boss) e.slam = e.pos.clone();
        }
        break;
      }
      case 'windup': {
        e.timer -= dt;
        if (!def.boss) e.facing += angleDiff(e.facing, Math.atan2(-dx, -dz)) * Math.min(1, dt * 3);
        if (e.timer <= 0) {
          e.attackCd = def.attackCooldown;
          e.mode = 'recover';
          e.timer = RECOVER_TIME;
          if (def.boss) {
            // Ground slam: area damage around the boss
            if (e.slam && Math.hypot(p.x - e.slam.x, p.z - e.slam.z) <= BOSS_SLAM_RADIUS) hit = { enemy: e, damage: def.attack, boss: true };
          } else {
            // Lunge toward the player; connects if still in reach
            e.vel.x += -Math.sin(e.facing) * 7;
            e.vel.z += -Math.cos(e.facing) * 7;
            e.vel.y = 3;
            if (dist <= def.attackRange + 0.7) hit = { enemy: e, damage: def.attack, boss: false };
          }
        }
        break;
      }
      case 'recover': {
        e.timer -= dt;
        if (e.timer <= 0) e.mode = 'chase';
        break;
      }
      case 'return': {
        const hx = e.home.x - e.pos.x;
        const hz = e.home.y - e.pos.z;
        if (Math.hypot(hx, hz) < 1.2) {
          e.mode = 'idle';
          e.hp = e.maxHp; // leashing fully restores the enemy
          break;
        }
        moveDir = Math.atan2(-hx, -hz);
        moveSpeed = def.speed * 1.2;
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.1 * dt);
        if (playerAlive && dist < def.detectRange * 0.6 && homeDist < leash * 0.7) e.mode = 'chase';
        break;
      }
    }
  }

  // Hopping locomotion
  if (moveSpeed > 0) {
    e.hop += dt * (def.boss ? 4 : 7);
    e.facing += angleDiff(e.facing, moveDir) * Math.min(1, dt * 6);
    const hopFactor = Math.max(0, Math.sin(e.hop)) * 1.6 + 0.15;
    e.pos.x += -Math.sin(e.facing) * moveSpeed * hopFactor * dt;
    e.pos.z += -Math.cos(e.facing) * moveSpeed * hopFactor * dt;
  } else {
    e.hop += dt * 2.5;
  }
  // Knockback / lunge velocity
  e.pos.x += e.vel.x * dt;
  e.pos.z += e.vel.z * dt;
  e.vel.x *= Math.exp(-dt * 6);
  e.vel.z *= Math.exp(-dt * 6);
  const ground = terrainHeight(e.pos.x, e.pos.z);
  e.vel.y -= 20 * dt;
  e.pos.y += e.vel.y * dt;
  if (e.pos.y < ground) {
    e.pos.y = ground;
    e.vel.y = 0;
  }
  resolveCircle(e.pos, 0.6 * def.scale);
  return hit;
}

/** Simple separation so slimes don't stack on each other */
export function separateEnemies(list: EnemyRuntime[]) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const ra = 0.7 * ENEMIES[a.type].scale;
      const rb = 0.7 * ENEMIES[b.type].scale;
      const dx = b.pos.x - a.pos.x;
      const dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0 && d < ra + rb) {
        const push = (ra + rb - d) / 2;
        a.pos.x -= (dx / d) * push;
        a.pos.z -= (dz / d) * push;
        b.pos.x += (dx / d) * push;
        b.pos.z += (dz / d) * push;
      }
    }
  }
}
