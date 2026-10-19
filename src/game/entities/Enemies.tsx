import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ENEMIES } from '../../data/enemies';
import { ENEMY_SPAWNS } from '../../data/world';
import { useGame } from '../../state/gameStore';
import { runtime } from '../runtime';
import { BOSS_SLAM_RADIUS, BOSS_WINDUP_TIME, WINDUP_TIME } from '../combat/enemyAI';
import { MAT } from '../render/materials';

const eyeWhite = new THREE.MeshStandardMaterial({ color: '#f4fbff', roughness: 0.2 });
const pupil = new THREE.MeshStandardMaterial({ color: '#0a0d12', roughness: 0.2 });
const hpBack = new THREE.MeshBasicMaterial({ color: '#10141a', transparent: true, opacity: 0.75, depthTest: false });
const hpFill = new THREE.MeshBasicMaterial({ color: '#ff5a5a', depthTest: false });
const hpFillBoss = new THREE.MeshBasicMaterial({ color: '#ff4fd1', depthTest: false });

const EnemyView = memo(function EnemyView({ spawnId, type }: { spawnId: string; type: string }) {
  const def = ENEMIES[type];
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const hpBar = useRef<THREE.Group>(null);
  const hpFillRef = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: def.color,
        roughness: 0.25,
        metalness: 0,
        transmission: 0,
        transparent: true,
        opacity: 0.88,
        clearcoat: 1,
        clearcoatRoughness: 0.2,
        emissive: '#ffffff',
        emissiveIntensity: 0,
      }),
    [def.color],
  );
  const coreMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#000000', emissive: def.coreColor, emissiveIntensity: 2.2 }),
    [def.coreColor],
  );
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff3b6b', transparent: true, opacity: 0, depthWrite: false }), []);
  useEffect(() => () => {
    bodyMat.dispose();
    coreMat.dispose();
    ringMat.dispose();
  }, [bodyMat, coreMat, ringMat]);

  useFrame(({ camera }) => {
    const e = runtime.enemies.get(spawnId);
    const g = root.current;
    if (!g) return;
    // Hide enemies far from the camera (render LOD)
    if (!e || e.pos.distanceToSquared(camera.position) > 130 * 130) {
      g.visible = false;
      if (hpBar.current) hpBar.current.visible = false;
      return;
    }
    g.visible = true;
    g.position.copy(e.pos);
    g.rotation.y = e.facing;
    const b = body.current!;
    // Squash & stretch
    let sy = 1;
    let sxz = 1;
    let lift = 0;
    if (e.mode === 'dying') {
      const k = Math.min(1, e.deathTimer / 0.55);
      sy = 1 - k * 0.9;
      sxz = 1 + k * 0.6;
    } else if (e.mode === 'windup') {
      const total = def.boss ? BOSS_WINDUP_TIME : WINDUP_TIME;
      const k = 1 - e.timer / total;
      sy = 1 - k * 0.35;
      sxz = 1 + k * 0.25;
    } else {
      const h = Math.sin(e.hop);
      lift = Math.max(0, h) * 0.45 * def.scale;
      sy = 1 + h * 0.12;
      sxz = 1 - h * 0.06;
    }
    b.scale.set(sxz * def.scale, sy * def.scale, sxz * def.scale);
    b.position.y = lift;
    // Hit flash
    bodyMat.emissiveIntensity = e.hitFlash > 0 ? (e.hitFlash / 0.18) * 1.4 : def.boss && e.mode === 'windup' ? 0.35 : 0;
    // HP bar
    const hb = hpBar.current!;
    const showBar = e.hp < e.maxHp || !!def.boss;
    hb.visible = showBar && e.mode !== 'dying';
    if (hb.visible) {
      hb.position.set(e.pos.x, e.pos.y + def.scale * 1.55 + 0.5, e.pos.z);
      hb.quaternion.copy(camera.quaternion);
      const k = Math.max(0, e.hp / e.maxHp);
      hpFillRef.current!.scale.x = Math.max(0.001, k);
      hpFillRef.current!.position.x = -(1 - k) * (def.boss ? 1.5 : 0.5);
    }
    // Boss slam telegraph
    if (ring.current) {
      const active = !!def.boss && e.mode === 'windup' && !!e.slam;
      ring.current.visible = active;
      if (active && e.slam) {
        ring.current.position.set(e.slam.x, e.pos.y + 0.12, e.slam.z);
        const k = 1 - e.timer / BOSS_WINDUP_TIME;
        ring.current.scale.setScalar(BOSS_SLAM_RADIUS * (0.3 + 0.7 * k));
        ringMat.opacity = 0.25 + k * 0.4;
      }
    }
  });

  const s = 0.6;
  return (
    <>
      <group ref={root}>
        <group ref={body}>
          <mesh material={bodyMat} position-y={s * 0.75} castShadow>
            <sphereGeometry args={[s, 24, 18]} />
          </mesh>
          <mesh material={bodyMat} position-y={s * 0.3} scale={[1.15, 0.5, 1.15]}>
            <sphereGeometry args={[s, 20, 10]} />
          </mesh>
          <mesh material={coreMat} position-y={s * 0.72}>
            <icosahedronGeometry args={[s * 0.32, 0]} />
          </mesh>
          {/* Eyes (front = -z) */}
          {[-1, 1].map((k) => (
            <group key={k} position={[k * s * 0.33, s * 0.98, -s * 0.78]}>
              <mesh material={eyeWhite} scale={[1, 1.25, 0.6]}>
                <sphereGeometry args={[s * 0.17, 12, 10]} />
              </mesh>
              <mesh material={pupil} position-z={-s * 0.08} scale={[1, 1.3, 0.5]}>
                <sphereGeometry args={[s * 0.09, 10, 8]} />
              </mesh>
            </group>
          ))}
          {(type === 'crystal_slime' || type === 'void_slime' || type === 'guardian') &&
            [0, 1, 2, 3, 4].map((k) => {
              const a = (k / 5) * Math.PI * 2;
              return (
                <mesh
                  key={k}
                  material={type === 'crystal_slime' ? MAT.crystalBlue : MAT.crystalPurple}
                  position={[Math.cos(a) * s * 0.45, s * 1.25, Math.sin(a) * s * 0.45 + s * 0.1]}
                  rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}
                >
                  <octahedronGeometry args={[s * 0.16, 0]} />
                </mesh>
              );
            })}
          {type === 'guardian' && (
            <group position-y={s * 1.45}>
              <mesh material={MAT.glowMagenta} rotation-x={Math.PI / 2}>
                <torusGeometry args={[s * 0.45, s * 0.04, 6, 24]} />
              </mesh>
              {[0, 1, 2, 3, 4, 5].map((k) => {
                const a = (k / 6) * Math.PI * 2;
                return (
                  <mesh key={k} material={MAT.gold} position={[Math.cos(a) * s * 0.45, s * 0.12, Math.sin(a) * s * 0.45]}>
                    <coneGeometry args={[s * 0.06, s * 0.3, 4]} />
                  </mesh>
                );
              })}
            </group>
          )}
        </group>
      </group>
      <group ref={hpBar} renderOrder={10}>
        <mesh material={hpBack} renderOrder={10}>
          <planeGeometry args={[def.boss ? 3.1 : 1.1, def.boss ? 0.22 : 0.13]} />
        </mesh>
        <mesh ref={hpFillRef} material={def.boss ? hpFillBoss : hpFill} position-z={0.001} renderOrder={11}>
          <planeGeometry args={[def.boss ? 3 : 1, def.boss ? 0.15 : 0.08]} />
        </mesh>
      </group>
      {def.boss && (
        <mesh ref={ring} material={ringMat} rotation-x={-Math.PI / 2} visible={false}>
          <ringGeometry args={[0.92, 1, 48]} />
        </mesh>
      )}
    </>
  );
});

export function Enemies() {
  const enemies = useGame((s) => s.game.enemies);
  return (
    <group>
      {ENEMY_SPAWNS.filter((sp) => enemies[sp.id]?.alive).map((sp) => (
        <EnemyView key={sp.id} spawnId={sp.id} type={sp.type} />
      ))}
    </group>
  );
}
