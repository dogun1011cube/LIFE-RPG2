import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Pooled visual effects. All effects share a fixed-size pool updated in one frame
// callback, so spawning effects never allocates new GPU resources.

const MAX_PARTICLES = 320;
const MAX_BEAMS = 10;

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  color: THREE.Color;
  gravity: number;
}
interface Beam {
  a: THREE.Vector3;
  b: THREE.Vector3;
  life: number;
  color: THREE.Color;
}
interface FloatText {
  el: HTMLDivElement;
  pos: THREE.Vector3;
  life: number;
  max: number;
}

const particles: Particle[] = [];
const beams: Beam[] = [];
const texts: FloatText[] = [];
let textLayer: HTMLDivElement | null = null;

export const fx = {
  burst(pos: THREE.Vector3, color: string, count = 12, speed = 4, gravity = 9, size = 0.12) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.3, Math.random() - 0.5).normalize();
      const life = 0.45 + Math.random() * 0.5;
      particles.push({
        pos: pos.clone(),
        vel: dir.multiplyScalar(speed * (0.5 + Math.random() * 0.8)),
        life,
        max: life,
        size: size * (0.6 + Math.random() * 0.8),
        color: c,
        gravity,
      });
    }
  },
  beam(a: THREE.Vector3, b: THREE.Vector3, color = '#5ef2ff') {
    if (beams.length >= MAX_BEAMS) beams.shift();
    beams.push({ a: a.clone(), b: b.clone(), life: 0.18, color: new THREE.Color(color) });
  },
  text(pos: THREE.Vector3, text: string, kind: 'damage' | 'hurt' | 'gain' | 'reward' | 'info' = 'damage') {
    if (!textLayer) return;
    if (texts.length > 24) {
      const old = texts.shift();
      old?.el.remove();
    }
    const el = document.createElement('div');
    el.className = `float-text float-${kind}`;
    el.textContent = text;
    textLayer.appendChild(el);
    const life = kind === 'gain' || kind === 'reward' ? 1.6 : 1;
    texts.push({ el, pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5)), life, max: life });
  },
  clear() {
    particles.length = 0;
    beams.length = 0;
    texts.forEach((t) => t.el.remove());
    texts.length = 0;
  },
};

/** DOM layer for floating combat/reward text. Render once, outside the canvas. */
export function registerTextLayer(el: HTMLDivElement | null) {
  textLayer = el;
}

const tmpObj = new THREE.Object3D();
const tmpV = new THREE.Vector3();

export function Effects() {
  const pRef = useRef<THREE.InstancedMesh>(null);
  const beamRefs = useRef<(THREE.Mesh | null)[]>([]);
  const { camera, size } = useThree();
  const pGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const pMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const beamGeo = useMemo(() => new THREE.CylinderGeometry(0.06, 0.06, 1, 6, 1, true).rotateX(Math.PI / 2), []);
  const beamMats = useMemo(
    () => Array.from({ length: MAX_BEAMS }, () => new THREE.MeshBasicMaterial({ color: '#5ef2ff', transparent: true, depthWrite: false, toneMapped: false })),
    [],
  );
  useEffect(
    () => () => {
      pGeo.dispose();
      pMat.dispose();
      beamGeo.dispose();
      beamMats.forEach((m) => m.dispose());
      fx.clear();
    },
    [pGeo, pMat, beamGeo, beamMats],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const mesh = pRef.current;
    if (mesh) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.vel.y -= p.gravity * dt;
        p.pos.addScaledVector(p.vel, dt);
      }
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (p) {
          tmpObj.position.copy(p.pos);
          tmpObj.scale.setScalar(p.size * (p.life / p.max));
          tmpObj.updateMatrix();
          mesh.setMatrixAt(i, tmpObj.matrix);
          mesh.setColorAt(i, p.color);
        } else {
          tmpObj.scale.setScalar(0);
          tmpObj.updateMatrix();
          mesh.setMatrixAt(i, tmpObj.matrix);
        }
      }
      mesh.count = MAX_PARTICLES;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < MAX_BEAMS; i++) {
      const m = beamRefs.current[i];
      const b = beams[i];
      if (!m) continue;
      if (!b || b.life <= 0) {
        m.visible = false;
        continue;
      }
      b.life -= dt;
      m.visible = true;
      m.position.copy(b.a).lerp(b.b, 0.5);
      m.lookAt(b.b);
      m.scale.set(1, 1, b.a.distanceTo(b.b));
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.copy(b.color);
      mat.opacity = Math.max(0, b.life / 0.18);
    }
    for (let i = beams.length - 1; i >= 0; i--) if (beams[i].life <= 0) beams.splice(i, 1);

    // Floating text projection
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        t.el.remove();
        texts.splice(i, 1);
        continue;
      }
      const k = 1 - t.life / t.max;
      tmpV.copy(t.pos);
      tmpV.y += k * 1.4;
      tmpV.project(camera);
      if (tmpV.z > 1) {
        t.el.style.opacity = '0';
        continue;
      }
      const x = (tmpV.x * 0.5 + 0.5) * size.width;
      const y = (-tmpV.y * 0.5 + 0.5) * size.height;
      t.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${1 + (1 - k) * 0.25})`;
      t.el.style.opacity = `${Math.min(1, t.life / (t.max * 0.4))}`;
    }
  });

  return (
    <>
      <instancedMesh ref={pRef} args={[pGeo, pMat, MAX_PARTICLES]} frustumCulled={false} />
      {beamMats.map((m, i) => (
        <mesh
          key={i}
          ref={(el) => {
            beamRefs.current[i] = el;
          }}
          geometry={beamGeo}
          material={m}
          visible={false}
          frustumCulled={false}
        />
      ))}
    </>
  );
}
