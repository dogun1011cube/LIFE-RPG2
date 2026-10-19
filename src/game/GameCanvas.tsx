import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { GameLoop } from './GameLoop';
import { Environment } from './world/Environment';
import { BuildZoneMarker, OreVeins, Terrain } from './world/Terrain';
import { Vegetation } from './world/Vegetation';
import { Outpost } from './world/Outpost';
import { ResourceNodes } from './world/ResourceNodes';
import { OrionDrone, PlayerModel } from './entities/PlayerModel';
import { Enemies } from './entities/Enemies';
import { BuildPreview, Buildings } from './building/Buildings';
import { Effects } from './fx/Effects';
import { useUi } from '../state/uiStore';
import { FpsProbe } from './FpsProbe';

function Scene() {
  const phase = useUi((s) => s.phase);
  return (
    <>
      <GameLoop />
      <Environment />
      <Terrain />
      <OreVeins />
      <BuildZoneMarker />
      <Vegetation />
      <Outpost />
      <ResourceNodes />
      <Buildings />
      <Enemies />
      {phase === 'playing' && (
        <>
          <PlayerModel />
          <OrionDrone />
          <BuildPreview />
        </>
      )}
      <Effects />
      <FpsProbe />
    </>
  );
}

export function GameCanvas() {
  return (
    <Canvas
      className="game-canvas"
      shadows="percentage"
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 62, near: 0.1, far: 1200, position: [40, 20, 40] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
