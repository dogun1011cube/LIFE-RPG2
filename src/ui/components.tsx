import React, { useEffect, useMemo, useRef, useState } from 'react';
import { playSfx } from '../audio/sfx';
import { getItem, RARITY_INFO } from '../data/items';
import { getMonster } from '../data/monsters';
import { monsterSkills } from '../data/monsterSkills';
import { affinityOf, ATK_INFO } from '../data/characters';
import { getRank } from '../data/ranks';
import type { GameState, ItemDef, RankId, SfxName } from '../game/types';
import { iconCanvas, monsterCanvas, spriteCanvas, toDataURL } from '../render/draw';
import { heroPalette, heroSprite } from './heroLook';

// ── Window ──────────────────────────────────────────────────
export function Win(props: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  color?: 'gold' | 'red' | 'purple';
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={props.id} className={`win ${props.color || ''} ${props.className || ''}`} style={props.style}>
      {props.title && (
        <div className="win-title">
          <span>{props.title}</span>
          {props.sub && <span className="sub">{props.sub}</span>}
          <span className="grow" />
          {props.right}
        </div>
      )}
      {props.children}
    </section>
  );
}

// ── Button ──────────────────────────────────────────────────
export function Btn(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'gold' | 'purple' | 'red' | 'green' | 'ghost';
    size?: 'sm' | 'lg';
    block?: boolean;
    sfx?: SfxName | null;
  },
) {
  const { variant, size, block, sfx = 'click', className, onClick, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`btn ${variant || ''} ${size || ''} ${block ? 'block' : ''} ${className || ''}`}
      onClick={(e) => {
        if (sfx) playSfx(sfx);
        onClick?.(e);
      }}
    />
  );
}

// ── Bar ─────────────────────────────────────────────────────
export function Bar(props: { kind: 'hp' | 'mp' | 'exp' | 'st' | 'boss' | 'plain'; value: number; max: number; label?: React.ReactNode; size?: 'thin' | 'tall'; className?: string }) {
  const pct = props.max > 0 ? Math.max(0, Math.min(100, (props.value / props.max) * 100)) : 0;
  return (
    <div className={`bar ${props.kind} ${props.size || ''} ${props.className || ''}`} role="progressbar" aria-valuenow={Math.round(props.value)} aria-valuemax={props.max}>
      <div className="ghost" style={{ width: pct + '%' }} />
      <div className="fill" style={{ width: pct + '%' }} />
      {props.label !== undefined && <div className="label">{props.label}</div>}
    </div>
  );
}

// ── Pixel icons ─────────────────────────────────────────────
export function PixelIcon(props: { icon: string; tint?: string; size?: number; className?: string; title?: string }) {
  const url = useMemo(() => toDataURL(iconCanvas(props.icon, props.tint || '#8d94c4'), 4), [props.icon, props.tint]);
  const s = props.size ?? 24;
  return <img className={`pixel ${props.className || ''}`} src={url} width={s} height={s} alt={props.title || ''} title={props.title} draggable={false} />;
}

export function ItemIcon(props: { item: ItemDef | string; size?: number }) {
  const def = typeof props.item === 'string' ? getItem(props.item) : props.item;
  return <PixelIcon icon={def.icon} tint={def.tint || RARITY_INFO[def.rarity].color} size={props.size ?? 36} title={def.name} />;
}

export function ItemSlot(props: {
  item: ItemDef | string;
  qty?: number;
  plus?: number;
  equipped?: boolean;
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
  /** Right-click handler (used to lock / unlock items). */
  onRightClick?: () => void;
  size?: number;
}) {
  const def = typeof props.item === 'string' ? getItem(props.item) : props.item;
  return (
    <div
      className={`slot rc-${def.rarity} ${props.selected ? 'sel' : ''} ${props.locked ? 'locked' : ''}`}
      onClick={() => {
        playSfx('select');
        props.onClick?.();
      }}
      onContextMenu={
        props.onRightClick
          ? (e) => {
              e.preventDefault();
              props.onRightClick!();
            }
          : undefined
      }
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') props.onClick?.();
      }}
      title={props.onRightClick ? `${def.name}${props.locked ? ' (잠김)' : ''} — 우클릭: ${props.locked ? '잠금 해제' : '잠금'}` : def.name}
      style={props.size ? { width: props.size, height: props.size } : undefined}
    >
      <ItemIcon item={def} />
      {props.locked ? <PixelIcon icon="lock" tint="#ffd43b" size={14} className="lock-badge" /> : null}
      {props.plus ? <span className="plus">+{props.plus}</span> : null}
      {props.qty && props.qty > 1 ? <span className="qty">×{props.qty}</span> : null}
      {props.equipped ? <span className="eq">E</span> : null}
    </div>
  );
}

export function RarityText(props: { rarity: ItemDef['rarity']; children?: React.ReactNode }) {
  return <span className={`r-${props.rarity}`}>{props.children ?? RARITY_INFO[props.rarity].ko}</span>;
}

// ── Sprites ─────────────────────────────────────────────────
export function MonsterSprite(props: { id: string; scale?: number; className?: string; silhouette?: boolean }) {
  const url = useMemo(() => toDataURL(monsterCanvas(props.id), props.scale ?? 4), [props.id, props.scale]);
  const def = getMonster(props.id);
  return (
    <span className={`mon-sprite ${def.float ? 'float' : ''} ${def.family === 'slime' ? 'slime' : ''} ${props.className || ''}`} style={props.silhouette ? { filter: 'brightness(0) opacity(.6)' } : undefined}>
      {def.crown && <img className="pixel crown" src={toDataURL(spriteCanvas('crown'), Math.max(2, Math.round((props.scale ?? 4) * 0.75)))} alt="" />}
      <img className="pixel" src={url} alt={def.name} draggable={false} />
    </span>
  );
}

export function HeroSprite(props: { state: GameState; scale?: number; className?: string }) {
  const pal = heroPalette(props.state);
  const key = JSON.stringify(pal);
  const sprite = heroSprite(props.state);
  const url = useMemo(() => toDataURL(spriteCanvas(sprite, pal), props.scale ?? 6), [key, sprite, props.scale]); // eslint-disable-line react-hooks/exhaustive-deps
  const auraId = props.state.player.cosmetics.aura;
  const aura = auraId ? getItem(auraId).cosmetic?.value : null;
  return (
    <span className={`hero-sprite ${props.className || ''} ${aura ? 'has-aura' : ''}`} style={aura ? ({ ['--aura' as string]: aura === 'rainbow' ? '#ff4d6d' : aura } as React.CSSProperties) : undefined}>
      {aura && <span className={`aura ${aura === 'rainbow' ? 'rainbow' : ''}`} />}
      <img className="pixel" src={url} alt="캐릭터" draggable={false} />
    </span>
  );
}

// ── Rank badge ──────────────────────────────────────────────
export function RankBadge(props: { rank: RankId; size?: 'lg' | 'xl' }) {
  const def = getRank(props.rank);
  return (
    <span className={`rank ${props.size || ''}`} style={{ ['--rc' as string]: def.color } as React.CSSProperties} title={`랭크 ${def.id} · ${def.title}`}>
      {def.id}
    </span>
  );
}

// ── Modal ───────────────────────────────────────────────────
export function Modal(props: { onClose?: () => void; children: React.ReactNode; wide?: boolean; color?: 'gold' | 'red' | 'purple'; title?: React.ReactNode; sub?: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.onClose]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && props.onClose?.()}>
      <Win className={`modal ${props.wide ? 'wide' : ''}`} color={props.color} title={props.title} sub={props.sub}>
        {props.children}
      </Win>
    </div>
  );
}

// ── Animated number ─────────────────────────────────────────
export function Ticker(props: { value: number; duration?: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(props.value);
  const fromRef = useRef(props.value);
  useEffect(() => {
    const from = fromRef.current;
    const to = props.value;
    if (from === to) return;
    const t0 = performance.now();
    const dur = props.duration ?? 600;
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = to;
    };
  }, [props.value, props.duration]);
  return <span className="num">{props.format ? props.format(shown) : shown.toLocaleString()}</span>;
}

export function StatLine(props: { icon: string; tint: string; label: string; value: React.ReactNode }) {
  return (
    <div className="stat-line">
      <PixelIcon icon={props.icon} tint={props.tint} size={16} />
      <span className="muted">{props.label}</span>
      <span className="grow" />
      <b className="num">{props.value}</b>
    </div>
  );
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

// ── Monster skill info (bestiary / tower) ───────────────────
export function MonsterSkillInfo(props: { id: string; compact?: boolean }) {
  const kit = monsterSkills(props.id);
  const aff = affinityOf(props.id);
  if (!kit) return null;
  return (
    <div className={`mskill-box ${props.compact ? 'compact' : ''}`}>
      {(aff.weak.length > 0 || aff.resist.length > 0 || aff.immune.length > 0) && (
        <div className="aff-row tiny">
          {aff.weak.map((t) => (
            <span key={'w' + t} className="aff weak" style={{ ['--tc' as string]: ATK_INFO[t].color } as React.CSSProperties}>
              약점 {ATK_INFO[t].ko}
            </span>
          ))}
          {aff.resist.map((t) => (
            <span key={'r' + t} className="aff resist">
              내성 {ATK_INFO[t].ko}
            </span>
          ))}
          {aff.immune.map((t) => (
            <span key={'i' + t} className="aff immune">
              면역 {ATK_INFO[t].ko}
            </span>
          ))}
        </div>
      )}
      <div className="mskill">
        <span className="tag" style={{ background: 'var(--cyan)' }}>고유</span> <b>{kit.sig.name}</b>
        {!props.compact && <div className="tiny muted">{kit.sig.desc}</div>}
      </div>
      <div className="mskill ult">
        <span className="tag" style={{ background: 'var(--red)', color: '#fff' }}>궁극기</span> <b>{kit.ult.name}</b>
        {!props.compact && (
          <div className="tiny muted">
            {kit.ult.desc} {kit.ult.charge ? '(한 턴 전에 예고 — 방어하세요)' : '(즉시 발동)'}
          </div>
        )}
      </div>
    </div>
  );
}
