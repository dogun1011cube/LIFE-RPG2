import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getScatter, type ScatterItem } from './scatter';
import { MAT } from '../render/materials';

function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, items: ScatterItem[], transform?: (m: THREE.Matrix4, it: ScatterItem) => void) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    items.forEach((it, i) => {
      if (transform) transform(m, it);
      else {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.rot);
        s.setScalar(it.scale);
        p.set(it.x, it.y, it.z);
        m.compose(p, q, s);
      }
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, items, transform]);
}

function makeTreeGeometries() {
  const trunk = new THREE.CylinderGeometry(0.18, 0.32, 2.4, 6);
  trunk.translate(0, 1.2, 0);
  const cones = [
    new THREE.ConeGeometry(1.7, 2.6, 7).translate(0, 2.8, 0),
    new THREE.ConeGeometry(1.35, 2.2, 7).translate(0, 4.0, 0),
    new THREE.ConeGeometry(0.95, 1.8, 7).translate(0, 5.1, 0),
  ];
  const canopy = mergeGeometries(cones)!;
  cones.forEach((c) => c.dispose());
  // Broadleaf variant: stacked icosahedra
  const blobs = [
    new THREE.IcosahedronGeometry(1.5, 0).translate(0, 3.2, 0),
    new THREE.IcosahedronGeometry(1.1, 0).translate(0.8, 3.9, 0.3),
    new THREE.IcosahedronGeometry(1.0, 0).translate(-0.7, 4.1, -0.4),
  ];
  const broad = mergeGeometries(blobs)!;
  blobs.forEach((b) => b.dispose());
  return { trunk, canopy, broad };
}

export function Vegetation() {
  const { trees, rocks, crystals, grass } = getScatter();
  const geos = useMemo(makeTreeGeometries, []);
  const conifers = useMemo(() => trees.filter((t) => t.variant === 0), [trees]);
  const broadleaf = useMemo(() => trees.filter((t) => t.variant === 1), [trees]);
  const rockGeo = useMemo(() => {
    const g = new THREE.DodecahedronGeometry(1, 0);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const k = 0.75 + (Math.sin(v.x * 5.1) * Math.cos(v.z * 4.3) + 1) * 0.18;
      pos.setXYZ(i, v.x * k * 1.2, v.y * k * 0.7, v.z * k);
    }
    g.computeVertexNormals();
    g.translate(0, 0.35, 0);
    return g;
  }, []);
  const crystalGeo = useMemo(() => {
    const parts = [
      new THREE.OctahedronGeometry(0.5, 0).scale(0.8, 3, 0.8).translate(0, 1.2, 0),
      new THREE.OctahedronGeometry(0.35, 0).scale(0.8, 2.4, 0.8).rotateZ(0.5).translate(0.5, 0.7, 0.1),
      new THREE.OctahedronGeometry(0.3, 0).scale(0.8, 2, 0.8).rotateZ(-0.6).translate(-0.4, 0.5, -0.2),
    ];
    const g = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
    return g;
  }, []);
  const grassGeo = useMemo(() => new THREE.ConeGeometry(0.12, 0.7, 3).translate(0, 0.3, 0), []);
  const grassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5c9a45', roughness: 1 }), []);
  const flowerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e7d36b', emissive: '#6b5a10', roughness: 1 }), []);

  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose());
      rockGeo.dispose();
      crystalGeo.dispose();
      grassGeo.dispose();
      grassMat.dispose();
      flowerMat.dispose();
    },
    [geos, rockGeo, crystalGeo, grassGeo, grassMat, flowerMat],
  );

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const broadTrunkRef = useRef<THREE.InstancedMesh>(null);
  const broadRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const crystalBlueRef = useRef<THREE.InstancedMesh>(null);
  const crystalPurpleRef = useRef<THREE.InstancedMesh>(null);
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);

  const blueCrystals = useMemo(() => crystals.filter((c) => c.variant === 0), [crystals]);
  const purpleCrystals = useMemo(() => crystals.filter((c) => c.variant === 1), [crystals]);
  const grassBlades = useMemo(() => grass.filter((g) => g.variant === 0), [grass]);
  const flowers = useMemo(() => grass.filter((g) => g.variant === 1), [grass]);

  useInstances(trunkRef, conifers);
  useInstances(canopyRef, conifers);
  useInstances(broadTrunkRef, broadleaf);
  useInstances(broadRef, broadleaf);
  useInstances(rockRef, rocks);
  useInstances(crystalBlueRef, blueCrystals);
  useInstances(crystalPurpleRef, purpleCrystals);
  useInstances(grassRef, grassBlades);
  useInstances(flowerRef, flowers);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[geos.trunk, MAT.bark, conifers.length]} castShadow />
      <instancedMesh ref={canopyRef} args={[geos.canopy, MAT.leaf, conifers.length]} castShadow />
      <instancedMesh ref={broadTrunkRef} args={[geos.trunk, MAT.bark, broadleaf.length]} castShadow />
      <instancedMesh ref={broadRef} args={[geos.broad, MAT.leafLight, broadleaf.length]} castShadow />
      <instancedMesh ref={rockRef} args={[rockGeo, MAT.stone, rocks.length]} castShadow receiveShadow />
      <instancedMesh ref={crystalBlueRef} args={[crystalGeo, MAT.crystalBlue, blueCrystals.length]} castShadow />
      <instancedMesh ref={crystalPurpleRef} args={[crystalGeo, MAT.crystalPurple, purpleCrystals.length]} castShadow />
      <instancedMesh ref={grassRef} args={[grassGeo, grassMat, grassBlades.length]} />
      <instancedMesh ref={flowerRef} args={[grassGeo, flowerMat, flowers.length]} />
    </group>
  );
}
