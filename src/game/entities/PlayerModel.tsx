import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '../runtime';
import { MAT } from '../render/materials';
import { useGame } from '../../state/gameStore';
import { ITEMS } from '../../data/items';

const suit = new THREE.MeshStandardMaterial({ color: '#dfe5ec', roughness: 0.45, metalness: 0.3 });
const suitDark = new THREE.MeshStandardMaterial({ color: '#46505e', roughness: 0.6, metalness: 0.4 });
const visor = new THREE.MeshStandardMaterial({ color: '#06121a', emissive: '#39d9ff', emissiveIntensity: 1.6, roughness: 0.1, metalness: 0.9 });
const accent = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#4fe9ff', emissiveIntensity: 2 });
const hurtMat = new THREE.MeshBasicMaterial({ color: '#ff5050' });

function Limb({ length, width, mat }: { length: number; width: number; mat: THREE.Material }) {
  return (
    <mesh material={mat} position-y={-length / 2} castShadow>
      <capsuleGeometry args={[width, length - width * 2, 3, 8]} />
    </mesh>
  );
}

export function PlayerModel() {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const blade = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.Mesh>(null);
  const phase = useRef(0);
  const weaponId = useGame((s) => s.game.player.equipment.weapon);
  const armorId = useGame((s) => s.game.player.equipment.armor);
  const wasHurt = useRef(false);

  const bladeMat = useMemo(() => {
    const color = weaponId ? ITEMS[weaponId]?.color ?? '#aab4c0' : '#aab4c0';
    const plasma = weaponId === 'plasma_blade';
    return new THREE.MeshStandardMaterial({
      color: plasma ? '#000000' : color,
      emissive: color,
      emissiveIntensity: plasma ? 2.6 : 0.25,
      metalness: 0.9,
      roughness: 0.25,
    });
  }, [weaponId]);
  const trailMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#9ff4ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), []);
  useEffect(() => () => bladeMat.dispose(), [bladeMat]);
  useEffect(() => () => trailMat.dispose(), [trailMat]);

  useFrame((_, dt) => {
    const p = runtime.player;
    const g = root.current;
    if (!g) return;
    g.position.copy(p.pos);
    g.rotation.y = p.facing;
    // Walk cycle
    const speed = Math.min(p.speed, 9);
    phase.current += dt * (4 + speed * 1.1) * (speed > 0.3 ? 1 : 0);
    const swing = speed > 0.3 ? Math.sin(phase.current) * Math.min(1, speed / 5) * 0.8 : 0;
    const airborne = !p.onGround;
    if (legL.current) legL.current.rotation.x = airborne ? -0.5 : swing;
    if (legR.current) legR.current.rotation.x = airborne ? 0.3 : -swing;
    if (armL.current) armL.current.rotation.x = airborne ? -1 : -swing * 0.8;
    if (body.current) {
      body.current.position.y = speed > 0.3 && !airborne ? Math.abs(Math.cos(phase.current)) * 0.06 : 0;
      body.current.rotation.x = p.sprinting ? 0.18 : 0.04;
    }
    // Attack: arm sweeps across the body
    if (armR.current) {
      if (p.attackAnim > 0) {
        const t = 1 - p.attackAnim / 0.32; // 0..1
        const sweep = Math.sin(t * Math.PI);
        armR.current.rotation.set(-1.4 - sweep * 0.4, 0, (t - 0.5) * 2.6 * p.attackSide);
      } else {
        armR.current.rotation.set(swing * 0.8 - 0.25, 0, 0.08);
      }
    }
    if (trail.current) {
      trailMat.opacity = p.attackAnim > 0 ? (p.attackAnim / 0.32) * 0.55 : 0;
      trail.current.rotation.y = p.attackSide > 0 ? 0 : Math.PI;
    }
    const hurt = p.hurtFlash > 0;
    if (hurt === wasHurt.current) return;
    wasHurt.current = hurt;
    body.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m === trail.current) return;
      if (hurt) {
        if (!m.userData.baseMat) m.userData.baseMat = m.material;
        m.material = hurtMat;
      } else if (m.userData.baseMat) {
        m.material = m.userData.baseMat;
        m.userData.baseMat = undefined;
      }
    });
  });

  const armored = !!armorId;
  return (
    <group ref={root}>
      <group ref={body}>
        {/* Torso */}
        <mesh material={suit} position-y={1.22} castShadow>
          <boxGeometry args={[0.56, 0.62, 0.32]} />
        </mesh>
        <mesh material={armored ? MAT.metalLight : suitDark} position={[0, 1.28, -0.17]} castShadow>
          <boxGeometry args={[0.46, 0.4, 0.06]} />
        </mesh>
        <mesh material={accent} position={[0, 1.34, -0.205]}>
          <boxGeometry args={[0.18, 0.05, 0.02]} />
        </mesh>
        <mesh material={suitDark} position-y={0.86} castShadow>
          <boxGeometry args={[0.5, 0.2, 0.3]} />
        </mesh>
        {/* Backpack (power cell) */}
        <mesh material={suitDark} position={[0, 1.25, 0.24]} castShadow>
          <boxGeometry args={[0.42, 0.5, 0.18]} />
        </mesh>
        <mesh material={accent} position={[0, 1.25, 0.335]}>
          <boxGeometry args={[0.08, 0.36, 0.02]} />
        </mesh>
        {/* Shoulder pads */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={armored ? MAT.metalLight : suit} position={[0.36 * s, 1.5, 0]} castShadow>
            <sphereGeometry args={[0.15, 10, 8]} />
          </mesh>
        ))}
        {/* Head */}
        <mesh material={suit} position-y={1.74} castShadow>
          <sphereGeometry args={[0.22, 16, 12]} />
        </mesh>
        <mesh material={visor} position={[0, 1.75, -0.13]} scale={[1, 0.6, 0.6]}>
          <sphereGeometry args={[0.17, 16, 10]} />
        </mesh>
        <mesh material={MAT.metalDark} position={[0.2, 1.84, 0.05]}>
          <cylinderGeometry args={[0.015, 0.015, 0.3, 4]} />
        </mesh>
        {/* Arms */}
        <group ref={armL} position={[-0.38, 1.5, 0]}>
          <Limb length={0.62} width={0.08} mat={suit} />
        </group>
        <group ref={armR} position={[0.38, 1.5, 0]}>
          <Limb length={0.62} width={0.08} mat={suit} />
          {/* Weapon */}
          <group position={[0, -0.6, -0.05]} rotation-x={-Math.PI / 2}>
            <mesh material={MAT.metalDark} position-y={0.05}>
              <cylinderGeometry args={[0.035, 0.035, 0.22, 6]} />
            </mesh>
            <mesh material={MAT.gold} position-y={0.17}>
              <boxGeometry args={[0.22, 0.04, 0.06]} />
            </mesh>
            <mesh ref={blade} material={bladeMat} position-y={0.62} castShadow>
              <boxGeometry args={[0.07, 0.86, 0.02]} />
            </mesh>
          </group>
        </group>
        {/* Legs */}
        <group ref={legL} position={[-0.15, 0.82, 0]}>
          <Limb length={0.8} width={0.1} mat={suitDark} />
        </group>
        <group ref={legR} position={[0.15, 0.82, 0]}>
          <Limb length={0.8} width={0.1} mat={suitDark} />
        </group>
      </group>
      {/* Swing trail */}
      <mesh ref={trail} material={trailMat} position-y={1.1} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.0, 2.4, 24, 1, Math.PI * 0.12, Math.PI * 0.76]} />
      </mesh>
    </group>
  );
}

/** ORION companion drone: hovers beside the player. */
export function OrionDrone() {
  const root = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  const eye = useRef<THREE.Mesh>(null);
  const pos = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const p = runtime.player;
    const g = root.current;
    if (!g) return;
    const t = performance.now() * 0.001;
    // Hover to the left of and slightly ahead of the player, away from the camera shoulder
    const yaw = runtime.camera.yaw;
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(-1.3);
    const ahead = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(1.2);
    const target = p.pos.clone().add(side).add(ahead);
    target.y += 2.4 + Math.sin(t * 2) * 0.12;
    if (pos.current.lengthSq() === 0 || pos.current.distanceTo(target) > 20) pos.current.copy(target);
    pos.current.lerp(target, 1 - Math.exp(-dt * 4));
    g.position.copy(pos.current);
    g.rotation.y = p.facing + Math.sin(t * 0.7) * 0.4;
    if (rotor.current) rotor.current.rotation.y += dt * 18;
    if (eye.current) eye.current.scale.setScalar(0.9 + Math.sin(t * 3) * 0.1);
  });
  return (
    <group ref={root} scale={0.65}>
      <mesh material={MAT.panel} castShadow>
        <sphereGeometry args={[0.22, 16, 12]} />
      </mesh>
      <mesh material={MAT.metalDark} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.25, 0.04, 6, 20]} />
      </mesh>
      <mesh ref={eye} material={MAT.glowCyan} position-z={-0.19}>
        <sphereGeometry args={[0.08, 10, 8]} />
      </mesh>
      {/* sensor arms */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.28 * s, -0.05, 0]}>
          <mesh material={MAT.metal} rotation-z={s * 0.6}>
            <boxGeometry args={[0.2, 0.04, 0.04]} />
          </mesh>
          <mesh material={MAT.glowGold} position={[0.1 * s, -0.08, 0]}>
            <sphereGeometry args={[0.03, 6, 4]} />
          </mesh>
        </group>
      ))}
      <group ref={rotor} position-y={0.28}>
        <mesh material={MAT.metalDark}>
          <boxGeometry args={[0.7, 0.015, 0.06]} />
        </mesh>
        <mesh material={MAT.metalDark} rotation-y={Math.PI / 2}>
          <boxGeometry args={[0.7, 0.015, 0.06]} />
        </mesh>
      </group>
      <mesh material={MAT.glowCyanSoft} position-y={-0.26}>
        <coneGeometry args={[0.06, 0.12, 6]} />
      </mesh>
    </group>
  );
}
