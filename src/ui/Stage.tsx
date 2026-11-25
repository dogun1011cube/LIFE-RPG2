import { useEffect, useRef } from 'react';
import type { BgId } from '../data/world';
import { drawAmbient, getBackground, GROUND_Y, VH, VW } from '../render/backgrounds';
import { monsterCanvas, spriteCanvas } from '../render/draw';
import { getMonster } from '../data/monsters';

/** Small animated scene: background + hero (+ optional monster). */
export function Stage(props: { bg: BgId; heroPalette: Record<string, string>; aura?: string | null; monster?: string | null; className?: string; heroX?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const palKey = JSON.stringify(props.heroPalette);
  useEffect(() => {
    const c = ref.current!;
    c.width = VW;
    c.height = VH;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const hero = spriteCanvas('hero', props.heroPalette);
    const mon = props.monster ? monsterCanvas(props.monster) : null;
    const mdef = props.monster ? getMonster(props.monster) : null;
    const crown = spriteCanvas('crown');
    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, VW, VH);
      ctx.drawImage(getBackground(props.bg), 0, 0);
      drawAmbient(ctx, props.bg, t);
      const hx = props.heroX ?? 110;
      const hs = 3;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(hx - 14, GROUND_Y + 5, 28, 3);
      if (props.aura) {
        for (let i = 0; i < 10; i++) {
          const a = t * 1.6 + (i / 10) * Math.PI * 2;
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i);
          ctx.fillStyle = props.aura === 'rainbow' ? `hsl(${(t * 120 + i * 36) % 360} 90% 65%)` : props.aura;
          ctx.fillRect(Math.round(hx + Math.cos(a) * 20), Math.round(GROUND_Y - 18 + Math.sin(a) * 26), 2, 2);
        }
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(hero, hx - (hero.width * hs) / 2, GROUND_Y + 8 - hero.height * hs + Math.round(Math.sin(t * 3)), hero.width * hs, hero.height * hs);
      if (mon && mdef) {
        const ms = 3 * (mdef.scale ?? 1);
        const k = Math.sin(t * 4);
        const sy = mdef.family === 'slime' ? 1 + 0.06 * k : 1;
        const sx = mdef.family === 'slime' ? 1 - 0.045 * k : 1;
        const w = mon.width * ms * sx;
        const h = mon.height * ms * sy;
        const mx = 220;
        const my = GROUND_Y + 8 - h + (mdef.float ? Math.sin(t * 2) * 4 - 6 : 0);
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(mx - w * 0.35, GROUND_Y + 5, w * 0.7, 3);
        ctx.drawImage(mon, Math.round(mx - w / 2), Math.round(my), Math.round(w), Math.round(h));
        if (mdef.crown) {
          const cs = Math.round(ms * 0.75);
          ctx.drawImage(crown, Math.round(mx - (crown.width * cs) / 2), Math.round(my - crown.height * cs + ms * 2), crown.width * cs, crown.height * cs);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [props.bg, palKey, props.aura, props.monster, props.heroX]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className={`pixel stage ${props.className || ''}`} />;
}
