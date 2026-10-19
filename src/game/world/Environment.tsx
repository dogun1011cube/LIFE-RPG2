import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SPIRE_POS, ZONES } from '../../data/world';
import { mulberry32 } from '../../utils/math';
import { MAT } from '../render/materials';
import { runtime } from '../runtime';
import { useUi } from '../../state/uiStore';
import { terrainHeight } from './terrain';

export const FOG_COLOR = '#8fa9b8';

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
}`;

const skyFragment = /* glsl */ `
varying vec3 vDir;
uniform vec3 uSunDir;
void main() {
  float h = vDir.y;
  vec3 zenith = vec3(0.10, 0.22, 0.38);
  vec3 mid = vec3(0.38, 0.58, 0.70);
  vec3 horizon = vec3(0.86, 0.78, 0.64);
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, h));
  col = mix(col, zenith, smoothstep(0.18, 0.75, h));
  col = mix(col, vec3(0.56, 0.66, 0.72), smoothstep(0.0, -0.2, h));
  float sun = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
  col += vec3(1.0, 0.82, 0.55) * pow(sun, 420.0) * 3.0;
  col += vec3(1.0, 0.72, 0.45) * pow(sun, 10.0) * 0.32;
  gl_FragColor = vec4(col, 1.0);
}`;

export const SUN_DIR = new THREE.Vector3(-0.55, 0.42, -0.72).normalize();

function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: { uSunDir: { value: SUN_DIR } },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(900, 32, 16), []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position);
  });
  useEffect(() => () => {
    mat.dispose();
    geo.dispose();
  }, [mat, geo]);
  return <mesh ref={ref} geometry={geo} material={mat} renderOrder={-1} frustumCulled={false} />;
}

function Lights() {
  const shadows = useUi((s) => s.settings.shadows);
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const { scene } = useThree();
  useEffect(() => {
    scene.add(target);
    return () => {
      scene.remove(target);
    };
  }, [scene, target]);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    // Keep the shadow frustum centred on the player
    const p = runtime.player.pos;
    target.position.set(Math.round(p.x), p.y, Math.round(p.z));
    l.position.set(target.position.x + SUN_DIR.x * 80, target.position.y + SUN_DIR.y * 80, target.position.z + SUN_DIR.z * 80);
    l.target = target;
  });
  return (
    <>
      <hemisphereLight args={['#cfe8ff', '#4a5a38', 1.05]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={light}
        color="#ffe2b8"
        intensity={2.3}
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={10}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  );
}

/** The Ancient Spire: a monumental landmark far to the north. */
function AncientSpire() {
  const beam = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * 0.15;
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(performance.now() * 0.0012) * 0.06;
  });
  const [x, z] = SPIRE_POS;
  const base = terrainHeight(x, z) - 6;
  const tiers = [
    { h: 30, r0: 22, r1: 17 },
    { h: 40, r0: 15, r1: 11 },
    { h: 50, r0: 10, r1: 6.5 },
    { h: 55, r0: 6, r1: 2.8 },
    { h: 35, r0: 2.6, r1: 0.4 },
  ];
  let y = base;
  return (
    <group position={[x, 0, z]}>
      {tiers.map((t, i) => {
        const cy = y + t.h / 2;
        y += t.h;
        return (
          <group key={i}>
            <mesh position-y={cy} material={i % 2 ? MAT.stoneDark : MAT.composite}>
              <cylinderGeometry args={[t.r1, t.r0, t.h, 6]} />
            </mesh>
            {/* energy seams */}
            {[0, 1, 2, 3, 4, 5].map((k) => {
              const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
              const rr = (t.r0 + t.r1) / 2 + 0.15;
              return (
                <mesh key={k} position={[Math.cos(a) * rr, cy, Math.sin(a) * rr]} rotation-y={-a} material={MAT.glowCyan}>
                  <boxGeometry args={[0.3, t.h * 0.85, 0.6]} />
                </mesh>
              );
            })}
            <mesh position-y={y} material={MAT.glowCyanSoft}>
              <torusGeometry args={[t.r1 + 0.6, 0.35, 6, 24]} />
            </mesh>
          </group>
        );
      })}
      <group ref={ring} position-y={base + 150}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} rotation={[Math.PI / 2 + k * 0.35, k * 1.1, 0]} material={MAT.glowGold}>
            <torusGeometry args={[18 + k * 4, 0.4, 6, 48]} />
          </mesh>
        ))}
      </group>
      <mesh ref={beam} position-y={base + 400}>
        <cylinderGeometry args={[1.2, 3, 500, 12, 1, true]} />
        <meshBasicMaterial color="#7ff1ff" transparent opacity={0.2} depthWrite={false} fog={false} />
      </mesh>
    </group>
  );
}

/** Distant mesas and broken megastructures that form the skyline. */
function Skyline() {
  const items = useMemo(() => {
    const rng = mulberry32(77);
    const out: { x: number; z: number; h: number; r: number; kind: number; rot: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rng() * 0.2;
      const d = 230 + rng() * 120;
      out.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, h: 30 + rng() * 70, r: 14 + rng() * 26, kind: rng() < 0.25 ? 1 : 0, rot: rng() * 6 });
    }
    return out;
  }, []);
  return (
    <group>
      {items.map((it, i) =>
        it.kind === 0 ? (
          <mesh key={i} position={[it.x, it.h / 2 - 8, it.z]} rotation-y={it.rot} material={MAT.stoneDark}>
            <cylinderGeometry args={[it.r * 0.7, it.r, it.h, 7]} />
          </mesh>
        ) : (
          <group key={i} position={[it.x, -5, it.z]} rotation-y={it.rot}>
            <mesh position-y={it.h * 0.6} material={MAT.composite}>
              <boxGeometry args={[6, it.h * 1.2, 6]} />
            </mesh>
            <mesh position={[0, it.h * 1.15, 0]} rotation-z={0.5} material={MAT.composite}>
              <boxGeometry args={[4, it.h * 0.5, 4]} />
            </mesh>
            <mesh position-y={it.h * 0.9} material={MAT.glowCyanSoft}>
              <boxGeometry args={[6.4, 0.6, 6.4]} />
            </mesh>
          </group>
        ),
      )}
    </group>
  );
}

/** Purple haze columns over the corruption zone */
function CorruptionHaze() {
  const zone = ZONES.find((z) => z.id === 'corruption')!;
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.05;
  });
  const y = terrainHeight(zone.center[0], zone.center[1]);
  return (
    <group ref={ref} position={[zone.center[0], y, zone.center[1]]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position-y={6 + i * 5}>
          <cylinderGeometry args={[zone.radius - i * 4, zone.radius - i * 3, 2.5, 32, 1, true]} />
          <meshBasicMaterial color="#9b4dff" transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Procedural reflection environment so metallic surfaces read correctly (no texture download). */
function ReflectionEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const tex = pmrem.fromScene(room, 0.04).texture;
    scene.environment = tex;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      tex.dispose();
      pmrem.dispose();
      room.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
    };
  }, [gl, scene]);
  return null;
}

export function Environment() {
  return (
    <>
      <ReflectionEnvironment />
      <fogExp2 attach="fog" args={[FOG_COLOR, 0.0042]} />
      <Sky />
      <Lights />
      <AncientSpire />
      <Skyline />
      <CorruptionHaze />
    </>
  );
}
