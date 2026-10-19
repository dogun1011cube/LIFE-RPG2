import * as THREE from 'three';

// Shared material palette. Materials are created once and reused by every mesh so the
// GPU state stays small; they live for the lifetime of the page (never disposed per mesh).

const std = (color: string, roughness = 0.6, metalness = 0.3, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const glow = (color: string, intensity = 2) =>
  new THREE.MeshStandardMaterial({ color: '#000000', emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0 });

export const MAT = {
  metalDark: std('#3a4350', 0.45, 0.7),
  metal: std('#5c6776', 0.4, 0.75),
  metalLight: std('#8a95a5', 0.35, 0.85),
  panel: std('#d7dde4', 0.5, 0.25),
  panelDark: std('#353d48', 0.55, 0.5),
  composite: std('#262d38', 0.7, 0.35),
  stone: std('#6c6a66', 0.92, 0.02),
  stoneDark: std('#46464a', 0.95, 0.02),
  concrete: std('#8b8f94', 0.88, 0.05),
  glass: new THREE.MeshStandardMaterial({ color: '#7fd8ff', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.35 }),
  gold: std('#d9a640', 0.3, 0.9),
  copper: std('#b06a3d', 0.35, 0.85),
  rubber: std('#151719', 0.9, 0),
  hazard: std('#e8b23a', 0.6, 0.2),
  glowCyan: glow('#4fe9ff', 2.4),
  glowCyanSoft: glow('#4fe9ff', 1),
  glowBlue: glow('#3d7bff', 2),
  glowGold: glow('#ffc65a', 2.2),
  glowRed: glow('#ff3b3b', 2.4),
  glowGreen: glow('#5cff9a', 2.2),
  glowPurple: glow('#b46bff', 2.4),
  glowMagenta: glow('#ff4fd1', 2.6),
  glowWhite: glow('#e8f6ff', 2.2),
  glowOff: std('#222831', 0.6, 0.2),
  hologram: new THREE.MeshBasicMaterial({ color: '#59e8ff', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
  hologramSolid: new THREE.MeshBasicMaterial({ color: '#7ff1ff', transparent: true, opacity: 0.7, depthWrite: false }),
  ghostValid: new THREE.MeshBasicMaterial({ color: '#4dffb0', transparent: true, opacity: 0.38, depthWrite: false }),
  ghostInvalid: new THREE.MeshBasicMaterial({ color: '#ff4a4a', transparent: true, opacity: 0.38, depthWrite: false }),
  bark: std('#4a3426', 0.95, 0),
  leaf: std('#2f6b3a', 0.85, 0, { flatShading: true }),
  leafLight: std('#4b8a3f', 0.85, 0, { flatShading: true }),
  crystalBlue: new THREE.MeshStandardMaterial({ color: '#7ec8ff', emissive: '#2b78c9', emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1, flatShading: true }),
  crystalPurple: new THREE.MeshStandardMaterial({ color: '#9c5cff', emissive: '#7a2be0', emissiveIntensity: 1.4, roughness: 0.15, metalness: 0.1, flatShading: true }),
  signBoard: std('#1d2430', 0.6, 0.4),
};

export type MatKey = keyof typeof MAT;

export const statusMaterial = (state: string) => {
  switch (state) {
    case 'operational':
      return MAT.glowCyan;
    case 'idle':
      return MAT.glowGold;
    case 'disabled':
      return MAT.glowOff;
    default:
      return MAT.glowRed;
  }
};
