import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { perf } from './GameLoop';

/** Writes a smoothed FPS value into a DOM element (no React re-render). */
export const fpsState = { fps: 0, el: null as HTMLElement | null };

export function FpsProbe() {
  const acc = useRef({ frames: 0, time: 0 });
  useFrame((_, dt) => {
    acc.current.frames++;
    acc.current.time += dt;
    if (acc.current.time >= 0.5) {
      fpsState.fps = Math.round(acc.current.frames / acc.current.time);
      acc.current.frames = 0;
      acc.current.time = 0;
      if (fpsState.el) fpsState.el.textContent = `${fpsState.fps} FPS · ${perf.calls} draw · ${perf.loopMs.toFixed(1)}ms`;
    }
  });
  return null;
}
