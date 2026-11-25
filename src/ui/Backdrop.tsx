import { useEffect, useRef } from 'react';

/** Floating pixel embers + twinkling stars behind the whole UI. */
export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const W = 240;
    const H = 135;
    c.width = W;
    c.height = H;
    const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6 }));
    const embers = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 2 + Math.random() * 5, c: Math.random() < 0.5 ? '#9b6bff' : Math.random() < 0.5 ? '#ffcf4a' : '#4f8cff' }));
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        ctx.globalAlpha = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.5 + s.p));
        ctx.fillStyle = '#c9d1ff';
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      }
      for (const e of embers) {
        e.y -= e.v * dt;
        e.x += Math.sin(t + e.v) * 2 * dt;
        if (e.y < -2) {
          e.y = H + 2;
          e.x = Math.random() * W;
        }
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = e.c;
        ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="backdrop" aria-hidden>
      <canvas ref={ref} className="pixel" />
    </div>
  );
}
