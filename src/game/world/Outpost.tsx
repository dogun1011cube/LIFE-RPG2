import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NPC_POS, SIGNS, TERMINAL_POS, type SignDef } from '../../data/world';
import { MAT } from '../render/materials';
import { terrainHeight } from './terrain';

function HQ() {
  const ring = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * 0.4;
    if (beacon.current) beacon.current.scale.setScalar(0.8 + Math.abs(Math.sin(performance.now() * 0.002)) * 0.5);
  });
  const y = terrainHeight(0, -12);
  return (
    <group position={[0, y, -12]}>
      {/* Foundation */}
      <mesh material={MAT.concrete} position-y={0.4} receiveShadow castShadow>
        <cylinderGeometry args={[6.6, 7, 0.8, 6]} />
      </mesh>
      {/* Base block */}
      <mesh material={MAT.metalDark} position-y={2.6} castShadow receiveShadow>
        <cylinderGeometry args={[5.2, 6, 3.6, 6]} />
      </mesh>
      <mesh material={MAT.glowCyan} position-y={4.45}>
        <cylinderGeometry args={[5.25, 5.25, 0.18, 6]} />
      </mesh>
      {/* Mid tower */}
      <mesh material={MAT.panel} position-y={8} castShadow>
        <cylinderGeometry args={[3.2, 4.4, 7, 6]} />
      </mesh>
      {/* Glass observation ring */}
      <mesh material={MAT.glass} position-y={12.4}>
        <cylinderGeometry args={[3.8, 3.4, 1.8, 12]} />
      </mesh>
      <mesh material={MAT.metal} position-y={13.5} castShadow>
        <cylinderGeometry args={[4.1, 4.1, 0.4, 12]} />
      </mesh>
      {/* Upper spire */}
      <mesh material={MAT.metalDark} position-y={18} castShadow>
        <cylinderGeometry args={[1.2, 2.6, 9, 6]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={MAT.glowCyan} position-y={15 + i * 2.6}>
          <cylinderGeometry args={[2.3 - i * 0.42, 2.3 - i * 0.42, 0.15, 6]} />
        </mesh>
      ))}
      <mesh material={MAT.metalLight} position-y={25}>
        <cylinderGeometry args={[0.08, 0.15, 5, 6]} />
      </mesh>
      <mesh ref={beacon} material={MAT.glowRed} position-y={27.6}>
        <sphereGeometry args={[0.3, 10, 8]} />
      </mesh>
      <mesh ref={ring} material={MAT.glowCyanSoft} position-y={20}>
        <torusGeometry args={[3.4, 0.08, 6, 40]} />
      </mesh>
      {/* Buttresses */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} material={MAT.metal} position={[Math.cos(a) * 5.4, 4.6, Math.sin(a) * 5.4]} rotation={[0, -a, 0.28]} castShadow>
            <boxGeometry args={[0.6, 6, 1]} />
          </mesh>
        );
      })}
      {/* Entrance (facing south / +z) */}
      <group position={[0, 0.8, 5.4]}>
        <mesh material={MAT.metalDark} position-y={1.4} castShadow>
          <boxGeometry args={[3.4, 2.8, 1.6]} />
        </mesh>
        <mesh material={MAT.glowCyan} position={[0, 1.2, 0.81]}>
          <planeGeometry args={[2, 2.2]} />
        </mesh>
        <mesh material={MAT.hazard} position={[0, 2.9, 0.82]}>
          <boxGeometry args={[3.4, 0.2, 0.05]} />
        </mesh>
      </group>
    </group>
  );
}

function CommsDish() {
  const dish = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (dish.current) dish.current.rotation.y += dt * 0.12;
  });
  const y = terrainHeight(12, -12);
  return (
    <group position={[12, y, -12]}>
      <mesh material={MAT.concrete} position-y={0.3} receiveShadow>
        <cylinderGeometry args={[3, 3.3, 0.6, 8]} />
      </mesh>
      <mesh material={MAT.metal} position-y={2.6} castShadow>
        <cylinderGeometry args={[0.4, 0.6, 4.4, 8]} />
      </mesh>
      <group ref={dish} position-y={5}>
        <group rotation-x={-0.7}>
          <mesh material={MAT.panel} castShadow>
            <sphereGeometry args={[2.6, 20, 10, 0, Math.PI * 2, 0, 0.9]} />
          </mesh>
          <mesh material={MAT.metalDark} position-y={1.4}>
            <cylinderGeometry args={[0.05, 0.05, 2.8, 4]} />
          </mesh>
          <mesh material={MAT.glowCyan} position-y={2.8}>
            <sphereGeometry args={[0.2, 8, 6]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function DropPod() {
  const y = terrainHeight(4, 46);
  return (
    <group position={[4, y, 46]} rotation={[0.18, 0.6, 0.1]}>
      <mesh material={MAT.stoneDark} position-y={0.02} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[4.5, 24]} />
      </mesh>
      <mesh material={MAT.panel} position-y={1.6} castShadow>
        <cylinderGeometry args={[1.5, 1.9, 3.2, 10]} />
      </mesh>
      <mesh material={MAT.metalDark} position-y={3.8} castShadow>
        <coneGeometry args={[1.5, 1.4, 10]} />
      </mesh>
      <mesh material={MAT.hazard} position-y={2.6}>
        <cylinderGeometry args={[1.62, 1.62, 0.25, 10]} />
      </mesh>
      {/* Open hatch facing north */}
      <mesh material={MAT.glowGold} position={[0, 1.4, -1.55]}>
        <planeGeometry args={[1.2, 1.8]} />
      </mesh>
      <mesh material={MAT.metal} position={[0, 0.5, -2.4]} rotation-x={-1.2} castShadow>
        <boxGeometry args={[1.3, 1.9, 0.12]} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} material={MAT.metal} position={[Math.cos(a) * 1.9, 0.4, Math.sin(a) * 1.9]} rotation-z={0.4} castShadow>
            <boxGeometry args={[0.2, 1.4, 0.2]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Terminal() {
  const holo = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (holo.current) holo.current.rotation.y += dt * 0.8;
  });
  const [x, z] = TERMINAL_POS;
  const y = terrainHeight(x, z);
  return (
    <group position={[x, y, z]} rotation-y={-0.4}>
      <mesh material={MAT.metalDark} position-y={0.55} castShadow>
        <boxGeometry args={[1.2, 1.1, 0.8]} />
      </mesh>
      <mesh material={MAT.panelDark} position={[0, 1.25, 0.1]} rotation-x={-0.6}>
        <boxGeometry args={[1.3, 0.08, 0.9]} />
      </mesh>
      <mesh material={MAT.glowCyan} position={[0, 1.3, 0.12]} rotation-x={-0.6 - Math.PI / 2}>
        <planeGeometry args={[1.1, 0.75]} />
      </mesh>
      <mesh ref={holo} material={MAT.hologram} position-y={2.2}>
        <icosahedronGeometry args={[0.35, 1]} />
      </mesh>
    </group>
  );
}

function HologramNpc() {
  const body = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = performance.now() * 0.001;
    if (body.current) {
      body.current.position.y = 0.35 + Math.sin(t * 1.6) * 0.05;
      body.current.visible = Math.sin(t * 23) > -0.97; // occasional flicker
    }
  });
  const [x, z] = NPC_POS;
  const y = terrainHeight(x, z);
  return (
    <group position={[x, y, z]} rotation-y={0.5}>
      <mesh material={MAT.metalDark} position-y={0.12}>
        <cylinderGeometry args={[0.6, 0.7, 0.24, 16]} />
      </mesh>
      <mesh material={MAT.glowCyan} position-y={0.25}>
        <cylinderGeometry args={[0.45, 0.45, 0.04, 16]} />
      </mesh>
      <mesh material={MAT.hologram} position-y={1.2}>
        <cylinderGeometry args={[0.65, 0.45, 2, 16, 1, true]} />
      </mesh>
      <group ref={body}>
        <mesh material={MAT.hologramSolid} position-y={0.95}>
          <capsuleGeometry args={[0.25, 0.7, 4, 10]} />
        </mesh>
        <mesh material={MAT.hologramSolid} position-y={1.62}>
          <sphereGeometry args={[0.19, 12, 10]} />
        </mesh>
        <mesh material={MAT.hologramSolid} position={[0.3, 1.0, 0.1]} rotation-z={0.3}>
          <capsuleGeometry args={[0.07, 0.5, 2, 6]} />
        </mesh>
        <mesh material={MAT.hologramSolid} position={[-0.3, 1.0, 0.1]} rotation-z={-0.3}>
          <capsuleGeometry args={[0.07, 0.5, 2, 6]} />
        </mesh>
      </group>
    </group>
  );
}

function Sign({ sign }: { sign: SignDef }) {
  const [x, z] = sign.position;
  const y = terrainHeight(x, z);
  return (
    <group position={[x, y, z]} rotation-y={sign.yaw}>
      <mesh material={MAT.metal} position-y={1} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 2, 6]} />
      </mesh>
      <mesh material={MAT.signBoard} position-y={2} castShadow>
        <boxGeometry args={[1.6, 0.8, 0.08]} />
      </mesh>
      <mesh material={sign.id === 'sign_north' ? MAT.glowRed : MAT.glowGold} position={[0, 2, 0.045]}>
        <planeGeometry args={[1.4, 0.1]} />
      </mesh>
      <mesh material={MAT.glowCyanSoft} position={[0, 1.8, 0.045]}>
        <planeGeometry args={[1.2, 0.05]} />
      </mesh>
      <mesh material={MAT.glowCyan} position={[0.6, 2.25, 0.05]} rotation-z={Math.PI / 4}>
        <planeGeometry args={[0.14, 0.14]} />
      </mesh>
    </group>
  );
}

function Plaza() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tiles = useMemo(() => {
    const out: [number, number][] = [];
    const size = 1.9;
    for (let q = -7; q <= 7; q++) {
      for (let r = -7; r <= 7; r++) {
        const x = size * 1.5 * q;
        const z = size * Math.sqrt(3) * (r + q / 2);
        const d = Math.hypot(x, z - 2);
        if (d < 11 && d > 0 && (z > -5 || Math.abs(x) > 7.5)) out.push([x, z + 2]);
      }
    }
    return out;
  }, []);
  const geo = useMemo(() => new THREE.CylinderGeometry(1.82, 1.82, 0.16, 6), []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    tiles.forEach(([x, z], i) => {
      m.makeRotationY(Math.PI / 6);
      m.setPosition(x, terrainHeight(x, z) + 0.05, z);
      ref.current?.setMatrixAt(i, m);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    ref.current?.computeBoundingSphere();
  }, [tiles]);
  return <instancedMesh ref={ref} args={[geo, MAT.panelDark, tiles.length]} receiveShadow />;
}

function LightPosts() {
  const posts: [number, number][] = [
    [0, 30],
    [7, 22],
    [-6, 14],
    [9, 12],
    [-14, 8],
    [16, 2],
  ];
  return (
    <group>
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, terrainHeight(x, z), z]}>
          <mesh material={MAT.metalDark} position-y={1.5} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 3, 6]} />
          </mesh>
          <mesh material={MAT.glowCyan} position-y={3.05}>
            <boxGeometry args={[0.35, 0.12, 0.35]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Outpost() {
  return (
    <group>
      <Plaza />
      <HQ />
      <CommsDish />
      <DropPod />
      <Terminal />
      <HologramNpc />
      <LightPosts />
      {SIGNS.map((s) => (
        <Sign key={s.id} sign={s} />
      ))}
    </group>
  );
}
