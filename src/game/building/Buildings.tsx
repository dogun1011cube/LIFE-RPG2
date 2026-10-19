import { memo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../../state/gameStore';
import { useUi } from '../../state/uiStore';
import { BUILDINGS } from '../../data/buildings';
import { RESOURCES } from '../../data/resources';
import { BuildingModel, GhostContext, TurretModel } from './BuildingModels';
import { MAT } from '../render/materials';
import { runtime } from '../runtime';
import { input } from '../input/input';
import { checkPlacement } from './placement';
import { terrainHeight } from '../world/terrain';
import type { BuildingInstance } from '../types';

const BuildingView = memo(
  function BuildingView({ b }: { b: BuildingInstance }) {
    const head = useRef<THREE.Group>(null);
    useFrame(() => {
      if (!head.current) return;
      const t = runtime.turrets.get(b.id);
      if (t) head.current.rotation.y += (t.yaw - b.rotation - head.current.rotation.y) * 0.2;
    });
    return (
      <group position={b.position} rotation-y={b.rotation} userData={{ buildingId: b.id }}>
        {b.type === 'defense_turret' ? (
          <TurretModel state={b.state} headRef={head} />
        ) : (
          <BuildingModel type={b.type} state={b.state} accent={b.veinResource ? RESOURCES[b.veinResource].color : undefined} />
        )}
      </group>
    );
  },
  (a, b) => a.b.state === b.b.state && a.b.id === b.b.id && a.b.rotation === b.b.rotation && a.b.position === b.b.position,
);

export function Buildings() {
  const buildings = useGame((s) => s.game.buildings);
  return (
    <group>
      {buildings.map((b) => (
        <BuildingView key={b.id} b={b} />
      ))}
    </group>
  );
}

const SNAP = 0.5;
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

/** March the camera ray against the analytic terrain heightfield. */
function raycastTerrain(origin: THREE.Vector3, dir: THREE.Vector3, maxDist = 70): THREE.Vector3 | null {
  let prev = 0;
  const p = new THREE.Vector3();
  for (let t = 0.5; t <= maxDist; t += 0.5) {
    p.copy(origin).addScaledVector(dir, t);
    if (p.y <= terrainHeight(p.x, p.z)) {
      // refine with bisection
      let lo = prev;
      let hi = t;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        p.copy(origin).addScaledVector(dir, mid);
        if (p.y <= terrainHeight(p.x, p.z)) hi = mid;
        else lo = mid;
      }
      return p.copy(origin).addScaledVector(dir, hi);
    }
    prev = t;
  }
  return null;
}

/** Translucent placement preview; green when valid, red when not. */
export function BuildPreview() {
  const selection = useUi((s) => s.buildSelection);
  const buildMode = useUi((s) => s.buildMode);
  const rotation = useUi((s) => s.buildRotation);
  const group = useRef<THREE.Group>(null);
  const valid = useUi((s) => s.placement?.valid ?? false);
  const last = useRef({ x: NaN, z: NaN, rot: NaN, inv: null as unknown, bld: null as unknown });

  useEffect(() => {
    runtime.buildPoint = null;
    last.current.x = NaN;
  }, [selection, buildMode]);

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g || !selection || !buildMode) return;
    if (document.pointerLockElement) ndc.set(0, 0);
    else ndc.set(input.ndcX, input.ndcY);
    ray.setFromCamera(ndc, camera);
    const hit = raycastTerrain(ray.ray.origin, ray.ray.direction);
    if (!hit) {
      g.visible = false;
      runtime.buildPoint = null;
      useUi.getState().setPlacement({ valid: false, reason: '설치할 지면을 조준하세요.' });
      return;
    }
    // Keep the preview clear of the player's own footprint: push it out along the view direction
    const def = BUILDINGS[selection];
    const pp = runtime.player.pos;
    const minDist = (def?.radius ?? 2) + 1.2;
    const fx = -Math.sin(runtime.camera.yaw);
    const fz = -Math.cos(runtime.camera.yaw);
    const along = (hit.x - pp.x) * fx + (hit.z - pp.z) * fz;
    if (Math.hypot(hit.x - pp.x, hit.z - pp.z) < minDist || along < minDist) {
      hit.x = pp.x + fx * minDist;
      hit.z = pp.z + fz * minDist;
    }
    const x = Math.round(hit.x / SNAP) * SNAP;
    const z = Math.round(hit.z / SNAP) * SNAP;
    g.visible = true;
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rotation;
    runtime.buildPoint = g.position;
    const game = useGame.getState().game;
    const L = last.current;
    // Re-validate only when something relevant changed
    if (L.x !== x || L.z !== z || L.inv !== game.inventory || L.bld !== game.buildings) {
      L.x = x;
      L.z = z;
      L.inv = game.inventory;
      L.bld = game.buildings;
      const check = checkPlacement(game, selection, x, z, { x: runtime.player.pos.x, z: runtime.player.pos.z });
      useUi.getState().setPlacement({ valid: check.ok, reason: check.reason });
    }
  });

  if (!selection || !buildMode || !BUILDINGS[selection]) return null;
  const def = BUILDINGS[selection];
  return (
    <group ref={group} visible={false}>
      <GhostContext.Provider value={valid ? MAT.ghostValid : MAT.ghostInvalid}>
        <BuildingModel type={selection} state="operational" />
      </GhostContext.Provider>
      <mesh rotation-x={-Math.PI / 2} position-y={0.08} material={valid ? MAT.ghostValid : MAT.ghostInvalid}>
        <ringGeometry args={[def.radius - 0.12, def.radius, 40]} />
      </mesh>
      {/* facing arrow */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.1, -def.radius - 0.5]} material={valid ? MAT.ghostValid : MAT.ghostInvalid}>
        <circleGeometry args={[0.35, 3]} />
      </mesh>
    </group>
  );
}
