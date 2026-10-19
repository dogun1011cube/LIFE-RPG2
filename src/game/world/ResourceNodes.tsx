import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RESOURCE_NODES } from '../../data/world';
import { useGame } from '../../state/gameStore';
import { NODE_INFO } from '../resources/nodes';
import { MAT } from '../render/materials';
import { terrainHeight } from './terrain';
import { mulberry32 } from '../../utils/math';
import type { ResourceNodeDef } from '../types';

const oreMats: Record<string, THREE.MeshStandardMaterial> = {};
function oreMaterial(kind: string) {
  if (!oreMats[kind]) {
    const info = NODE_INFO[kind as ResourceNodeDef['kind']];
    oreMats[kind] = new THREE.MeshStandardMaterial({
      color: info.color,
      emissive: info.emissive,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.6,
      flatShading: true,
    });
  }
  return oreMats[kind];
}

const NodeView = memo(function NodeView({ def }: { def: ResourceNodeDef }) {
  const charges = useGame((s) => s.game.nodes[def.id]?.charges ?? def.charges);
  const depleted = charges <= 0;
  const ratio = charges / def.charges;
  const crystalGroup = useRef<THREE.Group>(null);
  const [x, z] = def.position;
  const y = terrainHeight(x, z);
  const shape = useMemo(() => {
    const rng = mulberry32(def.id.length * 977 + Math.round(x * 13 + z * 7));
    return Array.from({ length: 6 }, (_, i) => ({
      a: (i / 6) * Math.PI * 2 + rng() * 0.5,
      r: 0.3 + rng() * 0.6,
      s: 0.35 + rng() * 0.45,
      tilt: rng() * 0.8 - 0.4,
    }));
  }, [def.id, x, z]);

  useFrame(() => {
    const g = crystalGroup.current;
    if (!g) return;
    const target = depleted ? 0.001 : 0.55 + ratio * 0.45;
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, target, 0.1));
    if (def.kind === 'wreck') g.rotation.y += 0.01;
  });

  if (def.kind === 'wreck') {
    return (
      <group position={[x, y, z]} rotation-y={x * 0.3}>
        <mesh material={MAT.metalDark} position={[0, 0.4, 0]} rotation={[0.3, 0.4, 0.5]} castShadow>
          <boxGeometry args={[2.4, 0.2, 1.4]} />
        </mesh>
        <mesh material={MAT.composite} position={[0.6, 0.6, -0.3]} rotation={[-0.4, 0.2, 1.1]} castShadow>
          <boxGeometry args={[1.6, 0.15, 1]} />
        </mesh>
        <mesh material={MAT.metal} position={[-0.7, 0.5, 0.4]} rotation={[0.2, 0.1, -0.6]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 1.6, 8]} />
        </mesh>
        <mesh material={MAT.hazard} position={[0.2, 0.55, 0.6]} rotation={[0.3, 0.4, 0.5]}>
          <boxGeometry args={[1.2, 0.05, 0.18]} />
        </mesh>
        <group ref={crystalGroup} position-y={1.1}>
          <mesh material={depleted ? MAT.glowOff : MAT.glowCyan}>
            <octahedronGeometry args={[0.32, 0]} />
          </mesh>
          <mesh material={MAT.hologram}>
            <icosahedronGeometry args={[0.55, 1]} />
          </mesh>
        </group>
      </group>
    );
  }
  return (
    <group position={[x, y, z]}>
      <mesh material={depleted ? MAT.stoneDark : MAT.stone} position-y={0.3} scale={[1.3, 0.75, 1.1]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.9, 0]} />
      </mesh>
      <group ref={crystalGroup}>
        {shape.map((c, i) => (
          <mesh
            key={i}
            material={oreMaterial(def.kind)}
            position={[Math.cos(c.a) * c.r, 0.55 + c.s * 0.6, Math.sin(c.a) * c.r]}
            rotation={[c.tilt, c.a, c.tilt * 0.7]}
            castShadow
          >
            <octahedronGeometry args={[c.s, 0]} />
          </mesh>
        ))}
      </group>
    </group>
  );
});

export function ResourceNodes() {
  return (
    <group>
      {RESOURCE_NODES.map((n) => (
        <NodeView key={n.id} def={n} />
      ))}
    </group>
  );
}
