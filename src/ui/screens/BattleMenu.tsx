import { useEffect, useRef, useState } from 'react';
import { getMonster, MONSTERS } from '../../data/monsters';
import { RARITY_INFO } from '../../data/items';
import { LOCATIONS } from '../../data/world';
import type { LocationDef } from '../../data/world';
import { locationUnlocked, startFieldBattle } from '../../game/encounters';
import { deriveStats } from '../../game/progression';
import { seeded } from '../../game/rng';
import { act, useGame } from '../../store/store';
import { Btn, MonsterSprite, PixelIcon, Win } from '../components';
import { go, setUI } from '../uiStore';

const NODE_ICON: Record<string, [string, string]> = {
  town: ['home', '#ffd43b'],
  training: ['swords', '#e9c46a'],
  forest: ['star', '#69db7c'],
  dungeon: ['skull', '#e9ecef'],
  arena: ['crown', '#ff8787'],
  tower: ['tower', '#b197fc'],
};

function drawMap(c: HTMLCanvasElement) {
  const W = 320;
  const H = 180;
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const rng = seeded(77);
  ctx.fillStyle = '#0a2440';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = rng() < 0.5 ? '#0e2f52' : '#133a63';
    ctx.fillRect(Math.floor(rng() * W), Math.floor(rng() * H), 3, 1);
  }
  // land mass (blobby)
  const land = (cx: number, cy: number, rx: number, ry: number, col: string) => {
    ctx.fillStyle = col;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry)) + Math.sin(y * 0.7) * 3);
      ctx.fillRect(cx - w, cy + y, w * 2, 1);
    }
  };
  land(160, 96, 150, 78, '#c9b27a');
  land(160, 96, 146, 75, '#2f6b3a');
  land(110, 110, 90, 50, '#357a41');
  // sand (arena)
  land(258, 96, 40, 26, '#b9965c');
  // mountains (dungeon)
  for (let i = 0; i < 9; i++) {
    const mx = 170 + i * 13 + Math.floor(rng() * 6);
    const my = 128 + Math.floor(rng() * 14);
    for (let r = 0; r < 12; r++) {
      ctx.fillStyle = r < 3 ? '#e9ecef' : '#6c757d';
      ctx.fillRect(mx - r, my - 12 + r, r * 2 + 1, 1);
    }
  }
  // forest trees
  for (let i = 0; i < 70; i++) {
    const tx = 95 + Math.floor(rng() * 70);
    const ty = 68 + Math.floor(rng() * 40);
    ctx.fillStyle = '#1b4d2b';
    ctx.fillRect(tx - 2, ty - 3, 5, 4);
    ctx.fillStyle = '#2b8a3e';
    ctx.fillRect(tx - 1, ty - 4, 3, 2);
  }
  // tower
  ctx.fillStyle = '#2a2250';
  ctx.fillRect(180, 8, 12, 40);
  ctx.fillStyle = '#4c4288';
  ctx.fillRect(178, 46, 16, 4);
  for (let y = 12; y < 46; y += 6) {
    ctx.fillStyle = '#ffd43b';
    ctx.fillRect(185, y, 2, 2);
  }
  ctx.fillStyle = '#b197fc';
  ctx.fillRect(185, 2, 2, 6);
  // roads
  ctx.fillStyle = '#e9d8a6';
  const road = (a: [number, number], b: [number, number]) => {
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4);
    for (let i = 0; i <= steps; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / steps;
      const y = a[1] + ((b[1] - a[1]) * i) / steps;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  };
  const P = (id: string): [number, number] => {
    const l = LOCATIONS.find((x) => x.id === id)!;
    return [(l.map.x / 100) * W, (l.map.y / 100) * H];
  };
  road(P('town'), P('forest'));
  road(P('town'), P('training'));
  road(P('forest'), P('tower'));
  road(P('forest'), P('dungeon'));
  road(P('dungeon'), P('arena'));
  road(P('forest'), P('arena'));
  // clouds
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(Math.floor(rng() * W), Math.floor(rng() * 50), 30 + Math.floor(rng() * 30), 5);
  }
}

export function BattleMenu() {
  const s = useGame();
  const [tab, setTab] = useState<'map' | 'bestiary'>('map');
  const [sel, setSel] = useState<string>('forest');
  const [mon, setMon] = useState<string | null>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (tab === 'map' && ref.current) drawMap(ref.current);
  }, [tab]);
  const loc = LOCATIONS.find((l) => l.id === sel)!;
  const unlocked = locationUnlocked(s, sel);
  const d = deriveStats(s);

  const enter = (l: LocationDef) => {
    if (l.kind === 'tower') return go('tower');
    if (l.kind === 'town') return;
    const r = act((dd, c) => startFieldBattle(dd, c, l.id));
    if (r.ok) setUI({ battle: r.value });
  };

  const seenList = MONSTERS.filter((m) => m.family !== 'dummy');
  const seenCount = seenList.filter((m) => s.monsters[m.id]?.seen).length;

  return (
    <div className="battle-menu">
      <div className="tabs">
        <button className={`tab ${tab === 'map' ? 'on' : ''}`} onClick={() => setTab('map')}>
          WORLD MAP 월드맵
        </button>
        <button className={`tab ${tab === 'bestiary' ? 'on' : ''}`} onClick={() => setTab('bestiary')}>
          BESTIARY 몬스터 도감 {seenCount}/{seenList.length}
        </button>
      </div>
      {tab === 'map' && (
        <div className="map-layout">
          <Win className="map-win" color="gold">
            <div className="map-wrap">
              <canvas ref={ref} className="pixel map-canvas" />
              {LOCATIONS.map((l) => {
                const open = locationUnlocked(s, l.id);
                const [icon, tint] = NODE_ICON[l.id];
                return (
                  <button
                    key={l.id}
                    className={`map-node ${sel === l.id ? 'on' : ''} ${open ? '' : 'locked'}`}
                    style={{ left: l.map.x + '%', top: l.map.y + '%' }}
                    onClick={() => setSel(l.id)}
                    title={l.name}
                  >
                    <PixelIcon icon={open ? icon : 'lock'} tint={open ? tint : '#868e96'} size={26} />
                    <span className="map-label">{l.name}</span>
                  </button>
                );
              })}
            </div>
          </Win>
          <Win className="loc-panel" title={loc.nameEn} sub={loc.name} color={unlocked ? undefined : 'red'}>
            <p className="small">{loc.desc}</p>
            {loc.levelRange && (
              <div className="small muted">
                몬스터 레벨: {Math.max(loc.levelRange[0], Math.min(loc.levelRange[1], d.level - 3))}~{Math.max(loc.levelRange[0], Math.min(loc.levelRange[1], d.level - 1))}
              </div>
            )}
            {loc.kind === 'arena' && <div className="small muted">몬스터 레벨: {d.level + 1} (정예)</div>}
            {loc.pool && (
              <div className="loc-mons">
                {loc.pool.map((id) => (
                  <span key={id} className="loc-mon" title={s.monsters[id]?.seen ? getMonster(id).name : '???'}>
                    <MonsterSprite id={id} scale={2} silhouette={!s.monsters[id]?.seen} />
                  </span>
                ))}
              </div>
            )}
            <div className="row wrap" style={{ marginTop: 8 }}>
              <span className="chip">
                <PixelIcon icon="bolt" tint="#9be15d" size={14} /> 기력 {loc.stamina}
              </span>
              <span className="chip">
                보유 <b>{s.player.stamina}</b>
              </span>
            </div>
            {!unlocked && <div className="warn-line">{loc.unlock?.text}</div>}
            <div className="col" style={{ marginTop: 12 }}>
              {loc.kind === 'town' ? (
                <>
                  <Btn variant="gold" onClick={() => go('shop')}>
                    상점으로
                  </Btn>
                  <Btn variant="purple" onClick={() => go('gacha')}>
                    소환의 제단
                  </Btn>
                  <Btn variant="ghost" onClick={() => go('home')}>
                    여관 (홈)
                  </Btn>
                </>
              ) : (
                <Btn variant={loc.kind === 'tower' ? 'purple' : 'red'} size="lg" disabled={!unlocked || s.day.status === 'sleeping'} onClick={() => enter(loc)} sfx="confirm">
                  {loc.kind === 'tower' ? '탑으로 이동' : loc.kind === 'training' ? '훈련 시작' : '전투 시작!'}
                </Btn>
              )}
              {s.player.stamina < loc.stamina && loc.stamina > 0 && (
                <div className="tiny gold-t">
                  기력이 부족해요. 공부 10분마다 기력 1을 얻습니다.{' '}
                  <a href="#" onClick={(e) => (e.preventDefault(), go('study'))}>
                    공부하러 가기 →
                  </a>
                </div>
              )}
            </div>
          </Win>
        </div>
      )}
      {tab === 'bestiary' && (
        <div className="bestiary-layout">
          <Win className="bestiary-grid">
            {seenList.map((m) => {
              const rec = s.monsters[m.id];
              return (
                <button key={m.id} className={`best-cell ${mon === m.id ? 'on' : ''} ${rec?.seen ? '' : 'unseen'}`} onClick={() => setMon(m.id)}>
                  <MonsterSprite id={m.id} scale={3} silhouette={!rec?.seen} />
                  <span className="tiny">{rec?.seen ? m.name : '???'}</span>
                  {m.boss && <span className="tag" style={{ background: 'var(--red)', color: '#fff' }}>BOSS</span>}
                </button>
              );
            })}
          </Win>
          <Win className="best-detail" title="MONSTER" sub="상세">
            {mon ? (
              (() => {
                const m = getMonster(mon);
                const rec = s.monsters[mon];
                if (!rec?.seen) return <div className="empty-state">아직 만나지 못한 몬스터입니다.</div>;
                return (
                  <div className="col">
                    <div className="best-portrait">
                      <MonsterSprite id={mon} scale={7} />
                    </div>
                    <div className="big">{m.name}</div>
                    <div className="tiny muted">
                      {m.nameEn} · <span style={{ color: RARITY_INFO[m.rarity].color }}>{RARITY_INFO[m.rarity].en}</span>
                    </div>
                    <p className="small">{m.desc}</p>
                    <div className="kv">
                      <span>조우</span>
                      <span>{rec.seen}회</span>
                      <span>처치</span>
                      <span>{rec.defeated}회</span>
                      <span>최고 레벨</span>
                      <span>Lv {rec.maxLevel ?? '-'}</span>
                      <span>HP / ATK / DEF 계수</span>
                      <span>
                        ×{m.hp} / ×{m.atk} / ×{m.def}
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="empty-state">몬스터를 선택하세요.</div>
            )}
          </Win>
        </div>
      )}
    </div>
  );
}
