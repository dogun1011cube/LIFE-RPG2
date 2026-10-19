import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { terrainHeight } from './terrain';
import { BUILD_ZONE, ORE_VEINS, ZONES } from '../../data/world';
import { RESOURCES } from '../../data/resources';
import { fbm, smoothstep } from '../../utils/math';
import { useUi } from '../../state/uiStore';
import { MAT } from '../render/materials';

const SIZE = 340;
const SEGMENTS = 210;

const GRASS = new THREE.Color('#3f7a3a');
const GRASS_DRY = new THREE.Color('#6f8a3c');
const DIRT = new THREE.Color('#6b5a43');
const ROCK = new THREE.Color('#6f6d69');
const SNOW = new THREE.Color('#c9d2d8');
const CORRUPT = new THREE.Color('#3b2350');
const PAD = new THREE.Color('#4d5a56');
const RIDGE = new THREE.Color('#5d6f86');

function buildTerrainGeometry() {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const corruption = ZONES.find((z) => z.id === 'corruption')!;
  const ridge = ZONES.find((z) => z.id === 'ridge')!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    // slope estimate
    const dx = terrainHeight(x + 1, z) - terrainHeight(x - 1, z);
    const dz = terrainHeight(x, z + 1) - terrainHeight(x, z - 1);
    const slope = Math.min(1, Math.hypot(dx, dz) / 2.2);
    const n = fbm(x * 0.08, z * 0.08, 2) * 0.5 + 0.5;
    c.copy(GRASS).lerp(GRASS_DRY, n * 0.6);
    c.lerp(DIRT, smoothstep(0.35, 0.8, slope) * 0.7);
    c.lerp(ROCK, smoothstep(0.55, 0.95, slope));
    c.lerp(SNOW, smoothstep(30, 50, h));
    const r = Math.hypot(x, z);
    // worn ground around the outpost
    c.lerp(PAD, (1 - smoothstep(12, 22, r)) * 0.55);
    const dc = Math.hypot(x - corruption.center[0], z - corruption.center[1]);
    c.lerp(CORRUPT, (1 - smoothstep(corruption.radius - 6, corruption.radius + 10, dc)) * 0.85);
    const dr = Math.hypot(x - ridge.center[0], z - ridge.center[1]);
    c.lerp(RIDGE, (1 - smoothstep(ridge.radius - 4, ridge.radius + 12, dr)) * 0.45);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function Terrain() {
  const geo = useMemo(buildTerrainGeometry, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), []);
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  return <mesh geometry={geo} material={mat} receiveShadow />;
}

/** Glowing ore veins inside the build zone — automated miners must be placed on these. */
export function OreVeins() {
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.8, 1, 48), []);
  const discGeo = useMemo(() => new THREE.CircleGeometry(1, 40), []);
  const mats = useMemo(
    () =>
      ORE_VEINS.map(
        (v) =>
          new THREE.MeshBasicMaterial({ color: RESOURCES[v.resource].color, transparent: true, opacity: 0.22, depthWrite: false }),
      ),
    [],
  );
  useEffect(() => () => {
    ringGeo.dispose();
    discGeo.dispose();
    mats.forEach((m) => m.dispose());
  }, [ringGeo, discGeo, mats]);
  return (
    <group>
      {ORE_VEINS.map((v, i) => {
        const y = terrainHeight(v.position[0], v.position[1]) + 0.06;
        return (
          <group key={v.id} position={[v.position[0], y, v.position[1]]}>
            <mesh geometry={discGeo} material={mats[i]} rotation-x={-Math.PI / 2} scale={v.radius} />
            <mesh geometry={ringGeo} material={MAT.glowCyanSoft} rotation-x={-Math.PI / 2} scale={v.radius} />
            {[0, 1, 2, 3, 4].map((k) => {
              const a = (k / 5) * Math.PI * 2 + i;
              const rr = v.radius * (0.3 + (k % 3) * 0.2);
              return (
                <mesh key={k} position={[Math.cos(a) * rr, 0.25, Math.sin(a) * rr]} rotation={[0.4 * k, a, 0.3]} castShadow>
                  <octahedronGeometry args={[0.45 + (k % 2) * 0.2, 0]} />
                  <meshStandardMaterial color={RESOURCES[v.resource].color} roughness={0.4} metalness={0.5} flatShading />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/** Build zone boundary: pylons always visible, a ground ring shown in build mode */
export function BuildZoneMarker() {
  const buildMode = useUi((s) => s.buildMode);
  const pylons = useMemo(() => {
    const out: [number, number, number][] = [];
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * BUILD_ZONE.radius;
      const z = Math.sin(a) * BUILD_ZONE.radius;
      out.push([x, terrainHeight(x, z), z]);
    }
    return out;
  }, []);
  const ringGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      const x = Math.cos(a) * BUILD_ZONE.radius;
      const z = Math.sin(a) * BUILD_ZONE.radius;
      pts.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.15, z));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#4fe9ff', transparent: true, opacity: 0.8 }), []);
  const line = useMemo(() => new THREE.Line(ringGeo, lineMat), [ringGeo, lineMat]);
  useEffect(() => () => {
    ringGeo.dispose();
    lineMat.dispose();
  }, [ringGeo, lineMat]);
  return (
    <group>
      {pylons.map((p, i) => (
        <group key={i} position={p}>
          <mesh material={MAT.metalDark} position-y={0.6} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 1.2, 6]} />
          </mesh>
          <mesh material={buildMode ? MAT.glowCyan : MAT.glowCyanSoft} position-y={1.25}>
            <octahedronGeometry args={[0.16, 0]} />
          </mesh>
        </group>
      ))}
      {buildMode && <primitive object={line} />}
    </group>
  );
}
