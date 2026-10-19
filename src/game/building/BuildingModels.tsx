import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAT, statusMaterial, type MatKey } from '../render/materials';
import type { BuildingState } from '../types';

// Procedural building meshes. While previewing placement, every part renders with the
// ghost material supplied through GhostContext.

export const GhostContext = createContext<THREE.Material | null>(null);

function useM(key: MatKey): THREE.Material {
  const ghost = useContext(GhostContext);
  return ghost ?? MAT[key];
}

interface ModelProps {
  state: BuildingState;
  /** veinResource colour for miners */
  accent?: string;
}

function StatusLight({ state, position }: { state: BuildingState; position: [number, number, number] }) {
  const ghost = useContext(GhostContext);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const blink = state === 'unpowered' || state === 'no_input' || state === 'storage_full' || state === 'invalid_site';
    ref.current.visible = !blink || Math.sin(performance.now() * 0.008) > -0.2;
  });
  return (
    <mesh ref={ref} position={position} material={ghost ?? statusMaterial(state)}>
      <sphereGeometry args={[0.14, 10, 8]} />
    </mesh>
  );
}

function Spinner({ speed, active, children, axis = 'y' }: { speed: number; active: boolean; children: ReactNode; axis?: 'x' | 'y' | 'z' }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current && active) ref.current.rotation[axis] += dt * speed;
  });
  return <group ref={ref}>{children}</group>;
}

function Foundation({ radius, height = 0.35, sides = 8 }: { radius: number; height?: number; sides?: number }) {
  const concrete = useM('concrete');
  const trim = useM('hazard');
  return (
    <>
      <mesh material={concrete} position-y={height / 2} receiveShadow castShadow>
        <cylinderGeometry args={[radius, radius * 1.05, height, sides]} />
      </mesh>
      <mesh material={trim} position-y={height + 0.01}>
        <cylinderGeometry args={[radius * 0.98, radius * 0.98, 0.03, sides]} />
      </mesh>
    </>
  );
}

export function PowerGeneratorModel({ state }: ModelProps) {
  const on = state === 'operational';
  const dark = useM('metalDark');
  const metal = useM('metal');
  const light = useM('metalLight');
  const copper = useM('copper');
  const glow = useM(on ? 'glowCyan' : 'glowOff');
  return (
    <group>
      <Foundation radius={2.3} />
      {/* Turbine housing */}
      <mesh material={dark} position={[0, 1.5, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[1.1, 1.1, 3, 16]} />
      </mesh>
      {[-1.2, -0.4, 0.4, 1.2].map((x) => (
        <mesh key={x} material={metal} position={[x, 1.5, 0]} rotation-z={Math.PI / 2}>
          <torusGeometry args={[1.12, 0.07, 6, 20]} />
        </mesh>
      ))}
      {/* Intake fan */}
      <group position={[1.55, 1.5, 0]} rotation-z={Math.PI / 2}>
        <Spinner speed={10} active={on}>
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <mesh key={k} material={light} rotation-y={(k / 6) * Math.PI * 2}>
              <boxGeometry args={[0.12, 0.05, 1.8]} />
            </mesh>
          ))}
        </Spinner>
      </group>
      {/* Exhaust stacks */}
      {[-0.7, 0.7].map((x) => (
        <group key={x} position={[x, 2.4, -0.6]}>
          <mesh material={metal} position-y={0.8} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 1.8, 10]} />
          </mesh>
          <mesh material={glow} position-y={1.72}>
            <cylinderGeometry args={[0.18, 0.18, 0.08, 10]} />
          </mesh>
        </group>
      ))}
      {/* Copper coils */}
      <mesh material={copper} position={[-1.7, 1.2, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1.2, 12]} />
      </mesh>
      <mesh material={glow} position={[0, 1.5, 1.12]}>
        <boxGeometry args={[2.2, 0.12, 0.05]} />
      </mesh>
      <StatusLight state={state} position={[-1.7, 2.0, 0]} />
    </group>
  );
}

export function ResearchLabModel({ state }: ModelProps) {
  const on = state === 'operational';
  const panel = useM('panel');
  const dark = useM('metalDark');
  const glass = useM('glass');
  const glow = useM(on ? 'glowCyan' : 'glowOff');
  const holo = useM(on ? 'hologram' : 'glowOff');
  const gold = useM('gold');
  return (
    <group>
      <Foundation radius={3.1} sides={6} />
      {/* Main hall */}
      <mesh material={panel} position-y={1.6} castShadow receiveShadow>
        <boxGeometry args={[4.4, 2.5, 3.4]} />
      </mesh>
      <mesh material={dark} position-y={3} castShadow>
        <boxGeometry args={[4.6, 0.3, 3.6]} />
      </mesh>
      {/* Window band */}
      <mesh material={glass} position={[0, 1.9, -1.71]}>
        <boxGeometry args={[3.8, 0.9, 0.04]} />
      </mesh>
      <mesh material={glow} position={[0, 1.35, -1.72]}>
        <boxGeometry args={[3.8, 0.06, 0.04]} />
      </mesh>
      {/* Observatory dome */}
      <mesh material={glass} position={[0.8, 3.15, 0.3]}>
        <sphereGeometry args={[1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={dark} position={[0.8, 3.6, 0.3]} rotation-z={0.6}>
        <cylinderGeometry args={[0.12, 0.2, 1.6, 8]} />
      </mesh>
      {/* Exterior work surface + console */}
      <group position={[-1.2, 0.35, -2.4]}>
        <mesh material={dark} position-y={0.45} castShadow>
          <boxGeometry args={[1.6, 0.9, 0.7]} />
        </mesh>
        <mesh material={glow} position={[0, 0.95, 0.05]} rotation-x={-0.5}>
          <boxGeometry args={[1.3, 0.04, 0.5]} />
        </mesh>
        {/* sample flasks */}
        {[-0.5, 0, 0.5].map((x) => (
          <mesh key={x} material={glass} position={[x, 1.1, -0.15]}>
            <cylinderGeometry args={[0.08, 0.12, 0.3, 8]} />
          </mesh>
        ))}
      </group>
      {/* Hologram projector */}
      <group position={[-1.3, 3.2, 0.6]}>
        <mesh material={gold} position-y={-0.1}>
          <cylinderGeometry args={[0.35, 0.4, 0.15, 12]} />
        </mesh>
        <Spinner speed={0.9} active={on}>
          <mesh material={holo} position-y={0.6}>
            <icosahedronGeometry args={[0.45, 1]} />
          </mesh>
          <mesh material={glow} position-y={0.6} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.65, 0.02, 4, 32]} />
          </mesh>
        </Spinner>
      </group>
      <StatusLight state={state} position={[2.1, 3.3, -1.7]} />
    </group>
  );
}

export function WorkshopModel({ state }: ModelProps) {
  const on = state === 'operational';
  const dark = useM('metalDark');
  const metal = useM('metal');
  const panel = useM('panelDark');
  const hazard = useM('hazard');
  const glow = useM(on ? 'glowGold' : 'glowOff');
  return (
    <group>
      <Foundation radius={2.7} />
      <mesh material={panel} position-y={1.4} castShadow>
        <boxGeometry args={[3.8, 2.2, 3]} />
      </mesh>
      {/* sloped roof */}
      <mesh material={dark} position={[0, 2.75, 0]} rotation-z={0.12} castShadow>
        <boxGeometry args={[4.1, 0.25, 3.3]} />
      </mesh>
      {/* Garage door */}
      <mesh material={metal} position={[0, 1.25, -1.51]}>
        <boxGeometry args={[2.2, 1.7, 0.05]} />
      </mesh>
      {[0.6, 1.0, 1.4, 1.8].map((y) => (
        <mesh key={y} material={dark} position={[0, y, -1.54]}>
          <boxGeometry args={[2.2, 0.04, 0.02]} />
        </mesh>
      ))}
      <mesh material={hazard} position={[0, 2.2, -1.53]}>
        <boxGeometry args={[2.4, 0.15, 0.03]} />
      </mesh>
      {/* Robotic arm on the roof */}
      <group position={[1.1, 2.9, 0.6]}>
        <Spinner speed={0.8} active={on}>
          <mesh material={metal} position-y={0.2}>
            <cylinderGeometry args={[0.25, 0.3, 0.4, 10]} />
          </mesh>
          <mesh material={hazard} position={[0.35, 0.7, 0]} rotation-z={-0.8}>
            <boxGeometry args={[0.14, 1, 0.14]} />
          </mesh>
          <mesh material={hazard} position={[0.85, 0.85, 0]} rotation-z={0.9}>
            <boxGeometry args={[0.12, 0.7, 0.12]} />
          </mesh>
          <mesh material={glow} position={[1.1, 0.6, 0]}>
            <sphereGeometry args={[0.1, 8, 6]} />
          </mesh>
        </Spinner>
      </group>
      <mesh material={glow} position={[-1.91, 1.4, 0]}>
        <boxGeometry args={[0.04, 0.4, 1.8]} />
      </mesh>
      <StatusLight state={state} position={[-1.5, 2.95, -1.4]} />
    </group>
  );
}

export function AutoMinerModel({ state, accent }: ModelProps) {
  const on = state === 'operational';
  const dark = useM('metalDark');
  const metal = useM('metal');
  const hazard = useM('hazard');
  const glow = useM(on ? 'glowCyan' : 'glowOff');
  const ghost = useContext(GhostContext);
  const drill = useRef<THREE.Group>(null);
  useFrame(() => {
    if (drill.current && on) drill.current.position.y = 0.9 + Math.sin(performance.now() * 0.006) * 0.25;
  });
  return (
    <group>
      <Foundation radius={2.1} />
      {/* Derrick legs */}
      {[0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={k} material={metal} position={[Math.cos(a) * 1.1, 2.3, Math.sin(a) * 1.1]} rotation={[Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2]} castShadow>
            <boxGeometry args={[0.18, 4.2, 0.18]} />
          </mesh>
        );
      })}
      <mesh material={dark} position-y={4.4} castShadow>
        <boxGeometry args={[1.4, 0.5, 1.4]} />
      </mesh>
      <mesh material={glow} position-y={4.7}>
        <boxGeometry args={[0.8, 0.08, 0.8]} />
      </mesh>
      <group ref={drill} position-y={0.9}>
        <Spinner speed={8} active={on}>
          <mesh material={hazard} position-y={1.6}>
            <cylinderGeometry args={[0.35, 0.35, 1.4, 10]} />
          </mesh>
          <mesh material={metal} position-y={0.5} rotation-x={Math.PI}>
            <coneGeometry args={[0.35, 1, 10]} />
          </mesh>
        </Spinner>
      </group>
      {/* Ore hopper with the mined resource colour */}
      <mesh material={dark} position={[1.4, 0.8, 0]} castShadow>
        <boxGeometry args={[0.8, 0.9, 1.2]} />
      </mesh>
      <mesh position={[1.4, 1.3, 0]} material={ghost ?? undefined}>
        <boxGeometry args={[0.6, 0.15, 1]} />
        {!ghost && <meshStandardMaterial color={accent ?? '#888'} emissive={accent ?? '#000'} emissiveIntensity={on ? 0.6 : 0.1} />}
      </mesh>
      <StatusLight state={state} position={[0, 5, 0.75]} />
    </group>
  );
}

export function SmelterModel({ state }: ModelProps) {
  const on = state === 'operational';
  const dark = useM('metalDark');
  const metal = useM('metal');
  const copper = useM('copper');
  const ghost = useContext(GhostContext);
  const heat = useM(on ? 'glowGold' : 'glowOff');
  return (
    <group>
      <Foundation radius={2.5} />
      {/* Crucible furnace */}
      <mesh material={dark} position-y={1.5} castShadow>
        <cylinderGeometry args={[1.2, 1.5, 2.4, 12]} />
      </mesh>
      <mesh material={heat} position={[0, 1.2, -1.32]}>
        <boxGeometry args={[0.9, 0.6, 0.1]} />
      </mesh>
      <mesh material={metal} position-y={2.9}>
        <cylinderGeometry args={[0.9, 1.2, 0.5, 12]} />
      </mesh>
      {/* Chimney */}
      <mesh material={metal} position={[0.6, 3.8, 0.5]} castShadow>
        <cylinderGeometry args={[0.25, 0.32, 2, 10]} />
      </mesh>
      <mesh material={heat} position={[0.6, 4.82, 0.5]}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 10]} />
      </mesh>
      {/* Input hoppers */}
      <mesh material={metal} position={[-1.6, 1.2, 0.6]} castShadow>
        <boxGeometry args={[0.8, 1.4, 0.8]} />
      </mesh>
      <mesh material={copper} position={[-1.6, 1.2, -0.5]} castShadow>
        <boxGeometry args={[0.7, 1.2, 0.7]} />
      </mesh>
      {/* Output ingots */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[1.7, 0.45 + i * 0.16, -0.3 + (i % 2) * 0.2]} material={ghost ?? MAT.glowGreen}>
          <boxGeometry args={[0.6, 0.14, 0.3]} />
        </mesh>
      ))}
      <StatusLight state={state} position={[0, 3.25, -1]} />
    </group>
  );
}

export function StorageDepotModel({ state }: ModelProps) {
  const metal = useM('metal');
  const dark = useM('metalDark');
  const hazard = useM('hazard');
  const panel = useM('panel');
  return (
    <group>
      <Foundation radius={2.5} height={0.25} sides={4} />
      {[
        [-0.9, 0.85, -0.7, panel],
        [0.9, 0.85, -0.7, metal],
        [-0.9, 0.85, 0.8, metal],
        [0.9, 0.85, 0.8, panel],
        [0, 2.05, 0, dark],
      ].map(([x, y, z, m], i) => (
        <group key={i} position={[x as number, y as number, z as number]}>
          <mesh material={m as THREE.Material} castShadow>
            <boxGeometry args={[1.6, 1.2, 1.3]} />
          </mesh>
          <mesh material={hazard} position-y={0.61}>
            <boxGeometry args={[1.62, 0.04, 1.32]} />
          </mesh>
        </group>
      ))}
      <StatusLight state={state} position={[0, 2.8, 0]} />
    </group>
  );
}

export function BatteryModel({ state }: ModelProps) {
  const dark = useM('metalDark');
  const glow = useM(state === 'operational' ? 'glowGreen' : 'glowOff');
  const metal = useM('metalLight');
  return (
    <group>
      <Foundation radius={1.7} height={0.25} />
      {[-0.6, 0.6].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh material={dark} position-y={1.2} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 1.9, 14]} />
          </mesh>
          {[0.6, 1.0, 1.4].map((y) => (
            <mesh key={y} material={glow} position-y={y}>
              <cylinderGeometry args={[0.51, 0.51, 0.08, 14]} />
            </mesh>
          ))}
          <mesh material={metal} position-y={2.25}>
            <cylinderGeometry args={[0.2, 0.3, 0.2, 10]} />
          </mesh>
        </group>
      ))}
      <StatusLight state={state} position={[0, 2.4, 0.5]} />
    </group>
  );
}

export function TurretModel({ state, headRef }: ModelProps & { headRef?: React.RefObject<THREE.Group | null> }) {
  const dark = useM('metal');
  const metal = useM('panel');
  const hazard = useM('hazard');
  const glow = useM(state === 'operational' ? 'glowCyan' : 'glowOff');
  return (
    <group>
      <Foundation radius={1.5} height={0.3} sides={6} />
      <mesh material={dark} position-y={1} castShadow>
        <cylinderGeometry args={[0.5, 0.8, 1.4, 8]} />
      </mesh>
      <group ref={headRef} position-y={2}>
        <mesh material={metal} castShadow>
          <boxGeometry args={[1, 0.6, 1.1]} />
        </mesh>
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} material={dark} position={[x, 0.05, -0.9]} rotation-x={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1, 8]} />
          </mesh>
        ))}
        <mesh material={glow} position={[0, 0.15, -0.56]}>
          <boxGeometry args={[0.5, 0.12, 0.02]} />
        </mesh>
        <mesh material={glow} position={[0, 0.36, 0.1]}>
          <sphereGeometry args={[0.12, 8, 6]} />
        </mesh>
        <mesh material={hazard} position={[0, -0.31, 0]}>
          <boxGeometry args={[1.02, 0.08, 1.12]} />
        </mesh>
      </group>
      <StatusLight state={state} position={[0.6, 1.4, 0.4]} />
    </group>
  );
}

export function PlasmaGeneratorModel({ state }: ModelProps) {
  const on = state === 'operational';
  const dark = useM('metalDark');
  const metal = useM('metalLight');
  const glow = useM(on ? 'glowPurple' : 'glowOff');
  const cyan = useM(on ? 'glowCyan' : 'glowOff');
  return (
    <group>
      <Foundation radius={2.9} sides={10} />
      {[0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2;
        return (
          <mesh key={k} material={dark} position={[Math.cos(a) * 2, 2.6, Math.sin(a) * 2]} castShadow>
            <boxGeometry args={[0.5, 4.6, 0.5]} />
          </mesh>
        );
      })}
      <mesh material={metal} position-y={5} castShadow>
        <cylinderGeometry args={[2.4, 2.4, 0.3, 16]} />
      </mesh>
      <group position-y={2.8}>
        <Spinner speed={1.5} active={on}>
          <mesh material={cyan} rotation-x={Math.PI / 2}>
            <torusGeometry args={[1.4, 0.12, 8, 32]} />
          </mesh>
        </Spinner>
        <Spinner speed={-2.2} active={on} axis="x">
          <mesh material={cyan}>
            <torusGeometry args={[1.1, 0.08, 8, 32]} />
          </mesh>
        </Spinner>
        <mesh material={glow}>
          <sphereGeometry args={[0.7, 20, 14]} />
        </mesh>
      </group>
      <StatusLight state={state} position={[2, 5.3, 0]} />
    </group>
  );
}

export function GenesisBeaconModel({ state }: ModelProps) {
  const on = state === 'operational';
  const dark = useM('composite');
  const metal = useM('metalLight');
  const gold = useM('gold');
  const glow = useM(on ? 'glowMagenta' : 'glowOff');
  const cyan = useM(on ? 'glowCyan' : 'glowOff');
  return (
    <group>
      <Foundation radius={3.3} sides={6} height={0.6} />
      <mesh material={dark} position-y={4} castShadow>
        <cylinderGeometry args={[0.6, 2.4, 7, 6]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const a = (k / 6) * Math.PI * 2;
        return (
          <mesh key={k} material={cyan} position={[Math.cos(a) * 1.55, 4, Math.sin(a) * 1.55]} rotation={[0, -a, 0.24]}>
            <boxGeometry args={[0.1, 6.4, 0.3]} />
          </mesh>
        );
      })}
      <mesh material={metal} position-y={8.4}>
        <cylinderGeometry args={[0.15, 0.5, 2, 6]} />
      </mesh>
      <group position-y={11}>
        <Spinner speed={0.8} active={on}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} material={gold} rotation={[Math.PI / 2 + k * 0.6, k, 0]}>
              <torusGeometry args={[1.6 + k * 0.4, 0.06, 6, 40]} />
            </mesh>
          ))}
        </Spinner>
        <mesh material={glow}>
          <octahedronGeometry args={[0.9, 0]} />
        </mesh>
      </group>
      {on && (
        <mesh position-y={60} material={MAT.hologram}>
          <cylinderGeometry args={[0.3, 0.8, 100, 10, 1, true]} />
        </mesh>
      )}
      <StatusLight state={state} position={[0, 1.2, -2.3]} />
    </group>
  );
}

function GenericModel({ state }: ModelProps) {
  const m = useM('metal');
  return (
    <group>
      <Foundation radius={2} />
      <mesh material={m} position-y={1.4} castShadow>
        <boxGeometry args={[2.4, 2, 2.4]} />
      </mesh>
      <StatusLight state={state} position={[0, 2.6, 0]} />
    </group>
  );
}

const MODELS: Record<string, (p: ModelProps) => React.JSX.Element> = {
  power_generator: PowerGeneratorModel,
  research_lab: ResearchLabModel,
  workshop: WorkshopModel,
  auto_miner: AutoMinerModel,
  smelter: SmelterModel,
  storage_depot: StorageDepotModel,
  battery_bank: BatteryModel,
  defense_turret: TurretModel,
  plasma_generator: PlasmaGeneratorModel,
  genesis_beacon: GenesisBeaconModel,
};

export function BuildingModel({ type, ...props }: ModelProps & { type: string }) {
  const Model = MODELS[type] ?? GenericModel;
  return <Model {...props} />;
}
