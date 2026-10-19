import * as THREE from 'three';

// Mutable per-frame runtime state. This is deliberately NOT stored in React/Zustand:
// it changes every frame and would cause needless re-renders. Persistent values are
// copied into the game store at save time or when they matter to other systems.

export interface EnemyRuntime {
  id: string;
  type: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  home: THREE.Vector2;
  hp: number;
  maxHp: number;
  facing: number;
  mode: 'idle' | 'wander' | 'chase' | 'windup' | 'recover' | 'return' | 'dying';
  timer: number;
  attackCd: number;
  hitFlash: number;
  stun: number;
  hop: number;
  wanderTarget: THREE.Vector2;
  deathTimer: number;
  /** boss slam target position */
  slam?: THREE.Vector3;
}

export interface Collider {
  x: number;
  z: number;
  r: number;
  /** height of the collider top, used by the camera */
  h: number;
}

export const runtime = {
  player: {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    facing: 0,
    onGround: true,
    attackCd: 0,
    attackAnim: 0,
    attackSide: 1,
    invuln: 0,
    lastHurt: -999,
    speed: 0,
    sprinting: false,
    hurtFlash: 0,
  },
  camera: { yaw: 0, pitch: 0.32, distance: 7.5, currentDistance: 7.5 },
  enemies: new Map<string, EnemyRuntime>(),
  /** Static colliders (trees, rocks, outpost) — rebuilt once at world generation */
  staticColliders: [] as Collider[],
  time: 0,
  /** the screen-space aim point in world coordinates for build mode */
  buildPoint: null as THREE.Vector3 | null,
  interactTarget: null as null | { id: string; kind: string },
  /** Turret cooldown & aim (yaw) per building id */
  turrets: new Map<string, { cd: number; yaw: number }>(),
};

export function resetRuntime(pos: [number, number, number], yaw: number) {
  runtime.player.pos.set(pos[0], pos[1], pos[2]);
  runtime.player.vel.set(0, 0, 0);
  runtime.player.facing = yaw;
  runtime.player.attackCd = 0;
  runtime.player.attackAnim = 0;
  runtime.player.invuln = 0;
  runtime.player.lastHurt = -999;
  runtime.camera.yaw = yaw;
  runtime.camera.pitch = 0.32;
  runtime.enemies.clear();
  runtime.turrets.clear();
  runtime.interactTarget = null;
}
